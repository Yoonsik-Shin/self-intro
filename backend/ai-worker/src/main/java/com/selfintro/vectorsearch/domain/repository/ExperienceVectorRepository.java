package com.selfintro.vectorsearch.domain.repository;

import com.selfintro.vectorsearch.domain.entity.ExperienceVector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExperienceVectorRepository extends JpaRepository<ExperienceVector, Long> {

    void deleteByExperienceId(Long experienceId);

    /**
     * Oracle 26ai Native VECTOR_DISTANCE(embedding_vector, queryVector, COSINE) 기반
     * 가장 코사인 유사도가 높은 내 경험 청크 TOP K 탐색. 거리값도 함께 반환한다(0에 가까울수록 유사).
     */
    @Query(value = """
            SELECT e.id AS id, e.experience_id AS experienceId, e.chunk_content AS chunkContent,
                   VECTOR_DISTANCE(e.embedding_vector, :queryVector, COSINE) AS distance
            FROM experience_vector e
            ORDER BY distance ASC
            FETCH FIRST :limit ROWS ONLY
            """, nativeQuery = true)
    List<ExperienceVectorMatch> findTopSimilarExperienceChunks(
            @Param("queryVector") String queryVector,
            @Param("limit") int limit
    );

    interface ExperienceVectorMatch {
        Long getId();
        Long getExperienceId();
        String getChunkContent();
        Double getDistance();
    }
}
