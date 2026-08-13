package com.selfintro.modules.experience.presentation;

import com.selfintro.modules.experience.application.ExperienceConnectionService;
import com.selfintro.modules.experience.presentation.dto.ExperienceConnections;
import com.selfintro.modules.experience.presentation.dto.RelatedExperienceResponse;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.identity.publication.application.WorkspacePublishedContentService;
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
@RequestMapping("/api")
public class ExperienceConnectionController {

    private final ExperienceConnectionService connectionService;
    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final WorkspacePublishedContentService publishedContentService;

    @GetMapping("/admin/experiences/{id}/connections")
    public ExperienceConnections getExperienceConnections(@PathVariable Long id) {
        return connectionService.getExperienceConnections(id);
    }

    @PutMapping("/admin/experiences/{id}/connections")
    public ExperienceConnections updateExperienceConnections(
            @PathVariable Long id, @Valid @RequestBody ExperienceConnections request) {
        return connectionService.updateExperienceConnections(id, request);
    }

    @GetMapping("/experiences/{id}/related")
    public List<RelatedExperienceResponse> getRelatedExperiences(@PathVariable Long id) {
        Long workspaceId = publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
        return publishedContentService.relatedExperiences(workspaceId, id);
    }

    @GetMapping("/workspaces/{workspaceSlug}/experiences/{id}/related")
    public List<RelatedExperienceResponse> getWorkspaceRelatedExperiences(
            @PathVariable String workspaceSlug, @PathVariable Long id) {
        Long workspaceId = publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
        return publishedContentService.relatedExperiences(workspaceId, id);
    }
}
