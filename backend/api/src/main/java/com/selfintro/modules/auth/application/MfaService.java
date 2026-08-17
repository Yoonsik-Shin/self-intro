package com.selfintro.modules.auth.application;

import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.securityaudit.application.AuthenticationAuditListener.AuthenticationAuditSignal;
import jakarta.servlet.http.HttpSession;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MfaService {

    private static final String PENDING_SECRET = "SELF_INTRO_PENDING_MFA_SECRET";
    private static final String PENDING_RECOVERY_SECRET = "SELF_INTRO_PENDING_MFA_RECOVERY_SECRET";
    private static final String RECOVERY_AUTHENTICATED_AT =
            "SELF_INTRO_MFA_RECOVERY_AUTHENTICATED_AT";
    private final AppUserRepository appUserRepository;
    private final TotpService totpService;
    private final MfaSecretCipher secretCipher;
    private final MfaRecoveryCodeService recoveryCodeService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${app.security.mfa.issuer:self-intro}")
    private String issuer;

    @Value("${app.security.mfa.recovery-session-valid-for:15m}")
    private Duration recoverySessionValidFor;

    // 로컬 docker-compose 개발 편의용 — 기본값 false. 운영 배포 매니페스트엔 이 값을
    // 채우는 MFA_SKIP_IN_DEV 환경변수가 없으므로 항상 false로 남아 MFA가 강제된다.
    @Value("${app.security.mfa.skip-in-dev:false}")
    private boolean skipMfaInDev;

    public Enrollment beginEnrollment(AppUserPrincipal principal, HttpSession session) {
        requirePlatformAccount(principal);
        if (principal.mfaEnabled()) {
            throw new AccessDeniedException("MFA 재등록은 복구 절차를 통해서만 가능합니다.");
        }
        String secret = totpService.newSecret();
        session.setAttribute(PENDING_SECRET, secret);
        audit("MFA_ENROLLMENT_STARTED", principal.userId(), "SUCCESS", null);
        return enrollment(principal, secret);
    }

    public Enrollment beginRecoveryEnrollment(AppUserPrincipal principal, HttpSession session) {
        requirePlatformAccount(principal);
        requireRecoveryAuthenticatedSession(principal, session);
        String secret = totpService.newSecret();
        session.setAttribute(PENDING_RECOVERY_SECRET, secret);
        audit("MFA_RECOVERY_REENROLLMENT_STARTED", principal.userId(), "SUCCESS", null);
        return enrollment(principal, secret);
    }

    private Enrollment enrollment(AppUserPrincipal principal, String secret) {
        String label = issuer + ":" + principal.getUsername();
        String uri =
                "otpauth://totp/"
                        + encode(label)
                        + "?secret="
                        + secret
                        + "&issuer="
                        + encode(issuer)
                        + "&algorithm=SHA1&digits=6&period=30";
        return new Enrollment(secret, uri);
    }

    @Transactional
    public RecoveryCodes confirmEnrollment(
            AppUserPrincipal principal, String code, HttpSession session) {
        requirePlatformAccount(principal);
        Object pending = session.getAttribute(PENDING_SECRET);
        if (!(pending instanceof String secret) || !totpService.verify(secret, code)) {
            audit("MFA_ENROLLMENT_FAILURE", principal.userId(), "DENIED", "TOTP_REJECTED");
            throw new BadCredentialsException("MFA 인증코드가 올바르지 않습니다.");
        }
        var user = appUserRepository.findById(principal.userId()).orElseThrow();
        user.enableMfa(secretCipher.encrypt(secret));
        var recoveryCodes = recoveryCodeService.replaceFor(principal.userId());
        session.removeAttribute(PENDING_SECRET);
        audit("MFA_ENROLLMENT_COMPLETED", principal.userId(), "SUCCESS", null);
        return new RecoveryCodes(recoveryCodes);
    }

    @Transactional
    public RecoveryCodes confirmRecoveryEnrollment(
            AppUserPrincipal principal, String code, HttpSession session) {
        requirePlatformAccount(principal);
        requireRecoveryAuthenticatedSession(principal, session);
        Object pending = session.getAttribute(PENDING_RECOVERY_SECRET);
        if (!(pending instanceof String secret) || !totpService.verify(secret, code)) {
            audit(
                    "MFA_RECOVERY_REENROLLMENT_FAILURE",
                    principal.userId(),
                    "DENIED",
                    "TOTP_REJECTED");
            throw new BadCredentialsException("MFA 인증코드가 올바르지 않습니다.");
        }
        var user = appUserRepository.findById(principal.userId()).orElseThrow();
        user.enableMfa(secretCipher.encrypt(secret));
        var recoveryCodes = recoveryCodeService.replaceFor(principal.userId());
        session.removeAttribute(PENDING_RECOVERY_SECRET);
        session.removeAttribute(RECOVERY_AUTHENTICATED_AT);
        audit("MFA_RECOVERY_REENROLLMENT_COMPLETED", principal.userId(), "SUCCESS", null);
        return new RecoveryCodes(recoveryCodes);
    }

    @Transactional
    public LoginVerification verifyLogin(AppUserPrincipal principal, String code) {
        if (!requiresLoginMfa(principal)) {
            return LoginVerification.NOT_REQUIRED;
        }
        var user = appUserRepository.findById(principal.userId()).orElseThrow();
        boolean totpAccepted =
                totpService.verify(secretCipher.decrypt(user.getMfaSecretCiphertext()), code);
        boolean recoveryCodeAccepted =
                !totpAccepted && recoveryCodeService.consume(principal.userId(), code);
        if (!totpAccepted && !recoveryCodeAccepted) {
            throw new BadCredentialsException("MFA 인증코드가 필요하거나 올바르지 않습니다.");
        }
        if (recoveryCodeAccepted) {
            audit("MFA_RECOVERY_CODE_CONSUMED", principal.userId(), "SUCCESS", null);
            return LoginVerification.RECOVERY_CODE;
        }
        return LoginVerification.TOTP;
    }

    public void recordLoginVerification(LoginVerification verification, HttpSession session) {
        if (verification == LoginVerification.RECOVERY_CODE) {
            session.setAttribute(RECOVERY_AUTHENTICATED_AT, System.currentTimeMillis());
        } else {
            session.removeAttribute(RECOVERY_AUTHENTICATED_AT);
            session.removeAttribute(PENDING_RECOVERY_SECRET);
        }
    }

    public boolean canRecoverMfa(AppUserPrincipal principal, HttpSession session) {
        if (!requiresLoginMfa(principal)) {
            return false;
        }
        Object value = session.getAttribute(RECOVERY_AUTHENTICATED_AT);
        return value instanceof Long authenticatedAt
                && System.currentTimeMillis() - authenticatedAt
                        <= recoverySessionValidFor.toMillis();
    }

    public boolean requiresRecoveryReenrollment(AppUserPrincipal principal, HttpSession session) {
        return requiresLoginMfa(principal)
                && session.getAttribute(RECOVERY_AUTHENTICATED_AT) instanceof Long;
    }

    public boolean requiresLoginMfa(AppUserPrincipal principal) {
        if (skipMfaInDev) {
            return false;
        }
        return !principal.platformRoles().isEmpty() && principal.mfaEnabled();
    }

    private void requirePlatformAccount(AppUserPrincipal principal) {
        if (principal.platformRoles().isEmpty()) {
            throw new AccessDeniedException("플랫폼 계정만 MFA를 등록할 수 있습니다.");
        }
    }

    private void requireRecoveryAuthenticatedSession(
            AppUserPrincipal principal, HttpSession session) {
        if (!canRecoverMfa(principal, session)) {
            audit(
                    "MFA_RECOVERY_REENROLLMENT_FAILURE",
                    principal.userId(),
                    "DENIED",
                    "RECOVERY_SESSION_REQUIRED");
            throw new AccessDeniedException("복구 코드로 로그인한 세션에서만 MFA를 재등록할 수 있습니다.");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private void audit(String eventType, Long actorUserId, String result, String reasonCode) {
        eventPublisher.publishEvent(
                new AuthenticationAuditSignal(eventType, actorUserId, result, reasonCode));
    }

    public record Enrollment(String secret, String otpauthUri) {}

    public record RecoveryCodes(List<String> codes) {}

    public enum LoginVerification {
        NOT_REQUIRED,
        TOTP,
        RECOVERY_CODE
    }
}
