package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitation;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpoint;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeJob;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus;
import com.selfintro.modules.identity.domain.WorkspacePurgeStore;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspaceRestoreReconciliationServiceTest {

    @Mock private WorkspaceRepository workspaceRepository;
    @Mock private WorkspaceMemberRepository memberRepository;
    @Mock private WorkspaceMembershipInvitationRepository invitationRepository;
    @Mock private WorkspacePurgeJobRepository jobRepository;
    @Mock private WorkspacePurgeCheckpointRepository checkpointRepository;
    @Mock private WorkspacePurgeService purgeService;

    private WorkspaceRestoreReconciliationService service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service =
                new WorkspaceRestoreReconciliationService(
                        workspaceRepository,
                        memberRepository,
                        invitationRepository,
                        jobRepository,
                        checkpointRepository,
                        purgeService);
        now = LocalDateTime.of(2026, 8, 11, 15, 0);
    }

    @Test
    void repairsMissingControlPlaneAndRevokesRestoredAccess() {
        Workspace workspace = deletedWorkspace(42L);
        WorkspacePurgeJob scheduled = WorkspacePurgeJob.schedule(workspace, 7L, now);
        ReflectionTestUtils.setField(scheduled, "id", 9L);
        WorkspaceMember member = mock(WorkspaceMember.class);
        WorkspaceMembershipInvitation invitation = mock(WorkspaceMembershipInvitation.class);

        when(workspaceRepository.findAll()).thenReturn(List.of(workspace));
        when(workspaceRepository.findAllByStatus(WorkspaceStatus.DELETED))
                .thenReturn(List.of(workspace));
        when(jobRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(memberRepository.findAllByWorkspaceIdAndStatusOrderByJoinedAtAsc(
                        42L, MembershipStatus.ACTIVE))
                .thenReturn(List.of(member));
        when(invitationRepository.findAllByWorkspaceIdOrderByCreatedAtDesc(42L))
                .thenReturn(List.of(invitation));
        when(invitation.isUsable(now)).thenReturn(true);
        when(purgeService.schedule(workspace, 7L, now)).thenReturn(scheduled);
        when(checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(9L))
                .thenReturn(checkpoints(9L));

        WorkspaceRestoreReconciliationService.ReconciliationReport report =
                service.reconcileControlPlane(now);

        assertThat(report.scheduledJobs()).isEqualTo(1);
        assertThat(report.suspendedMemberships()).isEqualTo(1);
        assertThat(report.revokedInvitations()).isEqualTo(1);
        assertThat(report.inspectionJobIds()).containsExactly(9L);
        assertThat(report.blockerCodes()).isEmpty();
        verify(member).suspend();
        verify(invitation).revoke(now);
    }

    @Test
    void blocksWhenActiveWorkspaceHasPurgeJob() {
        Workspace active = Workspace.createPrivatePersonal("active");
        ReflectionTestUtils.setField(active, "id", 42L);
        Workspace deleted = deletedWorkspace(42L);
        WorkspacePurgeJob job = WorkspacePurgeJob.schedule(deleted, 7L, now);
        ReflectionTestUtils.setField(job, "id", 9L);

        when(workspaceRepository.findAll()).thenReturn(List.of(active));
        when(workspaceRepository.findAllByStatus(WorkspaceStatus.DELETED)).thenReturn(List.of());
        when(jobRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(job));

        WorkspaceRestoreReconciliationService.ReconciliationReport report =
                service.reconcileControlPlane(now);

        assertThat(report.blockerCodes()).containsExactly("ACTIVE_WORKSPACE_HAS_PURGE_JOB");
        assertThat(report.inspectionJobIds()).isEmpty();
    }

    @Test
    void convertsInterruptedLeaseToRetryableFailure() {
        Workspace workspace = deletedWorkspace(42L);
        WorkspacePurgeJob job = WorkspacePurgeJob.schedule(workspace, 7L, now.minusDays(31));
        ReflectionTestUtils.setField(job, "id", 9L);
        job.inspected(now.minusHours(1), 0);
        assertThat(job.claim(now.minusMinutes(30), now.minusHours(2))).isTrue();

        when(workspaceRepository.findAll()).thenReturn(List.of(workspace));
        when(workspaceRepository.findAllByStatus(WorkspaceStatus.DELETED))
                .thenReturn(List.of(workspace));
        when(jobRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(job));
        when(memberRepository.findAllByWorkspaceIdAndStatusOrderByJoinedAtAsc(
                        42L, MembershipStatus.ACTIVE))
                .thenReturn(List.of());
        when(invitationRepository.findAllByWorkspaceIdOrderByCreatedAtDesc(42L))
                .thenReturn(List.of());
        when(purgeService.schedule(workspace, 7L, now)).thenReturn(job);
        when(checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(9L))
                .thenReturn(checkpoints(9L));

        WorkspaceRestoreReconciliationService.ReconciliationReport report =
                service.reconcileControlPlane(now);

        assertThat(report.interruptedLeases()).isEqualTo(1);
        assertThat(job.getStatus()).isEqualTo(WorkspacePurgeJobStatus.FAILED);
        assertThat(job.getLastErrorCode()).isEqualTo("RESTORE_INTERRUPTED");
        assertThat(report.inspectionJobIds()).containsExactly(9L);
        assertThat(report.blockerCodes()).isEmpty();
    }

    private Workspace deletedWorkspace(Long id) {
        Workspace workspace = Workspace.createPrivatePersonal("deleted");
        ReflectionTestUtils.setField(workspace, "id", id);
        workspace.close(7L, now.minusDays(31), now.minusDays(1));
        return workspace;
    }

    private List<WorkspacePurgeCheckpoint> checkpoints(Long jobId) {
        return java.util.Arrays.stream(WorkspacePurgeStore.values())
                .map(store -> WorkspacePurgeCheckpoint.pending(jobId, store, now))
                .toList();
    }
}
