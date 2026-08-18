package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "email_verification_token")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, unique = true, columnDefinition = "BINARY(32)")
    private byte[] tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static EmailVerificationToken issue(
            Long userId, byte[] tokenHash, LocalDateTime expiresAt, LocalDateTime now) {
        EmailVerificationToken token = new EmailVerificationToken();
        token.userId = userId;
        token.tokenHash = tokenHash.clone();
        token.expiresAt = expiresAt;
        token.createdAt = now;
        return token;
    }

    public void use(LocalDateTime now) {
        if (usedAt != null || !expiresAt.isAfter(now)) {
            throw new IllegalArgumentException("만료되었거나 이미 사용된 확인 링크입니다.");
        }
        usedAt = now;
    }
}
