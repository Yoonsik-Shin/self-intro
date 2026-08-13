-- Removes only records created by seed-output-preview-demo.sql.
SET @workspace_slug = _utf8mb4'w-c615a2e49bd84088bf51' COLLATE utf8mb4_unicode_ci;
SET @workspace_id = (SELECT id FROM workspace WHERE slug = @workspace_slug LIMIT 1);

START TRANSACTION;

DELETE FROM competency
WHERE workspace_id = @workspace_id
  AND title = '[DEMO] 장애를 구조 개선으로 전환하는 역량';

DELETE FROM experience
WHERE workspace_id = @workspace_id
  AND title = '[DEMO] 비동기 학습 처리 프로젝트';

DELETE FROM experience
WHERE workspace_id = @workspace_id
  AND title = '[DEMO] 백엔드 플랫폼 엔지니어';

DELETE FROM workspace_skill
WHERE workspace_id = @workspace_id
  AND skill_comment = '[DEMO OUTPUT PREVIEW]';

COMMIT;
