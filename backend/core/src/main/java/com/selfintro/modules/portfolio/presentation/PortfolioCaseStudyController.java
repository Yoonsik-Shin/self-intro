package com.selfintro.modules.portfolio.presentation;

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
@RequestMapping("/api/admin/portfolio/case-studies")
@RequiredArgsConstructor
public class PortfolioCaseStudyController {
    private final PortfolioCaseStudyService portfolioCaseStudyService;

    @GetMapping
    public ResponseEntity<List<PortfolioCaseStudyResponse>> list() {
        return ResponseEntity.ok(portfolioCaseStudyService.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PortfolioCaseStudyDetailResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(portfolioCaseStudyService.get(id));
    }

    @PostMapping
    public ResponseEntity<PortfolioCaseStudyResponse> create(
            @Valid @RequestBody PortfolioCaseStudyCreateRequest request) {
        return ResponseEntity.ok(portfolioCaseStudyService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PortfolioCaseStudyResponse> rename(
            @PathVariable Long id, @Valid @RequestBody PortfolioCaseStudyRenameRequest request) {
        return ResponseEntity.ok(portfolioCaseStudyService.rename(id, request.slug(), request.title()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        portfolioCaseStudyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/revisions")
    public ResponseEntity<PortfolioCaseStudyRevisionResponse> saveRevision(
            @PathVariable Long id, @Valid @RequestBody PortfolioCaseStudySaveRevisionRequest request) {
        return ResponseEntity.ok(
                portfolioCaseStudyService.saveRevision(id, request.content(), request.source()));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<PortfolioCaseStudyResponse> publish(
            @PathVariable Long id, @Valid @RequestBody PortfolioCaseStudyPublishRequest request) {
        return ResponseEntity.ok(portfolioCaseStudyService.publish(id, request.revisionId()));
    }

    @PostMapping("/{id}/unpublish")
    public ResponseEntity<PortfolioCaseStudyResponse> unpublish(@PathVariable Long id) {
        return ResponseEntity.ok(portfolioCaseStudyService.unpublish(id));
    }
}
