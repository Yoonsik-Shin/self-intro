package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "registration_invitation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RegistrationInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_hash", nullable = false, unique = true, columnDefinition = "BINARY(32)")
    private byte[] codeHash;

    @Column(length = 120)
    private String label;

    @Column(name = "recipient_email_canonical", length = 255)
    private String recipientEmailCanonical;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "max_uses", nullable = false)
    private int maxUses;

    @Column(name = "used_count", nullable = false)
    private int usedCount;

    @Column(name = "sent_count", nullable = false)
    private int sentCount;

    @Column(name = "last_sent_at")
    private LocalDateTime lastSentAt;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static RegistrationInvitation issue(
            byte[] codeHash, LocalDateTime expiresAt, int maxUses, Long createdByUserId) {
        return issue(codeHash, null, null, expiresAt, maxUses, createdByUserId);
    }

    public static RegistrationInvitation issue(
            byte[] codeHash,
            String label,
            String recipientEmailCanonical,
            LocalDateTime expiresAt,
            int maxUses,
            Long createdByUserId) {
        if (maxUses < 1 || (recipientEmailCanonical != null && maxUses != 1)) {
            throw new IllegalArgumentException("개인 초대는 1회, 공용 초대는 1회 이상이어야 합니다.");
        }
        RegistrationInvitation invitation = new RegistrationInvitation();
        invitation.codeHash = codeHash.clone();
        invitation.label = label;
        invitation.recipientEmailCanonical = recipientEmailCanonical;
        invitation.expiresAt = expiresAt;
        invitation.maxUses = maxUses;
        invitation.usedCount = 0;
        invitation.sentCount = 0;
        invitation.status = "ACTIVE";
        invitation.createdByUserId = createdByUserId;
        invitation.createdAt = LocalDateTime.now();
        return invitation;
    }

    public void consume(LocalDateTime now) {
        consume(now, null);
    }

    public void consume(LocalDateTime now, String canonicalEmail) {
        validateForConsumption(now, canonicalEmail);
        usedCount++;
        if (usedCount >= maxUses) {
            status = "USED";
            usedAt = now;
        }
    }

    public void validateForConsumption(LocalDateTime now, String canonicalEmail) {
        if (!"ACTIVE".equals(status) || !expiresAt.isAfter(now) || usedCount >= maxUses) {
            throw new IllegalArgumentException("유효하지 않은 초대 코드입니다.");
        }
        if (recipientEmailCanonical != null && !recipientEmailCanonical.equals(canonicalEmail)) {
            throw new IllegalArgumentException("초대받은 이메일과 일치하지 않습니다.");
        }
    }

    public void markSent(LocalDateTime now) {
        sentCount++;
        lastSentAt = now;
    }

    public void revoke(LocalDateTime now) {
        if (!"ACTIVE".equals(status) || !expiresAt.isAfter(now)) {
            throw new IllegalArgumentException("사용 가능한 초대만 폐기할 수 있습니다.");
        }
        status = "REVOKED";
        revokedAt = now;
    }

    public String effectiveStatus(LocalDateTime now) {
        if ("ACTIVE".equals(status) && !expiresAt.isAfter(now)) {
            return "EXPIRED";
        }
        return status;
    }
}
