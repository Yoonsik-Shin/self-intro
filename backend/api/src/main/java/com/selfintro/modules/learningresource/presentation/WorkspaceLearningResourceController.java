package com.selfintro.modules.learningresource.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.learningresource.application.LearningResourceService;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceCatalogResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceGraphResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourcePageResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceStatusRequest;
import com.selfintro.modules.learningresource.presentation.dto.WorkspaceLearningResourceRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/learning-resources/manage")
@RequiredArgsConstructor
public class WorkspaceLearningResourceController {

    private final LearningResourceService learningResourceService;

    @GetMapping
    public LearningResourcePageResponse search(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long taxonomyNodeId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<Long> skillIds,
            @RequestParam(required = false) LearningResourceType resourceType,
            @RequestParam(required = false) LearningResourceStatus status,
            @RequestParam(required = false) LearningResourcePriorityTier priorityTier,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return learningResourceService.searchWorkspace(
                workspaceId,
                q,
                taxonomyNodeId,
                tags,
                skillIds,
                resourceType,
                status,
                priorityTier,
                page,
                size);
    }

    @GetMapping("/catalog")
    public Page<LearningResourceCatalogResponse> catalog(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return learningResourceService.catalog(workspaceId, q, pageable);
    }

    @GetMapping("/graph")
    public LearningResourceGraphResponse graph(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return learningResourceService.findWorkspaceGraph(workspaceId);
    }

    @GetMapping("/{resourceId}")
    public LearningResourceResponse get(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable Long resourceId) {
        return learningResourceService.getWorkspace(workspaceId, resourceId);
    }

    @PostMapping("/{resourceId}")
    public LearningResourceResponse add(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long resourceId,
            @Valid @RequestBody WorkspaceLearningResourceRequest request) {
        return learningResourceService.addToWorkspace(workspaceId, resourceId, request);
    }

    @PutMapping("/{resourceId}")
    public LearningResourceResponse update(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long resourceId,
            @Valid @RequestBody WorkspaceLearningResourceRequest request) {
        return learningResourceService.updateWorkspace(workspaceId, resourceId, request);
    }

    @PatchMapping("/{resourceId}/status")
    public LearningResourceResponse updateStatus(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long resourceId,
            @Valid @RequestBody LearningResourceStatusRequest request) {
        return learningResourceService.updateWorkspaceStatus(
                workspaceId, resourceId, request.status());
    }

    @DeleteMapping("/{resourceId}")
    public ResponseEntity<Void> remove(
            @CurrentWorkspace Long workspaceId, @PathVariable Long resourceId) {
        learningResourceService.removeFromWorkspace(workspaceId, resourceId);
        return ResponseEntity.noContent().build();
    }
}
