package com.selfintro.modules.experience.presentation;

import com.selfintro.modules.experience.application.ExperienceService;
import com.selfintro.modules.experience.presentation.dto.ExperienceRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/experiences/manage")
@RequiredArgsConstructor
public class WorkspaceExperienceManagementController {

    private final ExperienceService experienceService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public List<ExperienceResponse> list(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return experienceService.listAll(readWorkspaceId(authentication, workspaceSlug));
    }

    @PostMapping
    public ExperienceResponse create(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody ExperienceRequest request) {
        return experienceService.create(writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @PutMapping("/{id}")
    public ExperienceResponse update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody ExperienceRequest request) {
        return experienceService.update(
                writeWorkspaceId(authentication, workspaceSlug), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        experienceService.delete(writeWorkspaceId(authentication, workspaceSlug), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reorder")
    public List<ExperienceResponse> reorder(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestBody List<Long> ids) {
        return experienceService.reorder(writeWorkspaceId(authentication, workspaceSlug), ids);
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
