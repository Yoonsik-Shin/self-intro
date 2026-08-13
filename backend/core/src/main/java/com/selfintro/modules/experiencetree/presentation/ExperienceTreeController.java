package com.selfintro.modules.experiencetree.presentation;

import com.selfintro.modules.experiencetree.domain.enums.DecisionDomain;
import com.selfintro.modules.experiencetree.presentation.dto.ExperienceTreeResponse;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.identity.publication.application.WorkspacePublishedContentService;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ExperienceTreeController {
    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final WorkspacePublishedContentService publishedContentService;

    @GetMapping("/api/experience-tree")
    public ResponseEntity<ExperienceTreeResponse.Index> index(
            @RequestParam(required = false) DecisionDomain domain,
            @RequestParam(required = false, name = "q") String query) {
        ExperienceTreeResponse.Index response =
                publishedContentService.ontologyIndex(defaultWorkspaceId(), domain, query);
        return ResponseEntity.ok()
                .cacheControl(
                        CacheControl.maxAge(Duration.ofHours(1))
                                .cachePublic()
                                .staleWhileRevalidate(Duration.ofDays(1)))
                .eTag(response.version())
                .body(response);
    }

    @GetMapping("/api/experience-tree/domains/{domain}")
    public ResponseEntity<ExperienceTreeResponse.Index> byDomain(
            @PathVariable DecisionDomain domain,
            @RequestParam(required = false, name = "q") String query) {
        return index(domain, query);
    }

    @GetMapping("/api/experience-tree/situations/{stableKey}")
    public ResponseEntity<ExperienceTreeResponse.Detail> detail(@PathVariable String stableKey) {
        ExperienceTreeResponse.Detail response =
                publishedContentService.ontologyDetail(defaultWorkspaceId(), stableKey);
        return ResponseEntity.ok()
                .cacheControl(
                        CacheControl.maxAge(Duration.ofHours(1))
                                .cachePublic()
                                .staleWhileRevalidate(Duration.ofDays(1)))
                .eTag(response.contentHash())
                .body(response);
    }

    @GetMapping("/api/experience-tree/situations/{stableKey}/studies")
    public List<ExperienceTreeResponse.StudyLink> studies(@PathVariable String stableKey) {
        return publishedContentService.ontologyStudies(defaultWorkspaceId(), stableKey);
    }

    private Long defaultWorkspaceId() {
        return publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
    }
}
