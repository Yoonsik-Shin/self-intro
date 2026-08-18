package com.selfintro.modules.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "email_change_token")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmailChangeToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "new_email", nullable = false, length = 255)
    private String newEmail;

    @Column(name = "new_email_canonical", nullable = false, length = 255)
    private String newEmailCanonical;

    @Column(name = "token_hash", nullable = false, unique = true, columnDefinition = "BINARY(32)")
    private byte[] tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static EmailChangeToken issue(
            Long userId,
            String newEmail,
            String newEmailCanonical,
            byte[] tokenHash,
            LocalDateTime expiresAt,
            LocalDateTime now) {
        EmailChangeToken token = new EmailChangeToken();
        token.userId = userId;
        token.newEmail = newEmail.trim();
        token.newEmailCanonical = newEmailCanonical;
        token.tokenHash = tokenHash.clone();
        token.expiresAt = expiresAt;
        token.createdAt = now;
        return token;
    }

    public void use(LocalDateTime now) {
        if (usedAt != null || !expiresAt.isAfter(now)) {
            throw new IllegalArgumentException("만료되었거나 이미 사용된 이메일 변경 링크입니다.");
        }
        usedAt = now;
    }
}
