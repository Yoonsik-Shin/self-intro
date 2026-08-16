package com.selfintro.modules.portfolio.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
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

    @GetMapping
    public List<PortfolioCaseStudyResponse> list(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return portfolioCaseStudyService.list(workspaceId);
    }

    @GetMapping("/{id}")
    public PortfolioCaseStudyDetailResponse get(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable Long id) {
        return portfolioCaseStudyService.get(workspaceId, id);
    }

    @PostMapping
    public PortfolioCaseStudyResponse create(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody PortfolioCaseStudyCreateRequest request) {
        return portfolioCaseStudyService.create(workspaceId, request);
    }

    @PutMapping("/{id}")
    public PortfolioCaseStudyResponse rename(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioCaseStudyRenameRequest request) {
        return portfolioCaseStudyService.rename(
                workspaceId,
                id,
                request.slug(),
                request.title());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id) {
        portfolioCaseStudyService.delete(workspaceId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/revisions")
    public PortfolioCaseStudyRevisionResponse saveRevision(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioCaseStudySaveRevisionRequest request) {
        return portfolioCaseStudyService.saveRevision(
                workspaceId,
                id,
                request.content(),
                request.source());
    }

    @PostMapping("/{id}/publish")
    public PortfolioCaseStudyResponse publish(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioCaseStudyPublishRequest request) {
        return portfolioCaseStudyService.publish(workspaceId, id, request.revisionId());
    }

    @PostMapping("/{id}/unpublish")
    public PortfolioCaseStudyResponse unpublish(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id) {
        return portfolioCaseStudyService.unpublish(workspaceId, id);
    }
}
