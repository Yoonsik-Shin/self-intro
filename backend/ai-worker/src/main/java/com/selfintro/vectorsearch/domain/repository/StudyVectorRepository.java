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
     * 가장 코사인 유사도가 높은 스터디 마크다운 청크 TOP K 탐색. 거리값도 함께 반환한다(0에 가까울수록 유사).
     */
    @Query(value = """
            SELECT s.id AS id, s.study_id AS studyId, s.chunk_content AS chunkContent,
                   VECTOR_DISTANCE(s.embedding_vector, :queryVector, COSINE) AS distance
            FROM study_vector s
            ORDER BY distance ASC
            FETCH FIRST :limit ROWS ONLY
            """, nativeQuery = true)
    List<StudyVectorMatch> findTopSimilarStudyChunks(
            @Param("queryVector") String queryVector,
            @Param("limit") int limit
    );

    interface StudyVectorMatch {
        Long getId();
        Long getStudyId();
        String getChunkContent();
        Double getDistance();
    }
}
