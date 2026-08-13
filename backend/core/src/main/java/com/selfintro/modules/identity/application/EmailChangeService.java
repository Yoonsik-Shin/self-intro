package com.selfintro.modules.identity.application;

import com.selfintro.modules.auth.application.SessionSecurityService;
import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.EmailChangeToken;
import com.selfintro.modules.identity.domain.EmailChangeTokenRepository;
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
public class EmailChangeService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AppUserRepository appUserRepository;
    private final EmailChangeTokenRepository tokenRepository;
    private final RegistrationSecretHasher secretHasher;
    private final PasswordEncoder passwordEncoder;
    private final EmailChangeSender emailSender;
    private final SessionSecurityService sessionSecurityService;
    private final SecurityAuditService securityAuditService;

    @Value("${app.account-recovery.email-change.token-valid-for:30m}")
    private Duration tokenValidFor;

    @Transactional
    public void request(Long userId, String currentPassword, String newEmail) {
        emailSender.ensureAvailable();
        AppUser user =
                appUserRepository
                        .findByIdForUpdate(userId)
                        .filter(AppUser::isActive)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "활성 계정을 찾을 수 없습니다."));
        if (currentPassword == null
                || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "현재 비밀번호가 올바르지 않습니다.");
        }
        String normalizedEmail = normalize(newEmail);
        String canonicalEmail = canonicalize(normalizedEmail);
        if (canonicalEmail.equals(user.getEmailCanonical())) {
            throw new IllegalArgumentException("현재 이메일과 다른 주소를 입력해 주세요.");
        }
        if (appUserRepository.existsByEmailCanonical(canonicalEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }

        tokenRepository.deleteAllByUserId(userId);
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        LocalDateTime now = LocalDateTime.now();
        tokenRepository.save(
                EmailChangeToken.issue(
                        userId,
                        normalizedEmail,
                        canonicalEmail,
                        secretHasher.hash(rawToken),
                        now.plus(tokenValidFor),
                        now));
        try {
            emailSender.send(normalizedEmail, rawToken);
        } catch (RuntimeException exception) {
            tokenRepository.deleteAllByUserId(userId);
            log.error("Email change delivery failed for userId={}", userId, exception);
            securityAuditService.recordPlatformTargetAction(
                    "ACCOUNT_EMAIL_CHANGE_DELIVERY_FAILED", userId, "APP_USER", userId);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "확인 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
        securityAuditService.recordPlatformTargetAction(
                "ACCOUNT_EMAIL_CHANGE_REQUESTED", userId, "APP_USER", userId);
    }

    @Transactional
    public String confirm(String rawToken) {
        EmailChangeToken token =
                tokenRepository
                        .findByTokenHash(secretHasher.hash(rawToken))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "만료되었거나 유효하지 않은 이메일 변경 링크입니다."));
        LocalDateTime now = LocalDateTime.now();
        token.use(now);
        AppUser user =
                appUserRepository
                        .findByIdForUpdate(token.getUserId())
                        .filter(AppUser::isActive)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST, "변경할 수 없는 계정입니다."));
        if (appUserRepository.existsByEmailCanonicalAndIdNot(
                token.getNewEmailCanonical(), user.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "확인 중 다른 계정이 이 이메일을 사용하게 되었습니다.");
        }
        user.changeVerifiedEmail(token.getNewEmail(), token.getNewEmailCanonical(), now);
        sessionSecurityService.revokeAll(user.getLoginId());
        securityAuditService.recordPlatformTargetAction(
                "ACCOUNT_EMAIL_CHANGED", user.getId(), "APP_USER", user.getId());
        return user.getEmail();
    }

    private String normalize(String email) {
        if (email == null || email.isBlank() || email.length() > 255 || !email.contains("@")) {
            throw new IllegalArgumentException("유효한 이메일이 필요합니다.");
        }
        return email.trim();
    }

    private String canonicalize(String email) {
        return email.toLowerCase(Locale.ROOT);
    }
}
