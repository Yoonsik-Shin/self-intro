package com.selfintro.modules.skill.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.presentation.dto.SkillRequest;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public List<SkillResponse> list(
            Authentication authentication, @PathVariable String workspaceSlug) {
        Long workspaceId =
                workspaceAccessPolicy
                        .requireAnyRole(
                                authentication,
                                workspaceSlug,
                                WorkspaceRole.OWNER,
                                WorkspaceRole.ADMIN,
                                WorkspaceRole.EDITOR,
                                WorkspaceRole.VIEWER)
                        .getWorkspace()
                        .getId();
        return skillService.getWorkspaceSkills(workspaceId).stream()
                .map(SkillResponse::from)
                .toList();
    }

    @PostMapping
    public SkillResponse create(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody SkillRequest request) {
        return skillService.addToWorkspace(
                writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @PutMapping("/{catalogSkillId}")
    public SkillResponse update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long catalogSkillId,
            @Valid @RequestBody SkillRequest request) {
        return skillService.updateWorkspaceSkill(
                writeWorkspaceId(authentication, workspaceSlug), catalogSkillId, request);
    }

    @DeleteMapping("/{catalogSkillId}")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long catalogSkillId) {
        skillService.removeFromWorkspace(
                writeWorkspaceId(authentication, workspaceSlug), catalogSkillId);
        return ResponseEntity.noContent().build();
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
