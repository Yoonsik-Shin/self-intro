package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitation;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeJob;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus;
import com.selfintro.modules.identity.domain.WorkspacePurgeStore;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Repairs only control-plane state that can be derived without guessing user intent after a backup
 * restore. Ambiguous contradictions are reported as blockers and must never be auto-corrected.
 */
@Service
@RequiredArgsConstructor
public class WorkspaceRestoreReconciliationService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceMembershipInvitationRepository invitationRepository;
    private final WorkspacePurgeJobRepository jobRepository;
    private final WorkspacePurgeCheckpointRepository checkpointRepository;
    private final WorkspacePurgeService purgeService;

    @Transactional
    public ReconciliationReport reconcileControlPlane(LocalDateTime now) {
        Map<Long, Workspace> workspaces = new HashMap<>();
        workspaceRepository
                .findAll()
                .forEach(workspace -> workspaces.put(workspace.getId(), workspace));
        Map<Long, WorkspacePurgeJob> jobs = new HashMap<>();
        jobRepository
                .findAllByOrderByCreatedAtDesc()
                .forEach(job -> jobs.put(job.getWorkspaceId(), job));

        int scheduledJobs = 0;
        int suspendedMemberships = 0;
        int revokedInvitations = 0;
        int interruptedLeases = 0;
        Set<String> blockers = new LinkedHashSet<>();
        Set<Long> inspectionJobIds = new HashSet<>();

        for (Workspace workspace : workspaceRepository.findAllByStatus(WorkspaceStatus.DELETED)) {
            if (!hasClosureMetadata(workspace)) {
                blockers.add("DELETED_WORKSPACE_METADATA_INCOMPLETE");
                continue;
            }

            for (WorkspaceMember member :
                    memberRepository.findAllByWorkspaceIdAndStatusOrderByJoinedAtAsc(
                            workspace.getId(), MembershipStatus.ACTIVE)) {
                member.suspend();
                suspendedMemberships++;
            }
            for (WorkspaceMembershipInvitation invitation :
                    invitationRepository.findAllByWorkspaceIdOrderByCreatedAtDesc(
                            workspace.getId())) {
                if (invitation.isUsable(now)) {
                    invitation.revoke(now);
                    revokedInvitations++;
                }
            }

            WorkspacePurgeJob job = jobs.get(workspace.getId());
            if (job == null) {
                job =
                        purgeService.schedule(
                                workspace, workspace.getDeletionRequestedByUserId(), now);
                jobs.put(workspace.getId(), job);
                scheduledJobs++;
            } else if (!matchesClosure(workspace, job)) {
                blockers.add("PURGE_JOB_CLOSURE_METADATA_MISMATCH");
                continue;
            } else if (isTerminal(job.getStatus())) {
                blockers.add("TERMINAL_PURGE_JOB_HAS_DELETED_WORKSPACE");
                continue;
            } else {
                purgeService.schedule(workspace, workspace.getDeletionRequestedByUserId(), now);
            }

            if (job.getStatus() == WorkspacePurgeJobStatus.PURGING) {
                job.fail("RESTORE_INTERRUPTED", now);
                interruptedLeases++;
            }
            inspectionJobIds.add(job.getId());
        }

        for (WorkspacePurgeJob job : jobs.values()) {
            Workspace workspace = workspaces.get(job.getWorkspaceId());
            if (workspace != null && workspace.getStatus() != WorkspaceStatus.DELETED) {
                blockers.add("ACTIVE_WORKSPACE_HAS_PURGE_JOB");
                continue;
            }
            if (workspace == null && job.getStatus() == WorkspacePurgeJobStatus.COMPLETED) {
                continue;
            }
            if (workspace == null && job.getStatus() == WorkspacePurgeJobStatus.CANCELLED) {
                blockers.add("CANCELLED_PURGE_JOB_HAS_NO_WORKSPACE");
                continue;
            }
            if (workspace == null && job.getStatus() == WorkspacePurgeJobStatus.PURGING) {
                job.fail("RESTORE_INTERRUPTED", now);
                interruptedLeases++;
            }
            if (!hasCompleteCheckpointSet(job.getId())) {
                blockers.add("PURGE_CHECKPOINT_SET_INCOMPLETE_AFTER_RESTORE");
                continue;
            }
            if (!isTerminal(job.getStatus())) inspectionJobIds.add(job.getId());
        }

        List<Long> orderedInspectionIds = new ArrayList<>(inspectionJobIds);
        orderedInspectionIds.sort(Long::compareTo);
        return new ReconciliationReport(
                scheduledJobs,
                suspendedMemberships,
                revokedInvitations,
                interruptedLeases,
                orderedInspectionIds,
                Set.copyOf(blockers));
    }

    private boolean hasClosureMetadata(Workspace workspace) {
        return workspace.getPublicKey() != null
                && workspace.getDeletedAt() != null
                && workspace.getDeletionRequestedByUserId() != null
                && workspace.getPurgeAfter() != null
                && !workspace.getPurgeAfter().isBefore(workspace.getDeletedAt());
    }

    private boolean matchesClosure(Workspace workspace, WorkspacePurgeJob job) {
        return Objects.equals(workspace.getPublicKey(), job.getWorkspacePublicKey())
                && Objects.equals(
                        workspace.getDeletionRequestedByUserId(), job.getRequestedByUserId())
                && Objects.equals(workspace.getPurgeAfter(), job.getEligibleAt())
                && WorkspacePurgeJob.INVENTORY_VERSION.equals(job.getInventoryVersion());
    }

    private boolean hasCompleteCheckpointSet(Long jobId) {
        Set<WorkspacePurgeStore> stores =
                checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(jobId).stream()
                        .map(checkpoint -> checkpoint.getStoreType())
                        .collect(Collectors.toSet());
        return stores.size() == WorkspacePurgeStore.values().length
                && stores.containsAll(List.of(WorkspacePurgeStore.values()));
    }

    private boolean isTerminal(WorkspacePurgeJobStatus status) {
        return status == WorkspacePurgeJobStatus.COMPLETED
                || status == WorkspacePurgeJobStatus.CANCELLED;
    }

    public record ReconciliationReport(
            int scheduledJobs,
            int suspendedMemberships,
            int revokedInvitations,
            int interruptedLeases,
            List<Long> inspectionJobIds,
            Set<String> blockerCodes) {
        public ReconciliationReport {
            inspectionJobIds = List.copyOf(inspectionJobIds);
            blockerCodes = Set.copyOf(blockerCodes);
        }
    }
}
