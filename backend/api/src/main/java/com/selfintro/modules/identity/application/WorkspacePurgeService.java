package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpoint;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointStatus;
import com.selfintro.modules.identity.domain.WorkspacePurgeJob;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeStore;
import com.selfintro.modules.storage.application.ObjectStoragePort;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspacePurgeService {

    private final WorkspacePurgeJobRepository jobRepository;
    private final WorkspacePurgeCheckpointRepository checkpointRepository;
    private final ObjectStoragePort objectStoragePort;
    private final WorkspaceVectorStoragePort vectorStoragePort;
    private final WorkspaceCacheStoragePort cacheStoragePort;
    private final WorkspaceNoSqlStoragePort noSqlStoragePort;
    private final WorkspaceRelationalStoragePort relationalStoragePort;

    @Value("${app.workspace-purge.object-storage-delete-enabled:false}")
    private boolean objectStorageDeleteEnabled;

    @Value("${app.workspace-purge.vector-delete-enabled:false}")
    private boolean vectorDeleteEnabled;

    @Value("${app.workspace-purge.cache-delete-enabled:false}")
    private boolean cacheDeleteEnabled;

    @Value("${app.workspace-purge.mysql-delete-enabled:false}")
    private boolean mysqlDeleteEnabled;

    @Transactional
    public WorkspacePurgeJob schedule(
            Workspace workspace, Long requestedByUserId, LocalDateTime now) {
        WorkspacePurgeJob job =
                jobRepository
                        .findByWorkspaceId(workspace.getId())
                        .orElseGet(
                                () ->
                                        jobRepository.save(
                                                WorkspacePurgeJob.schedule(
                                                        workspace, requestedByUserId, now)));
        ensureCheckpoints(job.getId(), now);
        return job;
    }

    @Transactional(readOnly = true)
    public List<PurgeJobView> list() {
        return jobRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toView).toList();
    }

    @Transactional
    public PurgeJobView dryRun(Long jobId) {
        WorkspacePurgeJob job =
                jobRepository
                        .findByIdForUpdate(jobId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "purge 작업을 찾을 수 없습니다."));
        switch (job.getStatus()) {
            case PURGING ->
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT, "purge 실행 중에는 inventory를 갱신할 수 없습니다.");
            case COMPLETED, CANCELLED ->
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT, "종료된 purge 작업은 다시 검사할 수 없습니다.");
            default -> {
                // Inventory inspection is allowed for non-terminal, non-running jobs.
            }
        }
        LocalDateTime now = LocalDateTime.now();
        ensureCheckpoints(job.getId(), now);
        inspectMysql(job, now);
        inspectObjectStorage(job, now);
        inspectOracleVector(job, now);
        inspectRedisCache(job, now);
        inspectOracleNoSql(job, now);

        List<WorkspacePurgeCheckpoint> checkpoints =
                checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(job.getId());
        int blockers =
                (int)
                        checkpoints.stream()
                                .filter(
                                        checkpoint ->
                                                checkpoint.getStatus()
                                                        == WorkspacePurgeCheckpointStatus.BLOCKED)
                                .count();
        job.inspected(now, blockers);
        return toView(job, checkpoints);
    }

    private void inspectMysql(WorkspacePurgeJob job, LocalDateTime now) {
        WorkspacePurgeCheckpoint checkpoint =
                checkpoint(job.getId(), WorkspacePurgeStore.MYSQL_PRIMARY);
        if (isCompleted(checkpoint)) return;
        try {
            WorkspaceRelationalStoragePort.WorkspaceRelationalInventory inventory =
                    relationalStoragePort.inspect(job.getWorkspaceId(), now);
            if (!inventory.schemaVerified()) {
                checkpoint.blocked(
                        inventory.totalRowsRequiringHandling(),
                        "MYSQL_SCHEMA_INVENTORY_DRIFT",
                        "분류되지 않은 테이블 "
                                + inventory.unknownWorkspaceTables().size()
                                + "개, 누락 테이블 "
                                + inventory.missingWorkspaceTables().size()
                                + "개, FK drift "
                                + inventory.foreignKeyDrift().size()
                                + "개; 이름 원문은 checkpoint에 저장하지 않음",
                        now);
                return;
            }
            String summary =
                    "CASCADE 대상 "
                            + inventory.cascadeRowCount()
                            + "행, 선삭제 초대 "
                            + inventory.invitationRowCount()
                            + "행, 가명화 감사 "
                            + inventory.auditRowCount()
                            + "행, 보존 purge 제어 "
                            + inventory.purgeControlRowCount()
                            + "행; schema/FK 순서 검증 완료";
            if (mysqlDeleteEnabled) {
                checkpoint.ready(inventory.totalRowsRequiringHandling(), summary, now);
            } else {
                checkpoint.blocked(
                        inventory.totalRowsRequiringHandling(),
                        "MYSQL_DELETE_NOT_ENABLED",
                        summary + "; 삭제 flag 비활성",
                        now);
            }
        } catch (RuntimeException exception) {
            checkpoint.blocked(
                    0,
                    "MYSQL_INVENTORY_FAILED",
                    "MySQL Workspace inventory 실패; SQL/provider 오류 원문은 저장하지 않음",
                    now);
        }
    }

    private void inspectOracleNoSql(WorkspacePurgeJob job, LocalDateTime now) {
        WorkspacePurgeCheckpoint checkpoint =
                checkpoint(job.getId(), WorkspacePurgeStore.ORACLE_NOSQL);
        if (isCompleted(checkpoint)) return;
        try {
            WorkspaceNoSqlStoragePort.NoSqlCatalogInventory inventory =
                    noSqlStoragePort.inspectCatalogBoundary();
            if (inventory.isSafeToExcludeFromWorkspacePurge()) {
                checkpoint.ready(
                        0,
                        inventory.catalogTable()
                                + " 공통 채용공고 catalog "
                                + inventory.catalogRowCount()
                                + "행; Workspace/사용자/매칭 필드 없음; 삭제 대상 제외",
                        now);
                return;
            }
            checkpoint.blocked(
                    inventory.legacyPersonalizedRowCount(),
                    inventory.legacyPersonalizedRowCount() > 0
                            ? "NOSQL_LEGACY_PERSONALIZATION_PRESENT"
                            : "NOSQL_CATALOG_SCHEMA_DRIFT",
                    "NoSQL catalog 경계 불일치; 레거시 개인화 가능 행 "
                            + inventory.legacyPersonalizedRowCount()
                            + "개; 필드명·데이터 원문은 저장하지 않음",
                    now);
        } catch (RuntimeException exception) {
            checkpoint.blocked(
                    0,
                    "NOSQL_CATALOG_INVENTORY_FAILED",
                    "Oracle NoSQL catalog inventory 실패; schema/provider 오류 원문은 저장하지 않음",
                    now);
        }
    }

    private void inspectRedisCache(WorkspacePurgeJob job, LocalDateTime now) {
        WorkspacePurgeCheckpoint checkpoint =
                checkpoint(job.getId(), WorkspacePurgeStore.REDIS_CACHE);
        if (isCompleted(checkpoint)) return;
        try {
            WorkspaceCacheStoragePort.WorkspaceCacheInventory inventory =
                    cacheStoragePort.inspect(job.getWorkspaceId());
            String summary =
                    "Workspace key "
                            + inventory.workspaceScopedKeyCount()
                            + "개, 레거시 공유 namespace key "
                            + inventory.legacySharedNamespaceKeyCount()
                            + "개; SCAN/UNLINK adapter 검증 완료";
            if (cacheDeleteEnabled) {
                checkpoint.ready(inventory.totalCandidateCount(), summary, now);
            } else {
                checkpoint.blocked(
                        inventory.totalCandidateCount(),
                        "CACHE_DELETE_NOT_ENABLED",
                        summary + "; 삭제 flag 비활성",
                        now);
            }
        } catch (RuntimeException exception) {
            checkpoint.blocked(
                    0,
                    "CACHE_INVENTORY_FAILED",
                    "Redis cache inventory 실패; key/provider 오류 원문은 저장하지 않음",
                    now);
        }
    }

    private void inspectOracleVector(WorkspacePurgeJob job, LocalDateTime now) {
        WorkspacePurgeCheckpoint checkpoint =
                checkpoint(job.getId(), WorkspacePurgeStore.ORACLE_VECTOR);
        if (isCompleted(checkpoint)) return;
        try {
            WorkspaceVectorStoragePort.WorkspaceVectorInventory inventory =
                    vectorStoragePort.inspect(job.getWorkspaceId());
            String summary =
                    "경험 vector "
                            + inventory.experienceVectorCount()
                            + "개, 학습 vector "
                            + inventory.studyVectorCount()
                            + "개; 공용 채용공고 vector는 제외; Worker 내부 adapter 검증 완료";
            if (vectorDeleteEnabled) {
                checkpoint.ready(inventory.totalCandidateCount(), summary, now);
            } else {
                checkpoint.blocked(
                        inventory.totalCandidateCount(),
                        "VECTOR_DELETE_NOT_ENABLED",
                        summary + "; 삭제 flag 비활성",
                        now);
            }
        } catch (RuntimeException exception) {
            checkpoint.blocked(
                    0,
                    "VECTOR_INVENTORY_FAILED",
                    "AI Worker Oracle Vector inventory 실패; JDBC/gRPC 오류 원문은 저장하지 않음",
                    now);
        }
    }

    private void inspectObjectStorage(WorkspacePurgeJob job, LocalDateTime now) {
        WorkspacePurgeCheckpoint checkpoint =
                checkpoint(job.getId(), WorkspacePurgeStore.OBJECT_STORAGE);
        if (isCompleted(checkpoint)) return;
        String prefix = "workspaces/" + job.getWorkspaceId() + "/";
        try {
            ObjectStoragePort.PrefixInventory inventory = objectStoragePort.inspectPrefix(prefix);
            String summary =
                    "공개 "
                            + inventory.publicObjectCount()
                            + "개, 비공개 "
                            + inventory.privateObjectCount()
                            + "개, 현재 object bytes "
                            + inventory.totalBytes()
                            + ", 이전 version "
                            + inventory.nonCurrentVersionCount()
                            + "개/"
                            + inventory.nonCurrentVersionBytes()
                            + " bytes, delete marker "
                            + inventory.deleteMarkerCount()
                            + "개, 미완료 multipart "
                            + inventory.incompleteMultipartUploadCount()
                            + "개; version-aware batch delete 검증 완료";
            if (objectStorageDeleteEnabled) {
                checkpoint.ready(inventory.totalPurgeCandidateCount(), summary, now);
            } else {
                checkpoint.blocked(
                        inventory.totalPurgeCandidateCount(),
                        "OBJECT_STORAGE_DELETE_NOT_ENABLED",
                        summary + "; 삭제 flag 비활성",
                        now);
            }
        } catch (RuntimeException exception) {
            checkpoint.blocked(
                    0,
                    "OBJECT_STORAGE_INVENTORY_FAILED",
                    "두 버킷 prefix inventory 실패; key·provider 오류 원문은 저장하지 않음",
                    now);
        }
    }

    private void ensureCheckpoints(Long jobId, LocalDateTime now) {
        Set<WorkspacePurgeStore> existing =
                checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(jobId).stream()
                        .map(WorkspacePurgeCheckpoint::getStoreType)
                        .collect(Collectors.toSet());
        for (WorkspacePurgeStore store : WorkspacePurgeStore.values()) {
            if (!existing.contains(store)) {
                checkpointRepository.save(WorkspacePurgeCheckpoint.pending(jobId, store, now));
            }
        }
    }

    private WorkspacePurgeCheckpoint checkpoint(Long jobId, WorkspacePurgeStore store) {
        return checkpointRepository
                .findByPurgeJobIdAndStoreType(jobId, store)
                .orElseThrow(() -> new IllegalStateException("purge 체크포인트 초기화에 실패했습니다."));
    }

    private boolean isCompleted(WorkspacePurgeCheckpoint checkpoint) {
        return checkpoint.getStatus() == WorkspacePurgeCheckpointStatus.COMPLETED;
    }

    private PurgeJobView toView(WorkspacePurgeJob job) {
        return toView(
                job, checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(job.getId()));
    }

    private PurgeJobView toView(WorkspacePurgeJob job, List<WorkspacePurgeCheckpoint> checkpoints) {
        return new PurgeJobView(
                job.getId(),
                job.getWorkspaceId(),
                job.getWorkspacePublicKey(),
                job.getStatus().name(),
                job.getEligibleAt(),
                job.getLastInspectedAt(),
                job.getBlockerCount(),
                job.getInventoryVersion(),
                checkpoints.stream().map(CheckpointView::from).toList());
    }

    public record PurgeJobView(
            Long id,
            Long workspaceId,
            UUID workspacePublicKey,
            String status,
            LocalDateTime eligibleAt,
            LocalDateTime lastInspectedAt,
            int blockerCount,
            String inventoryVersion,
            List<CheckpointView> checkpoints) {}

    public record CheckpointView(
            String store,
            String status,
            long candidateCount,
            String blockerCode,
            String summary,
            LocalDateTime lastInspectedAt) {
        static CheckpointView from(WorkspacePurgeCheckpoint checkpoint) {
            return new CheckpointView(
                    checkpoint.getStoreType().name(),
                    checkpoint.getStatus().name(),
                    checkpoint.getCandidateCount(),
                    checkpoint.getBlockerCode(),
                    checkpoint.getInspectionSummary(),
                    checkpoint.getLastInspectedAt());
        }
    }
}
