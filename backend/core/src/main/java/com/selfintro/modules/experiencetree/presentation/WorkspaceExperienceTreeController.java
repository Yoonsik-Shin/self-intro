package com.selfintro.modules.experiencetree.presentation;

import com.selfintro.modules.experiencetree.application.ExperienceTreeService;
import com.selfintro.modules.experiencetree.domain.enums.DecisionDomain;
import com.selfintro.modules.experiencetree.presentation.dto.DecisionStudyLinkRequest;
import com.selfintro.modules.experiencetree.presentation.dto.ExperienceTreeResponse;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.publication.application.WorkspacePublishedContentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/experience-tree")
@RequiredArgsConstructor
public class WorkspaceExperienceTreeController {

    private final ExperienceTreeService service;
    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;
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
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestParam(required = false) DecisionDomain domain,
            @RequestParam(required = false, name = "q") String query) {
        return service.adminIndex(readWorkspaceId(authentication, workspaceSlug), domain, query);
    }

    @GetMapping("/manage/situations/{stableKey}")
    public ExperienceTreeResponse.Detail manageDetail(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable String stableKey) {
        return service.adminDetail(readWorkspaceId(authentication, workspaceSlug), stableKey);
    }

    @PostMapping("/manage/study-links")
    public ResponseEntity<ExperienceTreeResponse.StudyLink> createLink(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody DecisionStudyLinkRequest request) {
        return ResponseEntity.status(201)
                .body(service.createLink(writeWorkspaceId(authentication, workspaceSlug), request));
    }

    @PutMapping("/manage/study-links/{id}")
    public ExperienceTreeResponse.StudyLink updateLink(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody DecisionStudyLinkRequest request) {
        return service.updateLink(writeWorkspaceId(authentication, workspaceSlug), id, request);
    }

    @DeleteMapping("/manage/study-links/{id}")
    public ResponseEntity<Void> deleteLink(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        service.deleteLink(writeWorkspaceId(authentication, workspaceSlug), id);
        return ResponseEntity.noContent().build();
    }

    private Long publicWorkspaceId(String workspaceSlug) {
        return publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
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
