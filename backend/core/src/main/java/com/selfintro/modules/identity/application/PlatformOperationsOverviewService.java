package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.UserStatus;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspacePublicationStatus;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlatformOperationsOverviewService {

    private final AppUserRepository appUserRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional(readOnly = true)
    public PlatformOperationsOverview load() {
        AccountCounts accounts =
                new AccountCounts(
                        appUserRepository.count(),
                        appUserRepository.countByStatus(UserStatus.PENDING_VERIFICATION),
                        appUserRepository.countByStatus(UserStatus.ACTIVE),
                        appUserRepository.countByStatus(UserStatus.SUSPENDED),
                        appUserRepository.countByStatus(UserStatus.DELETED));
        WorkspaceCounts workspaces =
                new WorkspaceCounts(
                        workspaceRepository.count(),
                        workspaceRepository.countByStatus(WorkspaceStatus.ACTIVE),
                        workspaceRepository.countByStatus(WorkspaceStatus.SUSPENDED),
                        workspaceRepository.countByStatus(WorkspaceStatus.DELETED),
                        workspaceRepository.countByStatusAndPublicationStatus(
                                WorkspaceStatus.ACTIVE, WorkspacePublicationStatus.PRIVATE),
                        workspaceRepository.countByStatusAndPublicationStatus(
                                WorkspaceStatus.ACTIVE, WorkspacePublicationStatus.PUBLISHED));
        MembershipCounts memberships =
                new MembershipCounts(
                        workspaceMemberRepository.count(),
                        workspaceMemberRepository.countByStatus(MembershipStatus.ACTIVE),
                        workspaceMemberRepository.countByStatus(MembershipStatus.INVITED),
                        workspaceMemberRepository.countByStatus(MembershipStatus.SUSPENDED));
        return new PlatformOperationsOverview(accounts, workspaces, memberships, Instant.now());
    }

    public record PlatformOperationsOverview(
            AccountCounts accounts,
            WorkspaceCounts workspaces,
            MembershipCounts memberships,
            Instant generatedAt) {}

    public record AccountCounts(
            long total, long pendingVerification, long active, long suspended, long deleted) {}

    public record WorkspaceCounts(
            long total,
            long active,
            long suspended,
            long deleted,
            long activePrivate,
            long activePublished) {}

    public record MembershipCounts(long total, long active, long invited, long suspended) {}
}
