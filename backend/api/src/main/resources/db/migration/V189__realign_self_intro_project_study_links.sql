-- V188에서 기존 사람인 수집 사례(id=39)를 RAG 사례로 재구성했으므로
-- 이전 헤드리스 브라우저 학습 연결을 실제 RAG 구현 노트로 교체한다.

DELETE sed
FROM study_experience_detail sed
JOIN study s ON s.id = sed.study_id
WHERE sed.experience_detail_id = 39
  AND s.slug = 'headless-browser-spa-job-posting-scraping';

INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 39
FROM study s
WHERE s.slug = 'rag-contextual-chunking-hybrid-search-oracle-26ai-pipeline'
  AND NOT EXISTS (
      SELECT 1
      FROM study_experience_detail existing
      WHERE existing.study_id = s.id
        AND existing.experience_detail_id = 39
  );
