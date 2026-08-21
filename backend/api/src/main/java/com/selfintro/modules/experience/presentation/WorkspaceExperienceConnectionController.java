package com.selfintro.modules.experience.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.experience.application.ExperienceConnectionService;
import com.selfintro.modules.experience.presentation.dto.ExperienceConnections;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/experiences/manage/{id}/connections")
public class WorkspaceExperienceConnectionController {

    private final ExperienceConnectionService connectionService;

    @GetMapping
    public ExperienceConnections get(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId, @PathVariable Long id) {
        return connectionService.getExperienceConnections(workspaceId, id);
    }

    @PutMapping
    public ExperienceConnections update(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id,
            @Valid @RequestBody ExperienceConnections request) {
        return connectionService.updateExperienceConnections(workspaceId, id, request);
    }
}
