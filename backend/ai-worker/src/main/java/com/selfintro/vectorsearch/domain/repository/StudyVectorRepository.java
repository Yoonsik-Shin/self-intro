package com.selfintro.vectorsearch.domain.repository;

import com.selfintro.vectorsearch.domain.entity.StudyVector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StudyVectorRepository extends JpaRepository<StudyVector, Long> {

    void deleteByStudyId(Long studyId);

    /**
     * Oracle 26ai Native VECTOR_DISTANCE(embedding_vector, queryVector, COSINE) 기반
     * 가장 코사인 유사도가 높은 스터디 마크다운 청크 TOP K 탐색
     */
    @Query(value = """
            SELECT * FROM study_vector s
            ORDER BY VECTOR_DISTANCE(s.embedding_vector, :queryVector, COSINE) ASC
            FETCH FIRST :limit ROWS ONLY
            """, nativeQuery = true)
    List<StudyVector> findTopSimilarStudyChunks(
            @Param("queryVector") String queryVector,
            @Param("limit") int limit
    );
}
