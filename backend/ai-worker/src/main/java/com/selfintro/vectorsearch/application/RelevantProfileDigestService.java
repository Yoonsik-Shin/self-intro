package com.selfintro.vectorsearch.application;

import com.selfintro.jobposting.application.HybridSearchService;
import com.selfintro.jobposting.application.HybridSearchService.HybridMatchResult;
import com.selfintro.jobposting.application.QueryKeywordExtractionService;
import com.selfintro.modules.identity.application.CurrentWorkspaceService;
import com.selfintro.vectorsearch.application.ProfileVectorSearchPort.ExperienceMatch;
import com.selfintro.vectorsearch.domain.repository.StudyVectorRepository.StudyVectorMatch;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * 프로필 전체를 덤프하는 대신, 쿼리 텍스트와 하이브리드 검색(벡터+키워드)으로 가장 관련도 높은 경험/스터디 청크만 골라 프롬프트에 넣는 공통 로직. 원래 {@code
 * CoverLetterDraftAiService}에만 있던 RAG 파이프라인을 다른 AI 기능에서도 재사용할 수 있도록 뽑아냈다.
 */
@Service
@RequiredArgsConstructor
public class RelevantProfileDigestService {

    private final HybridSearchService hybridSearchService;
    private final QueryKeywordExtractionService queryKeywordExtractionService;
    private final CurrentWorkspaceService currentWorkspaceService;

    public record TopK(int experienceTopK, int studyTopK) {}

    public record RelevantMatches(
            List<HybridMatchResult<ExperienceMatch>> experiences,
            List<HybridMatchResult<StudyVectorMatch>> studies) {
        public boolean isEmpty() {
            return experiences.isEmpty() && studies.isEmpty();
        }
    }

    /** queryText가 비어 있으면 임베딩/키워드추출 자체를 생략하고 빈 결과를 반환한다. */
    public RelevantMatches search(String queryText, TopK topK) {
        Long workspaceId =
                currentWorkspaceService
                        .requireDefaultMembership(
                                SecurityContextHolder.getContext().getAuthentication())
                        .getWorkspace()
                        .getId();
        return search(workspaceId, queryText, topK);
    }

    /** 명시적으로 검증된 Workspace 범위에서만 관련 프로필을 검색한다. */
    public RelevantMatches search(Long workspaceId, String queryText, TopK topK) {
        if (queryText == null || queryText.isBlank()) {
            return new RelevantMatches(List.of(), List.of());
        }

        List<String> keywords = queryKeywordExtractionService.extract(queryText);
        List<HybridMatchResult<ExperienceMatch>> experiences =
                topK.experienceTopK() > 0
                        ? hybridSearchService.searchTopSimilarExperiences(
                                workspaceId, queryText, keywords, topK.experienceTopK())
                        : List.of();
        // Study/competency에는 아직 workspace 소유권이 완성되지 않았다. 전역 벡터를 섞는 것보다
        // 검색 대상에서 제외하는 편이 안전하다. workspace_id 이관 후 다시 활성화한다.
        List<HybridMatchResult<StudyVectorMatch>> studies = List.of();
        return new RelevantMatches(experiences, studies);
    }

    /**
     * 검색 결과가 비어 있어도 전역 프로필 덤프로 폴백하지 않는다. Workspace 소유권이 검증되지 않은 데이터를 AI 프롬프트에 넣는 것보다 빈 근거로 안전하게
     * 실패하는 것이 우선이다.
     */
    public String toDigest(RelevantMatches matches) {
        if (matches.isEmpty()) {
            return "워크스페이스에서 확인된 관련 경력 근거가 없습니다.";
        }

        StringBuilder sb = new StringBuilder();
        if (!matches.experiences().isEmpty()) {
            sb.append("### 관련 경력/프로젝트\n");
            for (HybridMatchResult<ExperienceMatch> match : matches.experiences()) {
                sb.append(match.matchedChunk()).append("\n\n");
            }
        }
        if (!matches.studies().isEmpty()) {
            sb.append("### 관련 학습/공부\n");
            for (HybridMatchResult<StudyVectorMatch> match : matches.studies()) {
                sb.append(match.matchedChunk()).append("\n\n");
            }
        }
        return sb.toString();
    }

    /** 텍스트 프롬프트용 편의 메서드({@code search()} + {@code toDigest()}) — 대부분의 호출자가 이걸 쓴다. */
    public String buildDigest(String queryText, TopK topK) {
        return toDigest(search(queryText, topK));
    }

    public String buildDigest(Long workspaceId, String queryText, TopK topK) {
        return toDigest(search(workspaceId, queryText, topK));
    }
}
