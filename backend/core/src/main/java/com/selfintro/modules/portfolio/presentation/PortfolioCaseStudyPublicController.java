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

/**
 * 콘텐츠(내용) 조회 전용 공개 API. 인쇄/PDF 배치(PrintTemplate, document_type=PORTFOLIO)는
 * 관리자 전용이라 여기에는 없다 — 관리자 화면(포트폴리오 관리 → PDF 템플릿 관리)에서만 다룬다.
 */
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

    /** 특정 Study를 근거로 인용한 발행된 케이스스터디 목록 — 필요 시 다른 화면에서 재사용 가능하도록 유지. */
    @GetMapping("/by-study/{studyId}")
    public ResponseEntity<List<PortfolioCaseStudyPublicSummaryResponse>> listByStudy(
            @PathVariable Long studyId) {
        return ResponseEntity.ok(portfolioCaseStudyService.listPublishedByStudyId(studyId));
    }
}
