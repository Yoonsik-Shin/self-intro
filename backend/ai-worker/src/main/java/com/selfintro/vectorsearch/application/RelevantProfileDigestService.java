package com.selfintro.vectorsearch.application;

import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.jobposting.application.HybridSearchService;
import com.selfintro.jobposting.application.HybridSearchService.HybridMatchResult;
import com.selfintro.jobposting.application.QueryKeywordExtractionService;
import com.selfintro.vectorsearch.domain.repository.ExperienceVectorRepository.ExperienceVectorMatch;
import com.selfintro.vectorsearch.domain.repository.StudyVectorRepository.StudyVectorMatch;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 프로필 전체를 덤프하는 대신, 쿼리 텍스트와 하이브리드 검색(벡터+키워드)으로 가장 관련도 높은 경험/스터디 청크만 골라 프롬프트에 넣는 공통 로직.
 * 원래 {@code CoverLetterDraftAiService}에만 있던 RAG 파이프라인을 다른 AI 기능에서도 재사용할 수 있도록 뽑아냈다.
 */
@Service
@RequiredArgsConstructor
public class RelevantProfileDigestService {

    private final CareerProfileDigestBuilder careerProfileDigestBuilder;
    private final HybridSearchService hybridSearchService;
    private final QueryKeywordExtractionService queryKeywordExtractionService;

    public record TopK(int experienceTopK, int studyTopK) {}

    public record RelevantMatches(
            List<HybridMatchResult<ExperienceVectorMatch>> experiences,
            List<HybridMatchResult<StudyVectorMatch>> studies) {
        public boolean isEmpty() {
            return experiences.isEmpty() && studies.isEmpty();
        }
    }

    /**
     * queryText가 비어 있으면 임베딩/키워드추출 자체를 생략하고 빈 결과를 반환한다.
     */
    public RelevantMatches search(String queryText, TopK topK) {
        if (queryText == null || queryText.isBlank()) {
            return new RelevantMatches(List.of(), List.of());
        }

        List<String> keywords = queryKeywordExtractionService.extract(queryText);
        List<HybridMatchResult<ExperienceVectorMatch>> experiences =
                topK.experienceTopK() > 0
                        ? hybridSearchService.searchTopSimilarExperiences(
                                queryText, keywords, topK.experienceTopK())
                        : List.of();
        List<HybridMatchResult<StudyVectorMatch>> studies =
                topK.studyTopK() > 0
                        ? hybridSearchService.searchTopSimilarStudies(queryText, keywords, topK.studyTopK())
                        : List.of();
        return new RelevantMatches(experiences, studies);
    }

    /**
     * 검색 결과가 비어 있으면(백필 전 등) {@link CareerProfileDigestBuilder#build()}로 전체 덤프 폴백한다. 그 외엔 검색된
     * 청크 + 항상 전체 포함되는 핵심역량({@link CareerProfileDigestBuilder#buildCompetencyDigest()})을 이어붙인다.
     */
    public String toDigest(RelevantMatches matches) {
        if (matches.isEmpty()) {
            return careerProfileDigestBuilder.build();
        }

        StringBuilder sb = new StringBuilder();
        if (!matches.experiences().isEmpty()) {
            sb.append("### 관련 경력/프로젝트\n");
            for (HybridMatchResult<ExperienceVectorMatch> match : matches.experiences()) {
                sb.append(match.matchedChunk()).append("\n\n");
            }
        }
        if (!matches.studies().isEmpty()) {
            sb.append("### 관련 학습/공부\n");
            for (HybridMatchResult<StudyVectorMatch> match : matches.studies()) {
                sb.append(match.matchedChunk()).append("\n\n");
            }
        }
        sb.append(careerProfileDigestBuilder.buildCompetencyDigest());
        return sb.toString();
    }

    /**
     * 텍스트 프롬프트용 편의 메서드({@code search()} + {@code toDigest()}) — 대부분의 호출자가 이걸 쓴다.
     */
    public String buildDigest(String queryText, TopK topK) {
        return toDigest(search(queryText, topK));
    }
}
