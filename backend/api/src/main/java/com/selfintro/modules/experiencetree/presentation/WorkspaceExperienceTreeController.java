package com.selfintro.modules.experiencetree.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.experiencetree.application.ExperienceTreeService;
import com.selfintro.modules.experiencetree.domain.enums.DecisionDomain;
import com.selfintro.modules.experiencetree.presentation.dto.DecisionStudyLinkRequest;
import com.selfintro.modules.experiencetree.presentation.dto.ExperienceTreeResponse;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.identity.publication.application.WorkspacePublishedContentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/experience-tree")
@RequiredArgsConstructor
public class WorkspaceExperienceTreeController {

    private final ExperienceTreeService service;
    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final WorkspacePublishedContentService publishedContentService;

    @GetMapping
    public ExperienceTreeResponse.Index index(
            @PathVariable String workspaceSlug,
            @RequestParam(required = false) DecisionDomain domain,
            @RequestParam(required = false, name = "q") String query) {
        return publishedContentService.ontologyIndex(
                publicWorkspaceId(workspaceSlug), domain, query);
    }

    @GetMapping("/situations/{stableKey}")
    public ExperienceTreeResponse.Detail detail(
            @PathVariable String workspaceSlug, @PathVariable String stableKey) {
        return publishedContentService.ontologyDetail(publicWorkspaceId(workspaceSlug), stableKey);
    }

    @GetMapping("/situations/{stableKey}/studies")
    public List<ExperienceTreeResponse.StudyLink> studies(
            @PathVariable String workspaceSlug, @PathVariable String stableKey) {
        return publishedContentService.ontologyStudies(publicWorkspaceId(workspaceSlug), stableKey);
    }

    @GetMapping("/manage")
    public ExperienceTreeResponse.Index manageIndex(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @RequestParam(required = false) DecisionDomain domain,
            @RequestParam(required = false, name = "q") String query) {
        return service.adminIndex(workspaceId, domain, query);
    }

    @GetMapping("/manage/situations/{stableKey}")
    public ExperienceTreeResponse.Detail manageDetail(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable String stableKey) {
        return service.adminDetail(workspaceId, stableKey);
    }

    @PostMapping("/manage/study-links")
    public ResponseEntity<ExperienceTreeResponse.StudyLink> createLink(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody DecisionStudyLinkRequest request) {
        return ResponseEntity.status(201)
                .body(service.createLink(workspaceId, request));
    }

    @PutMapping("/manage/study-links/{id}")
    public ExperienceTreeResponse.StudyLink updateLink(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id,
            @Valid @RequestBody DecisionStudyLinkRequest request) {
        return service.updateLink(workspaceId, id, request);
    }

    @DeleteMapping("/manage/study-links/{id}")
    public ResponseEntity<Void> deleteLink(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id) {
        service.deleteLink(workspaceId, id);
        return ResponseEntity.noContent().build();
    }

    private Long publicWorkspaceId(String workspaceSlug) {
        return publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
    }
}
