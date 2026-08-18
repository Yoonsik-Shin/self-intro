package com.selfintro.modules.auth.application;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.securityaudit.application.AuthenticationAuditListener.AuthenticationAuditSignal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityContextRepository securityContextRepository;
    private final SessionSecurityService sessionSecurityService;
    private final MfaService mfaService;
    private final RequestFingerprintService requestFingerprintService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${app.security.session.default-timeout:12h}")
    private Duration defaultSessionTimeout;

    @Value("${app.security.session.platform-timeout:30m}")
    private Duration platformSessionTimeout;

    public LoginResult login(
            String username,
            String password,
            String totpCode,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        Authentication authentication;
        MfaService.LoginVerification mfaVerification = MfaService.LoginVerification.NOT_REQUIRED;
        try {
            authentication =
                    authenticationManager.authenticate(
                            new UsernamePasswordAuthenticationToken(username, password));
        } catch (AuthenticationException exception) {
            audit("LOGIN_FAILURE", null, "DENIED", "PRIMARY_CREDENTIALS_REJECTED");
            throw exception;
        }

        if (authentication.getPrincipal() instanceof AppUserPrincipal principal) {
            if (mfaService.requiresLoginMfa(principal)
                    && (totpCode == null || totpCode.isBlank())) {
                audit("LOGIN_MFA_REQUIRED", principal.userId(), "SUCCESS", null);
                return LoginResult.MFA_REQUIRED;
            }
            try {
                mfaVerification = mfaService.verifyLogin(principal, totpCode);
            } catch (AuthenticationException exception) {
                audit("LOGIN_FAILURE", principal.userId(), "DENIED", "MFA_REJECTED");
                throw exception;
            }
            sessionSecurityService.prepareForLogin(principal);
        }

        // This endpoint authenticates manually instead of using Spring Security's form-login
        // filter. Rotate an attacker-supplied pre-authentication session explicitly before the
        // authenticated SecurityContext is stored.
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            mfaService.recordLoginVerification(mfaVerification, session);
            Duration timeout =
                    authentication.getPrincipal() instanceof AppUserPrincipal principal
                                    && !principal.platformRoles().isEmpty()
                            ? platformSessionTimeout
                            : defaultSessionTimeout;
            session.setMaxInactiveInterval(Math.toIntExact(timeout.toSeconds()));
            session.setAttribute(
                    RecentReauthenticationPolicy.REAUTHENTICATED_AT_ATTRIBUTE,
                    System.currentTimeMillis());
            var fingerprint = requestFingerprintService.create(httpRequest);
            session.setAttribute(RequestFingerprintService.IP_HASH_ATTRIBUTE, fingerprint.ipHash());
            session.setAttribute(
                    RequestFingerprintService.DEVICE_HASH_ATTRIBUTE, fingerprint.deviceHash());
        }
        Long actorUserId =
                authentication.getPrincipal() instanceof AppUserPrincipal principal
                        ? principal.userId()
                        : null;
        audit("LOGIN_SUCCESS", actorUserId, "SUCCESS", null);
        return LoginResult.AUTHENTICATED;
    }

    public void reauthenticate(
            AppUserPrincipal principal, String password, HttpServletRequest httpRequest) {
        try {
            // Reauthentication belongs to the already authenticated account. Resolve it by the
            // immutable user id instead of the login id captured in the session, because a login
            // id/email normalization or account update can otherwise reject the correct password.
            AppUser user =
                    appUserRepository
                            .findById(principal.userId())
                            .filter(AppUser::isActive)
                            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
            if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                throw new BadCredentialsException("Invalid credentials");
            }
        } catch (AuthenticationException exception) {
            audit(
                    "REAUTHENTICATION_FAILURE",
                    principal.userId(),
                    "DENIED",
                    "PRIMARY_CREDENTIALS_REJECTED");
            throw exception;
        }
        HttpSession session = httpRequest.getSession(true);
        long reauthenticatedAt = System.currentTimeMillis();
        session.setAttribute(
                RecentReauthenticationPolicy.REAUTHENTICATED_AT_ATTRIBUTE, reauthenticatedAt);
        session.setAttribute(
                RecentReauthenticationPolicy.EXPLICIT_REAUTHENTICATED_AT_ATTRIBUTE,
                reauthenticatedAt);
        audit("REAUTHENTICATION_SUCCESS", principal.userId(), "SUCCESS", null);
    }

    private void audit(String eventType, Long actorUserId, String result, String reasonCode) {
        eventPublisher.publishEvent(
                new AuthenticationAuditSignal(eventType, actorUserId, result, reasonCode));
    }

    public enum LoginResult {
        AUTHENTICATED,
        MFA_REQUIRED
    }
}
