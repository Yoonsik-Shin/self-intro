package com.selfintro.modules.experience.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.experience.application.ExperienceService;
import com.selfintro.modules.experience.presentation.dto.ExperienceRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/experiences/manage")
@RequiredArgsConstructor
public class WorkspaceExperienceManagementController {

    private final ExperienceService experienceService;

    @GetMapping
    public List<ExperienceResponse> list(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return experienceService.listAll(workspaceId);
    }

    @PostMapping
    public ExperienceResponse create(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody ExperienceRequest request) {
        return experienceService.create(workspaceId, request);
    }

    @PutMapping("/{id}")
    public ExperienceResponse update(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id,
            @Valid @RequestBody ExperienceRequest request) {
        return experienceService.update(workspaceId, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id) {
        experienceService.delete(workspaceId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reorder")
    public List<ExperienceResponse> reorder(
            @CurrentWorkspace Long workspaceId,
            @RequestBody List<Long> ids) {
        return experienceService.reorder(workspaceId, ids);
    }
}
