package com.selfintro.modules.experience.presentation;

import com.selfintro.modules.experience.application.ExperiencePlacementService;
import com.selfintro.modules.experience.domain.enums.ExperiencePlacementType;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementRequest;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/experience-placements")
public class WorkspaceExperiencePlacementController {

    private final ExperiencePlacementService placementService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping("/{placementType}")
    public List<ExperiencePlacementResponse> list(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable ExperiencePlacementType placementType) {
        return placementService.getAll(
                readWorkspaceId(authentication, workspaceSlug), placementType);
    }

    @PutMapping("/{placementType}")
    public List<ExperiencePlacementResponse> replace(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable ExperiencePlacementType placementType,
            @Valid @RequestBody List<ExperiencePlacementRequest> requests) {
        return placementService.replaceAll(
                writeWorkspaceId(authentication, workspaceSlug), placementType, requests);
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
