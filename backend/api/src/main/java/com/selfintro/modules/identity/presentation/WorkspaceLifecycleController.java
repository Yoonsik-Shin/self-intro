package com.selfintro.modules.identity.presentation;

import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.application.WorkspaceLifecycleService;
import com.selfintro.modules.identity.application.WorkspaceLifecycleService.ClosureView;
import com.selfintro.modules.identity.application.WorkspaceLifecycleService.LeaveView;
import com.selfintro.modules.identity.application.WorkspaceLifecycleService.WorkspaceTypeView;
import com.selfintro.modules.identity.application.WorkspaceLifecycleService.WorkspaceView;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.presentation.dto.WorkspaceClosureRequest;
import com.selfintro.modules.identity.presentation.dto.WorkspaceNameChangeRequest;
import com.selfintro.modules.identity.presentation.dto.WorkspaceTypeChangeRequest;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}")
public class WorkspaceLifecycleController {

    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final WorkspaceLifecycleService lifecycleService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;
    private final SecurityAuditService securityAuditService;

    @PutMapping("/settings/name")
    @Transactional
    public WorkspaceView rename(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceNameChangeRequest request) {
        WorkspaceMember actor =
                workspaceAccessPolicy.requireAnyRole(
                        authentication, workspaceSlug, WorkspaceRole.OWNER, WorkspaceRole.ADMIN);
        reauthenticationPolicy.requireRecent(session);
        WorkspaceView result = lifecycleService.rename(actor, request.name());
        securityAuditService.recordWorkspaceAction(
                "WORKSPACE_RENAMED", actor.getUser().getId(), result.workspaceId());
        return result;
    }

    @GetMapping("/settings/type")
    public WorkspaceTypeView type(
            Authentication authentication, @PathVariable String workspaceSlug) {
        WorkspaceMember actor =
                workspaceAccessPolicy.requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER);
        return lifecycleService.type(actor);
    }

    @PutMapping("/settings/type")
    @Transactional
    public WorkspaceTypeView changeType(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceTypeChangeRequest request) {
        WorkspaceMember actor =
                workspaceAccessPolicy.requireAnyRole(
                        authentication, workspaceSlug, WorkspaceRole.OWNER);
        reauthenticationPolicy.requireRecent(session);
        WorkspaceTypeView result = lifecycleService.changeType(actor, request.type());
        securityAuditService.recordWorkspaceAction(
                "WORKSPACE_TYPE_CHANGED", actor.getUser().getId(), result.workspaceId());
        return result;
    }

    @PostMapping("/members/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void leave(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug) {
        WorkspaceMember actor =
                workspaceAccessPolicy.requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER);
        reauthenticationPolicy.requireRecent(session);
        LeaveView result = lifecycleService.leave(actor);
        securityAuditService.recordWorkspaceTargetAction(
                "WORKSPACE_MEMBER_LEFT",
                actor.getUser().getId(),
                result.workspaceId(),
                "WORKSPACE_MEMBER",
                result.memberId());
    }

    @DeleteMapping("/lifecycle")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void close(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceClosureRequest request) {
        WorkspaceMember actor =
                workspaceAccessPolicy.requireAnyRole(
                        authentication, workspaceSlug, WorkspaceRole.OWNER);
        reauthenticationPolicy.requireRecent(session);
        ClosureView result = lifecycleService.close(actor, request.workspaceName());
        securityAuditService.recordWorkspaceAction(
                "WORKSPACE_CLOSED", actor.getUser().getId(), result.workspaceId());
    }
}
