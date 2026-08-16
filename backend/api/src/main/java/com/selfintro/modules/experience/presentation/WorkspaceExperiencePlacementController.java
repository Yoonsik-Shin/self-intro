package com.selfintro.modules.experience.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.experience.application.ExperiencePlacementService;
import com.selfintro.modules.experience.domain.enums.ExperiencePlacementType;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementRequest;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/{placementType}")
    public List<ExperiencePlacementResponse> list(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable ExperiencePlacementType placementType) {
        return placementService.getAll(workspaceId, placementType);
    }

    @PutMapping("/{placementType}")
    public List<ExperiencePlacementResponse> replace(
            @CurrentWorkspace Long workspaceId,
            @PathVariable ExperiencePlacementType placementType,
            @Valid @RequestBody List<ExperiencePlacementRequest> requests) {
        return placementService.replaceAll(workspaceId, placementType, requests);
    }
}
