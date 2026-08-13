package com.selfintro.identity;

import com.selfintro.modules.identity.application.WorkspacePurgeService;
import com.selfintro.modules.identity.application.WorkspaceRestoreReconciliationService;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/** One-shot startup guard for a maintenance-only restore environment. */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression(
        "'${app.runtime-role:api}' == 'worker' and '${app.workspace-purge.restore-reconciliation-enabled:false}' == 'true'")
public class WorkspaceRestoreReconciliationRunner implements ApplicationRunner {

    private static final Set<String> EXPECTED_DISABLED_BLOCKERS =
            Set.of(
                    "OBJECT_STORAGE_DELETE_NOT_ENABLED",
                    "VECTOR_DELETE_NOT_ENABLED",
                    "CACHE_DELETE_NOT_ENABLED",
                    "MYSQL_DELETE_NOT_ENABLED");

    private final WorkspaceRestoreReconciliationService reconciliationService;
    private final WorkspacePurgeService purgeService;

    @Value("${app.maintenance-mode:false}")
    private boolean maintenanceMode;

    @Value("${app.workspace-purge.execution-enabled:false}")
    private boolean purgeExecutionEnabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!maintenanceMode) {
            throw new IllegalStateException(
                    "Restore reconciliation requires explicit maintenance mode.");
        }
        if (purgeExecutionEnabled) {
            throw new IllegalStateException(
                    "Purge execution must remain disabled during restore reconciliation.");
        }

        WorkspaceRestoreReconciliationService.ReconciliationReport report =
                reconciliationService.reconcileControlPlane(LocalDateTime.now());
        if (!report.blockerCodes().isEmpty()) {
            throw new IllegalStateException(
                    "Restore reconciliation control-plane blockers: "
                            + String.join(",", report.blockerCodes()));
        }

        Set<String> inventoryBlockers = new LinkedHashSet<>();
        for (Long jobId : report.inspectionJobIds()) {
            WorkspacePurgeService.PurgeJobView view = purgeService.dryRun(jobId);
            view.checkpoints().stream()
                    .filter(checkpoint -> "BLOCKED".equals(checkpoint.status()))
                    .map(WorkspacePurgeService.CheckpointView::blockerCode)
                    .filter(code -> code != null && !EXPECTED_DISABLED_BLOCKERS.contains(code))
                    .forEach(inventoryBlockers::add);
        }
        if (!inventoryBlockers.isEmpty()) {
            throw new IllegalStateException(
                    "Restore reconciliation inventory blockers: "
                            + String.join(",", inventoryBlockers));
        }

        log.info(
                "Workspace restore reconciliation completed: scheduledJobs={}, suspendedMemberships={}, revokedInvitations={}, interruptedLeases={}, inspectedJobs={}",
                report.scheduledJobs(),
                report.suspendedMemberships(),
                report.revokedInvitations(),
                report.interruptedLeases(),
                report.inspectionJobIds().size());
    }
}
