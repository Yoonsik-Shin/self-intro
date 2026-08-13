package com.selfintro.modules.identity.application;

import com.selfintro.modules.auth.application.SessionSecurityService;
import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.PasswordResetToken;
import com.selfintro.modules.identity.domain.PasswordResetTokenRepository;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AppUserRepository appUserRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final RegistrationSecretHasher secretHasher;
    private final RegistrationPasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetEmailSender emailSender;
    private final SessionSecurityService sessionSecurityService;
    private final SecurityAuditService securityAuditService;

    @Value("${app.account-recovery.password-reset.token-valid-for:30m}")
    private Duration tokenValidFor;

    @Transactional
    public void request(String email) {
        emailSender.ensureAvailable();
        String canonicalEmail = canonicalize(email);
        AppUser user = appUserRepository.findByEmailCanonical(canonicalEmail).orElse(null);
        if (user == null || !user.isActive()) {
            return;
        }

        tokenRepository.deleteAllByUserId(user.getId());
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        LocalDateTime now = LocalDateTime.now();
        tokenRepository.save(
                PasswordResetToken.issue(
                        user.getId(), secretHasher.hash(rawToken), now.plus(tokenValidFor), now));
        try {
            emailSender.send(user.getEmail(), rawToken);
        } catch (RuntimeException exception) {
            tokenRepository.deleteAllByUserId(user.getId());
            log.error(
                    "Password reset email delivery failed for userId={}", user.getId(), exception);
            securityAuditService.recordPlatformTargetAction(
                    "PASSWORD_RESET_DELIVERY_FAILED", null, "APP_USER", user.getId());
            return;
        }
        securityAuditService.recordPlatformTargetAction(
                "PASSWORD_RESET_REQUESTED", null, "APP_USER", user.getId());
    }

    @Transactional
    public void confirm(String rawToken, String newPassword) {
        passwordPolicy.validate(newPassword);
        PasswordResetToken token =
                tokenRepository
                        .findByTokenHash(secretHasher.hash(rawToken))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "만료되었거나 유효하지 않은 재설정 링크입니다."));
        LocalDateTime now = LocalDateTime.now();
        token.use(now);
        AppUser user =
                appUserRepository
                        .findByIdForUpdate(token.getUserId())
                        .filter(AppUser::isActive)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST, "재설정할 수 없는 계정입니다."));
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("기존 비밀번호와 다른 비밀번호를 사용해 주세요.");
        }
        user.changePasswordHash(passwordEncoder.encode(newPassword));
        sessionSecurityService.revokeAll(user.getLoginId());
        securityAuditService.recordPlatformTargetAction(
                "PASSWORD_RESET_COMPLETED", null, "APP_USER", user.getId());
    }

    private String canonicalize(String email) {
        if (email == null || email.isBlank() || email.length() > 255 || !email.contains("@")) {
            throw new IllegalArgumentException("유효한 이메일이 필요합니다.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
