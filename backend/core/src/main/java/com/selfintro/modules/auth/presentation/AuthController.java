package com.selfintro.modules.auth.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.AuthService;
import com.selfintro.modules.auth.application.AuthenticationRateLimitService;
import com.selfintro.modules.auth.application.MfaService;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.auth.application.SessionSecurityService;
import com.selfintro.modules.auth.presentation.dto.LoginRequest;
import com.selfintro.modules.auth.presentation.dto.LoginResponse;
import com.selfintro.modules.auth.presentation.dto.MeResponse;
import com.selfintro.modules.auth.presentation.dto.MfaCodeRequest;
import com.selfintro.modules.auth.presentation.dto.ReauthenticateRequest;
import com.selfintro.modules.auth.presentation.dto.ReauthenticationStatusResponse;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthenticationRateLimitService authenticationRateLimitService;
    private final SessionSecurityService sessionSecurityService;
    private final MfaService mfaService;
    private final RecentReauthenticationPolicy recentReauthenticationPolicy;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final AppUserRepository appUserRepository;
    private final SecurityAuditService securityAuditService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        authenticationRateLimitService.requireLoginAllowance(request.username(), httpRequest);
        var result =
                authService.login(
                        request.username(),
                        request.password(),
                        request.totpCode(),
                        httpRequest,
                        httpResponse);
        return ResponseEntity.ok()
                .body(
                        result == AuthService.LoginResult.MFA_REQUIRED
                                ? LoginResponse.mfaRequiredResult()
                                : LoginResponse.authenticatedResult());
    }

    @GetMapping("/me")
    public MeResponse me(Authentication authentication, HttpServletRequest httpRequest) {
        // 익명 사용자는 서블릿 스펙상 principal이 null로 전달된다 (인증된 사용자만 getUserPrincipal()에 값이 참).
        if (authentication == null) {
            throw new InsufficientAuthenticationException("로그인이 필요합니다.");
        }
        if (!(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new InsufficientAuthenticationException("로그인이 필요합니다.");
        }
        var currentUser = appUserRepository.findById(principal.userId()).orElse(null);
        if (currentUser == null || !currentUser.isActive()) {
            var session = httpRequest.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            throw new InsufficientAuthenticationException("계정 상태가 변경되어 다시 로그인해야 합니다.");
        }
        var workspaces =
                workspaceMemberRepository
                        .findAllByUserIdAndStatus(principal.userId(), MembershipStatus.ACTIVE)
                        .stream()
                        .map(
                                membership ->
                                        new MeResponse.WorkspaceMembershipResponse(
                                                membership.getWorkspace().getId(),
                                                membership.getWorkspace().getPublicKey(),
                                                membership.getWorkspace().getSlug(),
                                                membership.getWorkspace().getName(),
                                                membership.getRole().name()))
                        .toList();
        String nickname = currentUser.getDisplayName();
        var session = httpRequest.getSession(true);
        return new MeResponse(
                principal.userId(),
                principal.getUsername(),
                currentUser.getEmail(),
                nickname,
                principal.mfaEnabled(),
                !principal.platformRoles().isEmpty() && !principal.mfaEnabled(),
                mfaService.requiresRecoveryReenrollment(principal, session),
                recentReauthenticationPolicy.expiresAtEpochMillis(session),
                recentReauthenticationPolicy.explicitExpiresAtEpochMillis(session),
                principal.platformRoles(),
                workspaces);
    }

    @PostMapping("/mfa/enrollment")
    public MfaService.Enrollment beginMfaEnrollment(
            Authentication authentication, HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        var session = httpRequest.getSession(true);
        recentReauthenticationPolicy.requireRecent(session);
        return mfaService.beginEnrollment(principal, session);
    }

    @PostMapping("/mfa/enrollment/confirm")
    public ResponseEntity<MfaService.RecoveryCodes> confirmMfaEnrollment(
            @Valid @RequestBody MfaCodeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        var session = httpRequest.getSession(true);
        recentReauthenticationPolicy.requireRecent(session);
        var recoveryCodes = mfaService.confirmEnrollment(principal, request.code(), session);
        sessionSecurityService.logoutAll(principal.getUsername(), httpRequest);
        return ResponseEntity.ok(recoveryCodes);
    }

    @PostMapping("/mfa/recovery-enrollment")
    public MfaService.Enrollment beginMfaRecoveryEnrollment(
            Authentication authentication, HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        var session = httpRequest.getSession(true);
        recentReauthenticationPolicy.requireRecent(session);
        return mfaService.beginRecoveryEnrollment(principal, session);
    }

    @PostMapping("/mfa/recovery-enrollment/confirm")
    public ResponseEntity<MfaService.RecoveryCodes> confirmMfaRecoveryEnrollment(
            @Valid @RequestBody MfaCodeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        var session = httpRequest.getSession(true);
        recentReauthenticationPolicy.requireRecent(session);
        var recoveryCodes =
                mfaService.confirmRecoveryEnrollment(principal, request.code(), session);
        sessionSecurityService.logoutAll(principal.getUsername(), httpRequest);
        return ResponseEntity.ok(recoveryCodes);
    }

    @PostMapping("/reauthenticate")
    public ResponseEntity<ReauthenticationStatusResponse> reauthenticate(
            @Valid @RequestBody ReauthenticateRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        authService.reauthenticate(principal, request.password(), httpRequest);
        var session = httpRequest.getSession(true);
        return ResponseEntity.ok(
                new ReauthenticationStatusResponse(
                        recentReauthenticationPolicy.expiresAtEpochMillis(session),
                        recentReauthenticationPolicy.explicitExpiresAtEpochMillis(session)));
    }

    @DeleteMapping("/reauthentication")
    public ResponseEntity<Void> expireReauthentication(
            Authentication authentication, HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        var session = httpRequest.getSession(false);
        if (session != null) {
            recentReauthenticationPolicy.expire(session);
        }
        securityAuditService.recordPlatformTargetAction(
                "REAUTHENTICATION_EXPIRED", principal.userId(), "APP_USER", principal.userId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sessions/logout-all")
    public ResponseEntity<Void> logoutAll(
            Authentication authentication, HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        sessionSecurityService.logoutAll(principal.getUsername(), httpRequest);
        securityAuditService.recordPlatformTargetAction(
                "ACCOUNT_SESSIONS_REVOKED", principal.userId(), "APP_USER", principal.userId());
        return ResponseEntity.noContent().build();
    }

    private AppUserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new InsufficientAuthenticationException("로그인이 필요합니다.");
        }
        return principal;
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Void> handleAuthenticationException() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
