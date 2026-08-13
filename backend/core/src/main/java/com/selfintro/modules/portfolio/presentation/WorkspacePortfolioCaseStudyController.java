package com.selfintro.modules.portfolio.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.portfolio.application.PortfolioCaseStudyService;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyCreateRequest;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyDetailResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublishRequest;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyRenameRequest;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyRevisionResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudySaveRevisionRequest;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/portfolio/case-studies/manage")
@RequiredArgsConstructor
public class WorkspacePortfolioCaseStudyController {

    private final PortfolioCaseStudyService portfolioCaseStudyService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public List<PortfolioCaseStudyResponse> list(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return portfolioCaseStudyService.list(readWorkspaceId(authentication, workspaceSlug));
    }

    @GetMapping("/{id}")
    public PortfolioCaseStudyDetailResponse get(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        return portfolioCaseStudyService.get(readWorkspaceId(authentication, workspaceSlug), id);
    }

    @PostMapping
    public PortfolioCaseStudyResponse create(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody PortfolioCaseStudyCreateRequest request) {
        return portfolioCaseStudyService.create(
                writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @PutMapping("/{id}")
    public PortfolioCaseStudyResponse rename(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioCaseStudyRenameRequest request) {
        return portfolioCaseStudyService.rename(
                writeWorkspaceId(authentication, workspaceSlug),
                id,
                request.slug(),
                request.title());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        portfolioCaseStudyService.delete(writeWorkspaceId(authentication, workspaceSlug), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/revisions")
    public PortfolioCaseStudyRevisionResponse saveRevision(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioCaseStudySaveRevisionRequest request) {
        return portfolioCaseStudyService.saveRevision(
                writeWorkspaceId(authentication, workspaceSlug),
                id,
                request.content(),
                request.source());
    }

    @PostMapping("/{id}/publish")
    public PortfolioCaseStudyResponse publish(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioCaseStudyPublishRequest request) {
        return portfolioCaseStudyService.publish(
                writeWorkspaceId(authentication, workspaceSlug), id, request.revisionId());
    }

    @PostMapping("/{id}/unpublish")
    public PortfolioCaseStudyResponse unpublish(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        return portfolioCaseStudyService.unpublish(
                writeWorkspaceId(authentication, workspaceSlug), id);
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
