-- V188에서 기존 사람인 수집 사례를 RAG 사례로 재구성했으므로
-- 이전 헤드리스 브라우저 학습 연결을 실제 RAG 구현 노트로 교체한다.

SET @v189_rag_detail_id = (
    SELECT id
    FROM experience_detail
    WHERE experience_id = 21
      AND content = '경력 근거를 선별해 지원 문서를 생성하는 공용 RAG 파이프라인'
    ORDER BY id
    LIMIT 1
);

DELETE sed
FROM study_experience_detail sed
JOIN study s ON s.id = sed.study_id
WHERE sed.experience_detail_id = @v189_rag_detail_id
  AND s.slug = 'headless-browser-spa-job-posting-scraping';

INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, @v189_rag_detail_id
FROM study s
WHERE s.slug = 'rag-contextual-chunking-hybrid-search-oracle-26ai-pipeline'
  AND @v189_rag_detail_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM study_experience_detail existing
      WHERE existing.study_id = s.id
        AND existing.experience_detail_id = @v189_rag_detail_id
  );
