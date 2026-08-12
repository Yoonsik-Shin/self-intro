package com.selfintro.modules.supportaccess.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import com.selfintro.modules.supportaccess.application.SupportAccessService;
import com.selfintro.modules.supportaccess.application.SupportAccessService.SupportAccessView;
import com.selfintro.modules.supportaccess.application.SupportAccessService.SupportSnapshot;
import com.selfintro.modules.supportaccess.domain.SupportAccessScope;
import com.selfintro.modules.supportaccess.presentation.dto.SupportAccessCreateRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ops/support-access")
public class SupportAccessOperationsController {

    private final SupportAccessService supportAccessService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;
    private final SecurityAuditService auditService;

    @GetMapping
    public List<SupportAccessView> list(Authentication authentication) {
        return supportAccessService.listForOperator(requirePrincipal(authentication).userId());
    }

    @PostMapping
    @Transactional
    public SupportAccessView request(
            Authentication authentication,
            HttpSession session,
            @Valid @RequestBody SupportAccessCreateRequest request) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        reauthenticationPolicy.requireRecent(session);
        SupportAccessView result =
                supportAccessService.request(
                        principal.userId(),
                        request.workspaceSlug(),
                        request.reason(),
                        request.scopes(),
                        request.durationMinutes());
        auditService.recordWorkspaceTargetAction(
                "SUPPORT_ACCESS_REQUESTED",
                principal.userId(),
                result.workspaceId(),
                "SUPPORT_ACCESS_REQUEST",
                result.id());
        return result;
    }

    @PostMapping("/{requestId}/revoke")
    @Transactional
    public SupportAccessView revoke(
            Authentication authentication, HttpSession session, @PathVariable Long requestId) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        reauthenticationPolicy.requireRecent(session);
        SupportAccessView result =
                supportAccessService.revokeByOperator(principal.userId(), requestId);
        auditService.recordWorkspaceTargetAction(
                "SUPPORT_ACCESS_REVOKED",
                principal.userId(),
                result.workspaceId(),
                "SUPPORT_ACCESS_REQUEST",
                result.id());
        return result;
    }

    @GetMapping("/{workspaceSlug}/snapshot")
    @Transactional
    public SupportSnapshot snapshot(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestParam SupportAccessScope scope) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        SupportSnapshot result =
                supportAccessService.snapshot(principal.userId(), workspaceSlug, scope);
        auditService.recordWorkspaceTargetAction(
                "SUPPORT_DATA_ACCESSED",
                principal.userId(),
                result.workspaceId(),
                "SUPPORT_ACCESS_REQUEST",
                result.grantId());
        return result;
    }

    private AppUserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return principal;
    }
}
