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

    /**
     * {@code imageUrls}는 저장/AI 생성 시점에는 비어있고, {@code PortfolioCaseStudyService}가 응답을 만들 때만 {@code
     * imageObjectKeys}를 공개 URL로 해석해 채워 넣는다 — content_json에는 절대 저장하지 않는다(스토리지 설정이 바뀌어도 저장된 데이터가 오염되지
     * 않게 하기 위함).
     */
    public record Architecture(
            String mermaidSource, List<String> imageObjectKeys, List<String> imageUrls) {}
}
