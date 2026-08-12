package com.selfintro.vectorsearch.application;

import java.util.List;

/**
 * Workspace 경력 검색의 클라우드 중립 경계. Oracle VECTOR_DISTANCE, pgvector, OpenSearch 등 실제 검색 엔진의 SQL/SDK는 이
 * 포트 바깥의 adapter에만 존재해야 한다.
 */
public interface ProfileVectorSearchPort {

    List<ExperienceMatch> findTopSimilarExperienceChunks(
            Long workspaceId, String queryVector, int limit);

    record ExperienceMatch(Long id, Long experienceId, String chunkContent, Double distance) {

        /** Legacy projection compatibility while callers migrate to record accessors. */
        public Long getExperienceId() {
            return experienceId;
        }
    }
}
