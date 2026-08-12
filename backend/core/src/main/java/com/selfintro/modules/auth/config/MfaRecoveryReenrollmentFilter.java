package com.selfintro.modules.auth.config;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.MfaService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class MfaRecoveryReenrollmentFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_PATHS =
            Set.of(
                    "/api/auth/me",
                    "/api/auth/csrf",
                    "/api/auth/logout",
                    "/api/auth/reauthenticate",
                    "/api/auth/sessions/logout-all",
                    "/api/auth/mfa/recovery-enrollment",
                    "/api/auth/mfa/recovery-enrollment/confirm");

    private final MfaService mfaService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var session = request.getSession(false);
        if (session != null
                && authentication != null
                && authentication.getPrincipal() instanceof AppUserPrincipal principal
                && mfaService.requiresRecoveryReenrollment(principal, session)
                && !ALLOWED_PATHS.contains(request.getRequestURI())) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "MFA 복구 재등록을 먼저 완료해야 합니다.");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
