package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpoint;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointStatus;
import com.selfintro.modules.identity.domain.WorkspacePurgeJob;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeStore;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspacePurgeExecutionStateServiceTest {

    @Mock private WorkspacePurgeJobRepository jobRepository;
    @Mock private WorkspacePurgeCheckpointRepository checkpointRepository;

    private WorkspacePurgeExecutionStateService service;
    private WorkspacePurgeJob job;
    private List<WorkspacePurgeCheckpoint> checkpoints;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service = new WorkspacePurgeExecutionStateService(jobRepository, checkpointRepository);
        now = LocalDateTime.of(2026, 8, 11, 10, 0);
        Workspace workspace = Workspace.createPrivatePersonal("test");
        ReflectionTestUtils.setField(workspace, "id", 42L);
        workspace.close(7L, now.minusDays(31), now.minusDays(1));
        job = WorkspacePurgeJob.schedule(workspace, 7L, now.minusDays(31));
        ReflectionTestUtils.setField(job, "id", 9L);
        job.inspected(now, 0);

        checkpoints = new ArrayList<>();
        for (WorkspacePurgeStore store : WorkspacePurgeStore.values()) {
            WorkspacePurgeCheckpoint checkpoint =
                    WorkspacePurgeCheckpoint.pending(9L, store, now.minusDays(1));
            checkpoint.ready(0, "ready", now.minusDays(1));
            checkpoints.add(checkpoint);
        }
        when(jobRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(job));
        when(checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(9L))
                .thenReturn(checkpoints);
    }

    @Test
    void staleReclaimFencesLateCheckpointCommitFromPreviousWorker() {
        WorkspacePurgeExecutionStateService.ClaimedPurgeJob first =
                service.claim(9L, now, now.minusMinutes(30));
        ReflectionTestUtils.setField(job, "updatedAt", now.minusHours(3));
        WorkspacePurgeExecutionStateService.ClaimedPurgeJob second =
                service.claim(9L, now, now.minusHours(2));

        assertThat(first.leaseVersion()).isEqualTo(1);
        assertThat(second.leaseVersion()).isEqualTo(2);
        assertThatThrownBy(
                        () ->
                                service.markCheckpointCompleted(
                                        9L,
                                        first.leaseVersion(),
                                        WorkspacePurgeStore.OBJECT_STORAGE,
                                        "late",
                                        now))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("lease");
        assertThat(checkpoint(WorkspacePurgeStore.OBJECT_STORAGE).getStatus())
                .isEqualTo(WorkspacePurgeCheckpointStatus.READY);
    }

    private WorkspacePurgeCheckpoint checkpoint(WorkspacePurgeStore store) {
        return checkpoints.stream()
                .filter(candidate -> candidate.getStoreType() == store)
                .findFirst()
                .orElseThrow();
    }
}
