package com.selfintro.jobposting.application;

import com.selfintro.global.ai.AiJsonSupport;

/**
 * 채용공고 제목/담당업무/자격요건/우대사항을 하이브리드 검색 쿼리 텍스트로 이어붙이는 공통 로직. {@code CoverLetterDraftAiService}에만
 * 있던 조립 로직을 다른 공고 기반 AI 기능(Appeal 분석, 보완 프로젝트 추천, PDF 초안)에서도 재사용하기 위해 뽑아냈다.
 */
public final class JobPostingRetrievalQueryText {

    private JobPostingRetrievalQueryText() {}

    public static String build(
            String title, String jobDescription, String requiredQualifications, String preferredQualifications) {
        StringBuilder sb = new StringBuilder();
        if (AiJsonSupport.hasText(title)) {
            sb.append(title).append(" ");
        }
        if (AiJsonSupport.hasText(jobDescription)) {
            sb.append(jobDescription).append(" ");
        }
        if (AiJsonSupport.hasText(requiredQualifications)) {
            sb.append(requiredQualifications).append(" ");
        }
        if (AiJsonSupport.hasText(preferredQualifications)) {
            sb.append(preferredQualifications);
        }
        return sb.toString();
    }
}
