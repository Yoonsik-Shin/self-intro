package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingVector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface JobPostingVectorRepository extends JpaRepository<JobPostingVector, Long> {

    List<JobPostingVector> findByJobPostingId(Long jobPostingId);

    void deleteByJobPostingId(Long jobPostingId);

    /**
     * Oracle 26ai 내장 VECTOR_DISTANCE 코사인 유사도 검색 쿼리
     * VECTOR_DISTANCE(v.embedding_vector, to_vector(:queryVector), COSINE)
     * 거리(Distance)가 0에 가까울수록 가장 유사한 채용공고/자가소개서 항목입니다.
     */
    @Query(value = "SELECT v.* FROM job_posting_vector v " +
                   "ORDER BY VECTOR_DISTANCE(v.embedding_vector, to_vector(:queryVector), COSINE) ASC " +
                   "FETCH FIRST :limit ROWS ONLY", nativeQuery = true)
    List<JobPostingVector> searchTopKSimilarChunks(@Param("queryVector") String queryVector, @Param("limit") int limit);
}
