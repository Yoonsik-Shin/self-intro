package com.selfintro.modules.portfolio.presentation;

import com.selfintro.modules.portfolio.application.PortfolioLayoutService;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioLayoutRequest;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioLayoutResponse;
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
@RequestMapping("/api/admin/portfolio/case-studies/{caseStudyId}/layouts")
@RequiredArgsConstructor
public class PortfolioLayoutController {
    private final PortfolioLayoutService portfolioLayoutService;

    @GetMapping
    public ResponseEntity<List<PortfolioLayoutResponse>> list(@PathVariable Long caseStudyId) {
        return ResponseEntity.ok(portfolioLayoutService.list(caseStudyId));
    }

    @PostMapping
    public ResponseEntity<PortfolioLayoutResponse> create(
            @PathVariable Long caseStudyId, @Valid @RequestBody PortfolioLayoutRequest request) {
        return ResponseEntity.ok(portfolioLayoutService.create(caseStudyId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PortfolioLayoutResponse> update(
            @PathVariable Long caseStudyId,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioLayoutRequest request) {
        return ResponseEntity.ok(portfolioLayoutService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long caseStudyId, @PathVariable Long id) {
        portfolioLayoutService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
