package com.selfintro.modules.experiencetree.presentation;

import com.selfintro.modules.experiencetree.application.ExperienceTreeService;
import com.selfintro.modules.experiencetree.domain.enums.DecisionDomain;
import com.selfintro.modules.experiencetree.presentation.dto.DecisionStudyLinkRequest;
import com.selfintro.modules.experiencetree.presentation.dto.ExperienceTreeResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ExperienceTreeController {
    private final ExperienceTreeService service;

    @GetMapping("/api/experience-tree")
    public ResponseEntity<ExperienceTreeResponse.Index> index(
            @RequestParam(required = false) DecisionDomain domain,
            @RequestParam(required = false, name = "q") String query) {
        ExperienceTreeResponse.Index response = service.index(domain, query);
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
        ExperienceTreeResponse.Detail response = service.detail(stableKey);
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
        return service.studies(stableKey, false);
    }

    @GetMapping("/api/admin/experience-tree/situations/{stableKey}")
    public ExperienceTreeResponse.Detail adminDetail(@PathVariable String stableKey) {
        return service.adminDetail(stableKey);
    }

    @GetMapping("/api/admin/experience-tree")
    public ExperienceTreeResponse.Index adminIndex(
            @RequestParam(required = false) DecisionDomain domain,
            @RequestParam(required = false, name = "q") String query) {
        return service.adminIndex(domain, query);
    }

    @GetMapping("/api/admin/experience-tree/situations/{stableKey}/study-links")
    public List<ExperienceTreeResponse.StudyLink> adminLinks(@PathVariable String stableKey) {
        return service.studies(stableKey, true);
    }

    @PostMapping("/api/admin/experience-tree/study-links")
    public ResponseEntity<ExperienceTreeResponse.StudyLink> createLink(
            @Valid @RequestBody DecisionStudyLinkRequest request) {
        return ResponseEntity.status(201).body(service.createLink(request));
    }

    @PutMapping("/api/admin/experience-tree/study-links/{id}")
    public ExperienceTreeResponse.StudyLink updateLink(
            @PathVariable Long id, @Valid @RequestBody DecisionStudyLinkRequest request) {
        return service.updateLink(id, request);
    }

    @DeleteMapping("/api/admin/experience-tree/study-links/{id}")
    public ResponseEntity<Void> deleteLink(@PathVariable Long id) {
        service.deleteLink(id);
        return ResponseEntity.noContent().build();
    }
}
