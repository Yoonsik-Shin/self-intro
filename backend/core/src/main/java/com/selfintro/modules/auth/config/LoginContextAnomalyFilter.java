package com.selfintro.modules.auth.config;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.RequestFingerprintService;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class LoginContextAnomalyFilter extends OncePerRequestFilter {

    private static final String REPORTED_ATTRIBUTE = "SELF_INTRO_REPORTED_CONTEXT_HASH";
    private final RequestFingerprintService fingerprintService;
    private final SecurityAuditService securityAuditService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var session = request.getSession(false);
        if (session != null
                && authentication != null
                && authentication.getPrincipal() instanceof AppUserPrincipal principal) {
            Object loginIp = session.getAttribute(RequestFingerprintService.IP_HASH_ATTRIBUTE);
            Object loginDevice =
                    session.getAttribute(RequestFingerprintService.DEVICE_HASH_ATTRIBUTE);
            var current = fingerprintService.create(request);
            boolean ipChanged = loginIp instanceof String && !loginIp.equals(current.ipHash());
            boolean deviceChanged =
                    loginDevice instanceof String && !loginDevice.equals(current.deviceHash());
            String contextHash = current.ipHash() + ":" + current.deviceHash();
            if ((ipChanged || deviceChanged)
                    && !contextHash.equals(session.getAttribute(REPORTED_ATTRIBUTE))) {
                String reason =
                        ipChanged && deviceChanged
                                ? "IP_AND_DEVICE_CHANGED"
                                : ipChanged ? "IP_CHANGED" : "DEVICE_CHANGED";
                securityAuditService.recordLoginContextAnomaly(
                        principal.userId(), reason, current.ipHash(), current.deviceHash());
                session.setAttribute(REPORTED_ATTRIBUTE, contextHash);
            }
        }
        filterChain.doFilter(request, response);
    }
}
