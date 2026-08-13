package com.selfintro.modules.skill.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.skill.application.SkillConnectionService;
import com.selfintro.modules.skill.presentation.dto.SkillConnections;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/skills")
public class WorkspaceSkillConnectionController {

    private final SkillConnectionService connectionService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping("/{skillId}/connections")
    public SkillConnections get(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long skillId) {
        return connectionService.getSkillConnections(
                readWorkspaceId(authentication, workspaceSlug), skillId);
    }

    @PutMapping("/{skillId}/connections")
    public SkillConnections update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long skillId,
            @Valid @RequestBody SkillConnections request) {
        return connectionService.updateSkillConnections(
                writeWorkspaceId(authentication, workspaceSlug), skillId, request);
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
