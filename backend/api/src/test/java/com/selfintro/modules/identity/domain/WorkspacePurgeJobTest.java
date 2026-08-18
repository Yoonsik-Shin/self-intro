package com.selfintro.modules.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class WorkspacePurgeJobTest {

    @Test
    void inspectionBecomesReadyOnlyAfterGraceAndClaimCanRecoverStaleLease() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 11, 10, 0);
        Workspace workspace = Workspace.createPrivatePersonal("test");
        ReflectionTestUtils.setField(workspace, "id", 42L);
        workspace.close(7L, now.minusDays(31), now.minusDays(1));
        WorkspacePurgeJob job = WorkspacePurgeJob.schedule(workspace, 7L, now.minusDays(31));

        job.inspected(now, 0);
        assertThat(job.getStatus()).isEqualTo(WorkspacePurgeJobStatus.READY);
        assertThat(job.claim(now, now.minusMinutes(30))).isTrue();
        assertThat(job.getAttemptCount()).isEqualTo(1);

        ReflectionTestUtils.setField(job, "updatedAt", now.minusHours(1));
        assertThat(job.claim(now, now.minusMinutes(30))).isTrue();
        assertThat(job.getAttemptCount()).isEqualTo(2);
    }

    @Test
    void inspectionKeepsJobPendingUntilGraceElapses() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 11, 10, 0);
        Workspace workspace = Workspace.createPrivatePersonal("test");
        ReflectionTestUtils.setField(workspace, "id", 42L);
        workspace.close(7L, now, now.plusDays(30));
        WorkspacePurgeJob job = WorkspacePurgeJob.schedule(workspace, 7L, now);

        job.inspected(now, 0);

        assertThat(job.getStatus()).isEqualTo(WorkspacePurgeJobStatus.PENDING_GRACE);
        assertThat(job.claim(now, now.minusMinutes(30))).isFalse();
    }
}
