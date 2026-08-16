package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "app_user")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "login_id", nullable = false, unique = true, length = 120)
    private String loginId;

    @Column(length = 255, unique = true)
    private String email;

    @Column(name = "email_canonical", length = 255, unique = true)
    private String emailCanonical;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "mfa_enabled", nullable = false)
    private boolean mfaEnabled;

    @Column(name = "mfa_secret_ciphertext", length = 512)
    private String mfaSecretCiphertext;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    public static AppUser createBootstrapOwner(
            String loginId, String passwordHash, String displayName, String email) {
        AppUser user = new AppUser();
        user.loginId = loginId;
        user.passwordHash = passwordHash;
        user.displayName = displayName;
        user.email = email;
        user.emailCanonical =
                email == null ? null : email.trim().toLowerCase(java.util.Locale.ROOT);
        user.status = UserStatus.ACTIVE;
        user.mfaEnabled = false;
        user.createdAt = LocalDateTime.now();
        user.updatedAt = user.createdAt;
        return user;
    }

    public static AppUser register(
            String internalLoginId,
            String email,
            String emailCanonical,
            String passwordHash,
            String nickname) {
        AppUser user = new AppUser();
        user.loginId = internalLoginId;
        user.email = email;
        user.emailCanonical = emailCanonical;
        user.passwordHash = passwordHash;
        user.displayName = nickname;
        user.status = UserStatus.PENDING_VERIFICATION;
        user.mfaEnabled = false;
        user.createdAt = LocalDateTime.now();
        user.updatedAt = user.createdAt;
        return user;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }

    public void verifyEmail(LocalDateTime verifiedAt) {
        if (status == UserStatus.DELETED || status == UserStatus.SUSPENDED) {
            throw new IllegalStateException("비활성 계정은 이메일을 확인할 수 없습니다.");
        }
        this.emailVerifiedAt = verifiedAt;
        this.status = UserStatus.ACTIVE;
        this.updatedAt = verifiedAt;
    }

    public void enableMfa(String encryptedSecret) {
        if (encryptedSecret == null || encryptedSecret.isBlank()) {
            throw new IllegalArgumentException("암호화된 MFA 비밀키가 필요합니다.");
        }
        this.mfaSecretCiphertext = encryptedSecret;
        this.mfaEnabled = true;
        this.updatedAt = LocalDateTime.now();
    }

    public void changeDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("닉네임을 입력해 주세요.");
        }
        String normalized = displayName.trim();
        if (normalized.length() < 2 || normalized.length() > 40) {
            throw new IllegalArgumentException("닉네임은 2~40자로 입력해 주세요.");
        }
        if (normalized
                .codePoints()
                .anyMatch(codePoint -> Character.isISOControl(codePoint) || codePoint == 0x200B)) {
            throw new IllegalArgumentException("닉네임에 제어 문자를 사용할 수 없습니다.");
        }
        this.displayName = normalized;
        this.updatedAt = LocalDateTime.now();
    }

    public void changePasswordHash(String passwordHash) {
        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("암호화된 비밀번호가 필요합니다.");
        }
        this.passwordHash = passwordHash;
        this.updatedAt = LocalDateTime.now();
    }

    public void changeVerifiedEmail(String email, String emailCanonical, LocalDateTime verifiedAt) {
        if (email == null
                || email.isBlank()
                || emailCanonical == null
                || emailCanonical.isBlank()) {
            throw new IllegalArgumentException("변경할 이메일이 필요합니다.");
        }
        this.email = email.trim();
        this.emailCanonical = emailCanonical;
        this.emailVerifiedAt = verifiedAt;
        this.updatedAt = verifiedAt;
    }

    public void withdraw(
            String anonymizedLoginId, String invalidatedPasswordHash, LocalDateTime now) {
        if (status == UserStatus.DELETED) {
            throw new IllegalStateException("이미 탈퇴한 계정입니다.");
        }
        if (anonymizedLoginId == null || anonymizedLoginId.isBlank()) {
            throw new IllegalArgumentException("익명화 로그인 식별자가 필요합니다.");
        }
        this.loginId = anonymizedLoginId;
        this.email = null;
        this.emailCanonical = null;
        this.emailVerifiedAt = null;
        this.passwordHash = invalidatedPasswordHash;
        this.displayName = "탈퇴한 사용자";
        this.status = UserStatus.DELETED;
        this.mfaEnabled = false;
        this.mfaSecretCiphertext = null;
        this.withdrawnAt = now;
        this.updatedAt = now;
    }
}
