package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.application.WorkspacePurgeExecutionStateService.ClaimedPurgeJob;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointStatus;
import com.selfintro.modules.identity.domain.WorkspacePurgeStore;
import com.selfintro.modules.storage.application.ObjectStoragePort;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Executes only a previously inspected and atomically claimed purge job. */
@Service
@RequiredArgsConstructor
public class WorkspacePurgeExecutor {

    private static final List<WorkspacePurgeStore> EXECUTION_ORDER =
            List.of(
                    WorkspacePurgeStore.ORACLE_NOSQL,
                    WorkspacePurgeStore.OBJECT_STORAGE,
                    WorkspacePurgeStore.ORACLE_VECTOR,
                    WorkspacePurgeStore.REDIS_CACHE,
                    WorkspacePurgeStore.MYSQL_PRIMARY);

    private final WorkspacePurgeExecutionStateService stateService;
    private final ObjectStoragePort objectStoragePort;
    private final WorkspaceVectorStoragePort vectorStoragePort;
    private final WorkspaceCacheStoragePort cacheStoragePort;
    private final WorkspaceNoSqlStoragePort noSqlStoragePort;
    private final WorkspaceRelationalStoragePort relationalStoragePort;

    public boolean execute(Long jobId, LocalDateTime now, LocalDateTime staleBefore) {
        ClaimedPurgeJob job = stateService.claim(jobId, now, staleBefore);
        if (job == null) return false;
        if (!relationalPreflight(job, now)) return false;

        for (WorkspacePurgeStore store : EXECUTION_ORDER) {
            WorkspacePurgeCheckpointStatus status = job.checkpointStatuses().get(store);
            if (status == WorkspacePurgeCheckpointStatus.COMPLETED) continue;
            if (status != WorkspacePurgeCheckpointStatus.READY
                    && status != WorkspacePurgeCheckpointStatus.FAILED) {
                stateService.markCheckpointFailed(
                        job.jobId(),
                        job.leaseVersion(),
                        store,
                        "PURGE_CHECKPOINT_NOT_EXECUTABLE",
                        "Checkpoint was not READY when execution started.",
                        LocalDateTime.now());
                return false;
            }
            try {
                stateService.renewLease(job.jobId(), job.leaseVersion(), LocalDateTime.now());
                String summary = purgeStore(store, job.workspaceId(), now);
                stateService.markCheckpointCompleted(
                        job.jobId(), job.leaseVersion(), store, summary, LocalDateTime.now());
            } catch (RuntimeException exception) {
                stateService.markCheckpointFailed(
                        job.jobId(),
                        job.leaseVersion(),
                        store,
                        "PURGE_" + store.name() + "_FAILED",
                        "Provider deletion failed; provider error details were not persisted.",
                        LocalDateTime.now());
                return false;
            }
        }
        stateService.markCompleted(job.jobId(), job.leaseVersion(), LocalDateTime.now());
        return true;
    }

    private boolean relationalPreflight(ClaimedPurgeJob job, LocalDateTime now) {
        try {
            WorkspaceRelationalStoragePort.WorkspaceRelationalInventory inventory =
                    relationalStoragePort.inspect(job.workspaceId(), now);
            boolean workspaceStateIsSafe =
                    !inventory.workspaceExists()
                            || (inventory.closedWorkspace() && inventory.graceElapsed());
            if (inventory.schemaVerified() && workspaceStateIsSafe) return true;
        } catch (RuntimeException exception) {
            // Persist only a stable error code below.
        }
        stateService.markCheckpointFailed(
                job.jobId(),
                job.leaseVersion(),
                WorkspacePurgeStore.MYSQL_PRIMARY,
                "PURGE_MYSQL_PREFLIGHT_FAILED",
                "Relational schema or Workspace lifecycle preflight failed.",
                LocalDateTime.now());
        return false;
    }

    private String purgeStore(WorkspacePurgeStore store, Long workspaceId, LocalDateTime now) {
        return switch (store) {
            case ORACLE_NOSQL -> {
                WorkspaceNoSqlStoragePort.NoSqlCatalogInventory inventory =
                        noSqlStoragePort.inspectCatalogBoundary();
                if (!inventory.isSafeToExcludeFromWorkspacePurge()) {
                    throw new IllegalStateException("NoSQL catalog boundary is no longer safe.");
                }
                yield "Shared catalog boundary verified; no Workspace-owned rows were deleted.";
            }
            case OBJECT_STORAGE -> {
                ObjectStoragePort.PrefixPurgeResult result =
                        objectStoragePort.purgePrefix("workspaces/" + workspaceId + "/");
                yield "Object storage purge completed: "
                        + result.totalDeletedCandidateCount()
                        + " candidates handled.";
            }
            case ORACLE_VECTOR -> {
                WorkspaceVectorStoragePort.WorkspaceVectorPurgeResult result =
                        vectorStoragePort.purge(workspaceId);
                yield "Workspace vector purge completed: "
                        + result.totalDeletedCount()
                        + " rows handled.";
            }
            case REDIS_CACHE -> {
                WorkspaceCacheStoragePort.WorkspaceCachePurgeResult result =
                        cacheStoragePort.purge(workspaceId);
                yield "Workspace cache purge completed: "
                        + result.evictedKeyCount()
                        + " keys handled.";
            }
            case MYSQL_PRIMARY -> {
                WorkspaceRelationalStoragePort.WorkspaceRelationalPurgeResult result =
                        relationalStoragePort.purge(workspaceId, now);
                yield "Relational purge completed: "
                        + result.deletedWorkspaceRows()
                        + " Workspace rows deleted; purge control retained.";
            }
        };
    }
}
