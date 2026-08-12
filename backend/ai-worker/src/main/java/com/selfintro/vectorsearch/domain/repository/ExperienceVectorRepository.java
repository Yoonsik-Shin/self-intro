package com.selfintro.vectorsearch.domain.repository;

import com.selfintro.vectorsearch.domain.entity.ExperienceVector;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExperienceVectorRepository extends JpaRepository<ExperienceVector, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value =
                    "DELETE FROM experience_vector WHERE workspace_id = :workspaceId AND experience_id = :experienceId",
            nativeQuery = true)
    int deleteByWorkspaceIdAndExperienceId(
            @Param("workspaceId") Long workspaceId, @Param("experienceId") Long experienceId);

    @Query(
            value =
                    "SELECT workspace_id AS workspaceId, experience_id AS experienceId "
                            + "FROM experience_vector GROUP BY workspace_id, experience_id",
            nativeQuery = true)
    List<ExperienceVectorReference> findDistinctSourceReferences();

    long countByWorkspaceId(Long workspaceId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value = "DELETE FROM experience_vector WHERE workspace_id = :workspaceId",
            nativeQuery = true)
    int deleteAllByWorkspaceId(@Param("workspaceId") Long workspaceId);

    /**
     * Oracle 26ai Native VECTOR_DISTANCE(embedding_vector, queryVector, COSINE) 기반 가장 코사인 유사도가 높은 내
     * 경험 청크 TOP K 탐색. 거리값도 함께 반환한다(0에 가까울수록 유사).
     */
    @Query(
            value =
                    """
            SELECT e.id AS id, e.experience_id AS experienceId, TO_CHAR(e.chunk_content) AS chunkContent,
                   VECTOR_DISTANCE(e.embedding_vector, :queryVector, COSINE) AS distance
            FROM experience_vector e
            WHERE e.workspace_id = :workspaceId
            ORDER BY distance ASC
            FETCH FIRST :limit ROWS ONLY
            """,
            nativeQuery = true)
    List<ExperienceVectorMatch> findTopSimilarExperienceChunks(
            @Param("workspaceId") Long workspaceId,
            @Param("queryVector") String queryVector,
            @Param("limit") int limit);

    interface ExperienceVectorMatch {
        Long getId();

        Long getExperienceId();

        String getChunkContent();

        Double getDistance();
    }

    interface ExperienceVectorReference {
        Long getWorkspaceId();

        Long getExperienceId();
    }
}
