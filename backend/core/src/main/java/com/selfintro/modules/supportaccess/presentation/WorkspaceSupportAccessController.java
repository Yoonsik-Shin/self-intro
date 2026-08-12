package com.selfintro.modules.supportaccess.presentation;

import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import com.selfintro.modules.supportaccess.application.SupportAccessService;
import com.selfintro.modules.supportaccess.application.SupportAccessService.SupportAccessView;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}/support-access")
public class WorkspaceSupportAccessController {

    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final SupportAccessService supportAccessService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;
    private final SecurityAuditService auditService;

    @GetMapping
    public List<SupportAccessView> list(
            Authentication authentication, @PathVariable String workspaceSlug) {
        WorkspaceMember actor = requireOwner(authentication, workspaceSlug);
        return supportAccessService.listForWorkspace(actor.getWorkspace().getId());
    }

    @PostMapping("/{requestId}/approve")
    @Transactional
    public SupportAccessView approve(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @PathVariable Long requestId) {
        WorkspaceMember actor = requireOwner(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        SupportAccessView result =
                supportAccessService.approve(
                        actor.getWorkspace().getId(), requestId, actor.getUser());
        auditService.recordWorkspaceTargetAction(
                "SUPPORT_ACCESS_APPROVED",
                actor.getUser().getId(),
                result.workspaceId(),
                "SUPPORT_ACCESS_REQUEST",
                result.id());
        return result;
    }

    @PostMapping("/{requestId}/deny")
    @Transactional
    public SupportAccessView deny(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @PathVariable Long requestId) {
        WorkspaceMember actor = requireOwner(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        SupportAccessView result =
                supportAccessService.deny(actor.getWorkspace().getId(), requestId, actor.getUser());
        auditService.recordWorkspaceTargetAction(
                "SUPPORT_ACCESS_DENIED",
                actor.getUser().getId(),
                result.workspaceId(),
                "SUPPORT_ACCESS_REQUEST",
                result.id());
        return result;
    }

    @PostMapping("/{requestId}/revoke")
    @Transactional
    public SupportAccessView revoke(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @PathVariable Long requestId) {
        WorkspaceMember actor = requireOwner(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        SupportAccessView result =
                supportAccessService.revokeByWorkspace(
                        actor.getWorkspace().getId(), requestId, actor.getUser());
        auditService.recordWorkspaceTargetAction(
                "SUPPORT_ACCESS_REVOKED",
                actor.getUser().getId(),
                result.workspaceId(),
                "SUPPORT_ACCESS_REQUEST",
                result.id());
        return result;
    }

    private WorkspaceMember requireOwner(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy.requireAnyRole(
                authentication, workspaceSlug, WorkspaceRole.OWNER);
    }
}
