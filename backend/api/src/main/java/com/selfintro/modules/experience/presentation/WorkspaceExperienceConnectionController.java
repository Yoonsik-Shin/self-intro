package com.selfintro.modules.experience.presentation;

import com.selfintro.modules.experience.application.ExperienceConnectionService;
import com.selfintro.modules.experience.presentation.dto.ExperienceConnections;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}/experiences/manage/{id}/connections")
public class WorkspaceExperienceConnectionController {

    private final ExperienceConnectionService connectionService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public ExperienceConnections get(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        return connectionService.getExperienceConnections(
                readWorkspaceId(authentication, workspaceSlug), id);
    }

    @PutMapping
    public ExperienceConnections update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody ExperienceConnections request) {
        return connectionService.updateExperienceConnections(
                writeWorkspaceId(authentication, workspaceSlug), id, request);
    }

    private Long readWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER)
                .getWorkspace()
                .getId();
    }

    private Long writeWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR)
                .getWorkspace()
                .getId();
    }
}
