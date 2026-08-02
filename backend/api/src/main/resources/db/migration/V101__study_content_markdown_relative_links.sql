-- study.content_markdown 안에 개발 환경 절대주소(http://localhost:3000)로 박제된
-- 내부 학습 노트 링크를 상대 경로(/study/...)로 정리한다.
UPDATE `study`
SET `content_markdown` = REPLACE(`content_markdown`, 'http://localhost:3000', '')
WHERE `content_markdown` LIKE '%http://localhost:3000%';
