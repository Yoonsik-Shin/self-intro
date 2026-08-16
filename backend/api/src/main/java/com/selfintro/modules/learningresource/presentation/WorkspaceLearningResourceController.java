package com.selfintro.modules.learningresource.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public LearningResourcePageResponse search(
            Authentication authentication,
            @PathVariable String workspaceSlug,
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
                readWorkspaceId(authentication, workspaceSlug),
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
    public List<LearningResourceCatalogResponse> catalog(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestParam(required = false) String q) {
        return learningResourceService.listCatalog(
                readWorkspaceId(authentication, workspaceSlug), q);
    }

    @GetMapping("/graph")
    public LearningResourceGraphResponse graph(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return learningResourceService.findWorkspaceGraph(
                readWorkspaceId(authentication, workspaceSlug));
    }

    @GetMapping("/{resourceId}")
    public LearningResourceResponse get(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long resourceId) {
        return learningResourceService.getWorkspace(
                readWorkspaceId(authentication, workspaceSlug), resourceId);
    }

    @PostMapping("/{resourceId}")
    public LearningResourceResponse add(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long resourceId,
            @Valid @RequestBody WorkspaceLearningResourceRequest request) {
        return learningResourceService.addToWorkspace(
                writeWorkspaceId(authentication, workspaceSlug), resourceId, request);
    }

    @PutMapping("/{resourceId}")
    public LearningResourceResponse update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long resourceId,
            @Valid @RequestBody WorkspaceLearningResourceRequest request) {
        return learningResourceService.updateWorkspace(
                writeWorkspaceId(authentication, workspaceSlug), resourceId, request);
    }

    @PatchMapping("/{resourceId}/status")
    public LearningResourceResponse updateStatus(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long resourceId,
            @Valid @RequestBody LearningResourceStatusRequest request) {
        return learningResourceService.updateWorkspaceStatus(
                writeWorkspaceId(authentication, workspaceSlug), resourceId, request.status());
    }

    @DeleteMapping("/{resourceId}")
    public ResponseEntity<Void> remove(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long resourceId) {
        learningResourceService.removeFromWorkspace(
                writeWorkspaceId(authentication, workspaceSlug), resourceId);
        return ResponseEntity.noContent().build();
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
