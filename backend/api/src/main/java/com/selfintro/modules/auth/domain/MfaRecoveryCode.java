package com.selfintro.modules.auth.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "mfa_recovery_code",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_mfa_recovery_code_user_hash",
                        columnNames = {"user_id", "code_hash"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MfaRecoveryCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "code_hash", nullable = false, columnDefinition = "BINARY(32)")
    private byte[] codeHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    public static MfaRecoveryCode issue(Long userId, byte[] codeHash, LocalDateTime now) {
        MfaRecoveryCode code = new MfaRecoveryCode();
        code.userId = userId;
        code.codeHash = codeHash.clone();
        code.createdAt = now;
        return code;
    }

    public void consume(LocalDateTime now) {
        if (consumedAt != null) {
            throw new IllegalStateException("이미 사용한 MFA 복구 코드입니다.");
        }
        consumedAt = now;
    }
}
