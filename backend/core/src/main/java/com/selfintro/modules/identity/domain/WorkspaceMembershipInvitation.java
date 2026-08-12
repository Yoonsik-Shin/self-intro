package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspace_membership_invitation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceMembershipInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @Column(name = "invited_by_user_id", nullable = false)
    private Long invitedByUserId;

    @Column(name = "recipient_email_canonical", nullable = false, length = 255)
    private String recipientEmailCanonical;

    @Enumerated(EnumType.STRING)
    @Column(name = "workspace_role", nullable = false, length = 20)
    private WorkspaceRole role;

    @Column(name = "token_hash", nullable = false, unique = true, columnDefinition = "BINARY(32)")
    private byte[] tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkspaceMembershipInvitationStatus status;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "declined_at")
    private LocalDateTime declinedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static WorkspaceMembershipInvitation issue(
            Long workspaceId,
            Long invitedByUserId,
            String recipientEmailCanonical,
            WorkspaceRole role,
            byte[] tokenHash,
            LocalDateTime expiresAt) {
        if (role == WorkspaceRole.OWNER) {
            throw new IllegalArgumentException("OWNER 초대는 허용되지 않습니다.");
        }
        WorkspaceMembershipInvitation invitation = new WorkspaceMembershipInvitation();
        invitation.workspaceId = workspaceId;
        invitation.invitedByUserId = invitedByUserId;
        invitation.recipientEmailCanonical = recipientEmailCanonical;
        invitation.role = role;
        invitation.tokenHash = tokenHash.clone();
        invitation.status = WorkspaceMembershipInvitationStatus.PENDING;
        invitation.expiresAt = expiresAt;
        invitation.createdAt = LocalDateTime.now();
        return invitation;
    }

    public boolean isUsable(LocalDateTime now) {
        return status == WorkspaceMembershipInvitationStatus.PENDING && expiresAt.isAfter(now);
    }

    public void accept(LocalDateTime now) {
        if (!isUsable(now)) throw new IllegalStateException("사용할 수 없는 Workspace 초대입니다.");
        status = WorkspaceMembershipInvitationStatus.ACCEPTED;
        acceptedAt = now;
    }

    public void revoke(LocalDateTime now) {
        if (!isUsable(now)) throw new IllegalStateException("사용 가능한 Workspace 초대만 취소할 수 있습니다.");
        status = WorkspaceMembershipInvitationStatus.REVOKED;
        revokedAt = now;
    }

    public void decline(LocalDateTime now) {
        if (!isUsable(now)) throw new IllegalStateException("사용할 수 없는 Workspace 초대입니다.");
        status = WorkspaceMembershipInvitationStatus.DECLINED;
        declinedAt = now;
    }

    public void redactRecipient(String anonymizedRecipient, LocalDateTime now) {
        if (anonymizedRecipient == null || anonymizedRecipient.isBlank()) {
            throw new IllegalArgumentException("익명화된 초대 수신자 식별자가 필요합니다.");
        }
        this.recipientEmailCanonical = anonymizedRecipient;
        if (status == WorkspaceMembershipInvitationStatus.PENDING) {
            status = WorkspaceMembershipInvitationStatus.REVOKED;
            revokedAt = now;
        }
    }

    public String effectiveStatus(LocalDateTime now) {
        return status == WorkspaceMembershipInvitationStatus.PENDING && !expiresAt.isAfter(now)
                ? "EXPIRED"
                : status.name();
    }
}
