package com.selfintro.modules.study.presentation;

import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.identity.publication.application.WorkspacePublishedContentService;
import com.selfintro.modules.study.domain.enums.StudySection;
import com.selfintro.modules.study.presentation.dto.StudyPageResponse;
import com.selfintro.modules.study.presentation.dto.StudyResponse;
import com.selfintro.modules.study.presentation.dto.StudyTaxonomyResponse;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class StudyController {

    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final WorkspacePublishedContentService publishedContentService;

    @GetMapping("/api/workspaces/{workspaceSlug}/studies")
    public StudyPageResponse searchWorkspacePublished(
            @PathVariable String workspaceSlug,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long taxonomyNodeId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<Long> skillIds,
            @RequestParam(required = false) List<Long> experienceIds,
            @RequestParam(required = false) List<Long> experienceDetailIds,
            @RequestParam(required = false) StudySection section,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long workspaceId = publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
        return publishedContentService.studies(
                workspaceId,
                q,
                taxonomyNodeId,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                section,
                page,
                size);
    }

    @GetMapping("/api/workspaces/{workspaceSlug}/studies/{studySlug}")
    public StudyResponse findWorkspacePublished(
            @PathVariable String workspaceSlug, @PathVariable String studySlug) {
        Long workspaceId = publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
        return publishedContentService.study(workspaceId, studySlug);
    }

    @GetMapping("/api/workspaces/{workspaceSlug}/study-taxonomy")
    public List<StudyTaxonomyResponse> workspacePublicTaxonomy(@PathVariable String workspaceSlug) {
        Long workspaceId = publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
        return publishedContentService.studyTaxonomy(workspaceId);
    }

    @GetMapping("/api/workspaces/{workspaceSlug}/tags")
    public List<StudyResponse.TagResponse> workspaceTags(@PathVariable String workspaceSlug) {
        Long workspaceId = publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
        return publishedContentService.studyTags(workspaceId);
    }

    @GetMapping("/api/studies")
    public StudyPageResponse searchPublished(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long taxonomyNodeId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<Long> skillIds,
            @RequestParam(required = false) List<Long> experienceIds,
            @RequestParam(required = false) List<Long> experienceDetailIds,
            @RequestParam(required = false) StudySection section,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long workspaceId = publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
        return publishedContentService.studies(
                workspaceId,
                q,
                taxonomyNodeId,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                section,
                page,
                size);
    }

    @GetMapping("/api/studies/{slug}")
    public StudyResponse findPublished(@PathVariable String slug) {
        Long workspaceId = publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
        return publishedContentService.study(workspaceId, slug);
    }

    @GetMapping("/api/study-taxonomy")
    public List<StudyTaxonomyResponse> publicTaxonomy() {
        Long workspaceId = publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
        return publishedContentService.studyTaxonomy(workspaceId);
    }

    @GetMapping("/api/tags")
    public List<StudyResponse.TagResponse> tags() {
        Long workspaceId = publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
        return publishedContentService.studyTags(workspaceId);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Void> handleNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }
}
