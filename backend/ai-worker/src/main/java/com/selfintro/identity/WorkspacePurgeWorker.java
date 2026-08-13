package com.selfintro.identity;

import com.selfintro.modules.identity.application.WorkspacePurgeExecutionStateService;
import com.selfintro.modules.identity.application.WorkspacePurgeExecutor;
import com.selfintro.modules.identity.application.WorkspacePurgeService;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Worker-only entry point. There is deliberately no destructive API controller. */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression(
        "'${app.runtime-role:api}' == 'worker' and '${app.workspace-purge.execution-enabled:false}' == 'true'")
public class WorkspacePurgeWorker {

    private final WorkspacePurgeService inspectionService;
    private final WorkspacePurgeExecutionStateService stateService;
    private final WorkspacePurgeExecutor executor;

    @Value("${app.workspace-purge.lease-timeout:2h}")
    private Duration leaseTimeout;

    @Value("${app.workspace-purge.batch-size:10}")
    private int batchSize;

    @Scheduled(
            cron = "${app.workspace-purge.execution-cron:0 */10 * * * *}",
            zone = "${app.workspace-purge.time-zone:Asia/Seoul}")
    public void runOnce() {
        LocalDateTime now = LocalDateTime.now();
        int limit = Math.max(1, Math.min(batchSize, 100));

        for (Long jobId : stateService.findInspectionCandidateIds(now, limit)) {
            try {
                inspectionService.dryRun(jobId);
            } catch (RuntimeException exception) {
                log.warn("Workspace purge inventory failed: jobId={}", jobId);
            }
        }

        LocalDateTime staleBefore = now.minus(leaseTimeout);
        for (Long jobId : stateService.findExecutionCandidateIds(now, staleBefore, limit)) {
            try {
                executor.execute(jobId, now, staleBefore);
            } catch (RuntimeException exception) {
                log.error("Workspace purge orchestration failed: jobId={}", jobId);
            }
        }
    }
}
