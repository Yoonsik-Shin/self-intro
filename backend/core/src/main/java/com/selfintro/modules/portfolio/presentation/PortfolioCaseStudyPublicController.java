package com.selfintro.modules.portfolio.presentation;

import com.selfintro.modules.portfolio.application.PortfolioCaseStudyService;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicSummaryResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/portfolio/case-studies")
@RequiredArgsConstructor
public class PortfolioCaseStudyPublicController {
    private final PortfolioCaseStudyService portfolioCaseStudyService;

    @GetMapping
    public ResponseEntity<List<PortfolioCaseStudyPublicSummaryResponse>> list() {
        return ResponseEntity.ok(portfolioCaseStudyService.listPublished());
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PortfolioCaseStudyPublicResponse> get(@PathVariable String slug) {
        return ResponseEntity.ok(portfolioCaseStudyService.getPublishedBySlug(slug));
    }
}
