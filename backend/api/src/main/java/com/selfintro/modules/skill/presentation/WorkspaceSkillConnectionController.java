package com.selfintro.modules.skill.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.skill.application.SkillConnectionService;
import com.selfintro.modules.skill.presentation.dto.SkillConnections;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/{skillId}/connections")
    public SkillConnections get(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable Long skillId) {
        return connectionService.getSkillConnections(workspaceId, skillId);
    }

    @PutMapping("/{skillId}/connections")
    public SkillConnections update(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long skillId,
            @Valid @RequestBody SkillConnections request) {
        return connectionService.updateSkillConnections(workspaceId, skillId, request);
    }
}
