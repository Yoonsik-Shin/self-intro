package com.selfintro.vectorsearch.domain.repository;

import com.selfintro.vectorsearch.domain.entity.StudyVector;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudyVectorRepository extends JpaRepository<StudyVector, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value =
                    "DELETE FROM study_vector WHERE workspace_id = :workspaceId AND study_id = :studyId",
            nativeQuery = true)
    int deleteByWorkspaceIdAndStudyId(
            @Param("workspaceId") Long workspaceId, @Param("studyId") Long studyId);

    @Query(
            value =
                    "SELECT workspace_id AS workspaceId, study_id AS studyId "
                            + "FROM study_vector GROUP BY workspace_id, study_id",
            nativeQuery = true)
    List<StudyVectorReference> findDistinctSourceReferences();

    long countByWorkspaceId(Long workspaceId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "DELETE FROM study_vector WHERE workspace_id = :workspaceId", nativeQuery = true)
    int deleteAllByWorkspaceId(@Param("workspaceId") Long workspaceId);

    /**
     * Oracle 26ai Native VECTOR_DISTANCE(embedding_vector, queryVector, COSINE) 기반 가장 코사인 유사도가 높은
     * 스터디 마크다운 청크 TOP K 탐색. 거리값도 함께 반환한다(0에 가까울수록 유사).
     */
    @Query(
            value =
                    """
            SELECT s.id AS id, s.study_id AS studyId, TO_CHAR(s.chunk_content) AS chunkContent,
                   VECTOR_DISTANCE(s.embedding_vector, :queryVector, COSINE) AS distance
            FROM study_vector s
            WHERE s.workspace_id = :workspaceId
            ORDER BY distance ASC
            FETCH FIRST :limit ROWS ONLY
            """,
            nativeQuery = true)
    List<StudyVectorMatch> findTopSimilarStudyChunks(
            @Param("workspaceId") Long workspaceId,
            @Param("queryVector") String queryVector,
            @Param("limit") int limit);

    interface StudyVectorMatch {
        Long getId();

        Long getStudyId();

        String getChunkContent();

        Double getDistance();
    }

    interface StudyVectorReference {
        Long getWorkspaceId();

        Long getStudyId();
    }
}
