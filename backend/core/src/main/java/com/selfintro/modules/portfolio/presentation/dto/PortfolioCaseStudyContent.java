package com.selfintro.modules.portfolio.presentation.dto;

import java.util.List;

/**
 * 포트폴리오 케이스스터디 본문 스키마 — "문제 인식 → 고민/트레이드오프 → 해결 → 성과" 구조. {@code
 * PortfolioCaseStudyRevision.contentJson}에 그대로 직렬화되고, AI 생성 2단계 응답과 관리자 수동 편집 양쪽에서 동일하게 쓴다.
 */
public record PortfolioCaseStudyContent(
        String summary,
        String problem,
        String thoughtProcess,
        List<Tradeoff> tradeoffs,
        String solution,
        Outcome outcome,
        Architecture architecture,
        List<Long> sourceStudyIds,
        List<Long> sourceExperienceDetailIds) {

    public record Tradeoff(String option, String pros, String cons, String chosenBecause) {}

    public record Outcome(String summary, List<Metric> metrics) {
        public record Metric(String label, String before, String after) {}
    }

    public record Architecture(String mermaidSource, List<String> imageObjectKeys) {}
}
