package com.selfintro.modules.identity.presentation;

import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.application.WorkspaceSlugService;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.presentation.dto.WorkspaceSlugChangeRequest;
import com.selfintro.modules.identity.presentation.dto.WorkspaceSlugResolutionResponse;
import com.selfintro.modules.identity.presentation.dto.WorkspaceSlugSettingsResponse;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}")
public class WorkspaceSlugController {

    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final WorkspaceSlugService slugService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;
    private final SecurityAuditService securityAuditService;

    @GetMapping("/slug-resolution")
    public WorkspaceSlugResolutionResponse resolution(
            org.springframework.security.core.Authentication authentication,
            @PathVariable String workspaceSlug) {
        WorkspaceMember member =
                workspaceAccessPolicy.requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER);
        return slugService.resolution(workspaceSlug, member.getWorkspace());
    }

    @GetMapping("/settings/slug")
    public WorkspaceSlugSettingsResponse settings(
            org.springframework.security.core.Authentication authentication,
            @PathVariable String workspaceSlug) {
        WorkspaceMember member = manageMember(authentication, workspaceSlug);
        return slugService.settings(member.getWorkspace().getId());
    }

    @PutMapping("/settings/slug")
    @Transactional
    public WorkspaceSlugSettingsResponse changeSlug(
            org.springframework.security.core.Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceSlugChangeRequest request) {
        WorkspaceMember member = manageMember(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        WorkspaceSlugSettingsResponse response =
                slugService.changeCanonicalSlug(member.getWorkspace().getId(), request.slug());
        securityAuditService.recordWorkspaceAction(
                "WORKSPACE_SLUG_CHANGED", member.getUser().getId(), member.getWorkspace().getId());
        return response;
    }

    private WorkspaceMember manageMember(
            org.springframework.security.core.Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy.requireAnyRole(
                authentication, workspaceSlug, WorkspaceRole.OWNER, WorkspaceRole.ADMIN);
    }

    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public void handleAuthenticationException() {}
}
