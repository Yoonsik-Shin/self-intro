package com.selfintro.modules.skill.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.modules.skill.presentation.dto.WorkspaceSkillCreateRequest;
import com.selfintro.modules.skill.presentation.dto.WorkspaceSkillUpdateRequest;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/skills")
@RequiredArgsConstructor
public class WorkspaceSkillController {

    private final SkillService skillService;

    @GetMapping
    public List<SkillResponse> list(@CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return skillService.getWorkspaceSkills(workspaceId).stream()
                .map(SkillResponse::from)
                .toList();
    }

    @PostMapping
    public SkillResponse create(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody WorkspaceSkillCreateRequest request) {
        return skillService.addToWorkspace(workspaceId, request);
    }

    @PutMapping("/{catalogSkillId}")
    public SkillResponse update(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long catalogSkillId,
            @Valid @RequestBody WorkspaceSkillUpdateRequest request) {
        return skillService.updateWorkspaceSkill(workspaceId, catalogSkillId, request);
    }

    @DeleteMapping("/{catalogSkillId}")
    public ResponseEntity<Void> delete(
            @CurrentWorkspace Long workspaceId, @PathVariable Long catalogSkillId) {
        skillService.removeFromWorkspace(workspaceId, catalogSkillId);
        return ResponseEntity.noContent().build();
    }
}
