package com.selfintro.vectorsearch.domain.repository;

import com.selfintro.vectorsearch.domain.entity.JobPostingVector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface JobPostingVectorRepository extends JpaRepository<JobPostingVector, Long> {

    List<JobPostingVector> findByJobPostingId(Long jobPostingId);

    void deleteByJobPostingId(Long jobPostingId);

    /**
     * Oracle 26ai 내장 VECTOR_DISTANCE 코사인 유사도 검색 쿼리. 거리값도 함께 반환한다(0에 가까울수록 유사).
     */
    @Query(value = """
            SELECT v.id AS id, v.job_posting_id AS jobPostingId, v.chunk_content AS chunkContent,
                   VECTOR_DISTANCE(v.embedding_vector, to_vector(:queryVector), COSINE) AS distance
            FROM job_posting_vector v
            ORDER BY distance ASC
            FETCH FIRST :limit ROWS ONLY
            """, nativeQuery = true)
    List<JobPostingVectorMatch> searchTopKSimilarChunks(@Param("queryVector") String queryVector, @Param("limit") int limit);

    interface JobPostingVectorMatch {
        Long getId();
        Long getJobPostingId();
        String getChunkContent();
        Double getDistance();
    }
}
