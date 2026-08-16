package com.selfintro.modules.identity.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceMembershipInvitationRepository
        extends JpaRepository<WorkspaceMembershipInvitation, Long> {
    List<WorkspaceMembershipInvitation> findAllByWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);

    Optional<WorkspaceMembershipInvitation> findByIdAndWorkspaceId(Long id, Long workspaceId);

    @Query(
            "select invitation.workspaceId from WorkspaceMembershipInvitation invitation where invitation.tokenHash = :tokenHash")
    Optional<Long> findWorkspaceIdByTokenHash(@Param("tokenHash") byte[] tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
            "select invitation from WorkspaceMembershipInvitation invitation where invitation.tokenHash = :tokenHash")
    Optional<WorkspaceMembershipInvitation> findByTokenHashForUpdate(
            @Param("tokenHash") byte[] tokenHash);

    List<WorkspaceMembershipInvitation> findAllByWorkspaceIdAndRecipientEmailCanonicalAndStatus(
            Long workspaceId,
            String recipientEmailCanonical,
            WorkspaceMembershipInvitationStatus status);

    List<WorkspaceMembershipInvitation> findAllByRecipientEmailCanonical(
            String recipientEmailCanonical);

    @Query(
            """
            select invitation.id
            from WorkspaceMembershipInvitation invitation
            where (invitation.status = :pending and invitation.expiresAt < :cutoff)
               or (invitation.status = :accepted and invitation.acceptedAt < :cutoff)
               or (invitation.status = :revoked and invitation.revokedAt < :cutoff)
               or (invitation.status = :declined and invitation.declinedAt < :cutoff)
            order by invitation.id
            """)
    List<Long> findRetentionCandidateIds(
            @Param("cutoff") java.time.LocalDateTime cutoff,
            @Param("pending") WorkspaceMembershipInvitationStatus pending,
            @Param("accepted") WorkspaceMembershipInvitationStatus accepted,
            @Param("revoked") WorkspaceMembershipInvitationStatus revoked,
            @Param("declined") WorkspaceMembershipInvitationStatus declined,
            Pageable pageable);
}
