package com.selfintro.modules.portfolio.presentation;

import com.selfintro.modules.portfolio.application.PortfolioCaseStudyService;
import com.selfintro.modules.portfolio.application.PortfolioLayoutService;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicSummaryResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioLayoutResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/portfolio/case-studies")
@RequiredArgsConstructor
public class PortfolioCaseStudyPublicController {
    private final PortfolioCaseStudyService portfolioCaseStudyService;
    private final PortfolioLayoutService portfolioLayoutService;

    @GetMapping
    public ResponseEntity<List<PortfolioCaseStudyPublicSummaryResponse>> list() {
        return ResponseEntity.ok(portfolioCaseStudyService.listPublished());
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PortfolioCaseStudyPublicResponse> get(@PathVariable String slug) {
        return ResponseEntity.ok(portfolioCaseStudyService.getPublishedBySlug(slug));
    }

    /** 특정 Study를 근거로 인용한 발행된 케이스스터디 목록 — Study 상세 페이지의 역참조 표시용. */
    @GetMapping("/by-study/{studyId}")
    public ResponseEntity<List<PortfolioCaseStudyPublicSummaryResponse>> listByStudy(
            @PathVariable Long studyId) {
        return ResponseEntity.ok(portfolioCaseStudyService.listPublishedByStudyId(studyId));
    }

    /** 방향별 기본 레이아웃. 관리자가 아직 저장한 레이아웃이 없으면 404 — 프론트는 자동 배치로 대체한다. */
    @GetMapping("/{slug}/layout")
    public ResponseEntity<PortfolioLayoutResponse> getDefaultLayout(
            @PathVariable String slug, @RequestParam String orientation) {
        return portfolioLayoutService
                .getDefaultForSlug(slug, orientation)
                .map(ResponseEntity::ok)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "저장된 레이아웃이 없습니다."));
    }
}
