-- 자격증 카테고리 제외 (attach 없음)
DELETE FROM `taxonomy_node` WHERE `slug` = 'certificate';

-- 새 최상위 그룹 2개
INSERT INTO `taxonomy_node` (`name`, `slug`, `display_order`, `parent_id`) VALUES
  ('엔지니어링 실무', 'engineering-practices', 16, NULL),
  ('커리어', 'career', 17, NULL);

-- V159로 전부 top-level 이관됐던 노드들을 실제 내용 기준 계층으로 재배치
UPDATE `taxonomy_node` c
JOIN `taxonomy_node` p ON p.`slug` = 'backend'
SET c.`parent_id` = p.`id`
WHERE c.`slug` IN ('backend-core', 'database', 'messaging-cache', 'msa-distributed');

UPDATE `taxonomy_node` c
JOIN `taxonomy_node` p ON p.`slug` = 'devops'
SET c.`parent_id` = p.`id`
WHERE c.`slug` = 'monitoring-ops';

UPDATE `taxonomy_node` c
JOIN `taxonomy_node` p ON p.`slug` = 'ai-rag'
SET c.`parent_id` = p.`id`
WHERE c.`slug` = 'ai-llm';

UPDATE `taxonomy_node` c
JOIN `taxonomy_node` p ON p.`slug` = 'engineering-practices'
SET c.`parent_id` = p.`id`
WHERE c.`slug` IN ('test-performance', 'code-quality-design', 'collaboration-tools');

UPDATE `taxonomy_node` c
JOIN `taxonomy_node` p ON p.`slug` = 'career'
SET c.`parent_id` = p.`id`
WHERE c.`slug` IN ('project', 'education', 'retrospective', 'resume-interview-career', 'cs-basics');

-- 기존 study 단일 category(1:1 이관값)를 실제 내용 기준으로 재분류.
-- V159 직후엔 study 하나당 정확히 1개 attach만 있었으므로 안전하게 지우고 다시 넣는다.
DELETE FROM `study_taxonomy_node` WHERE `study_id` IN
  (1, 2, 3, 4, 8, 11, 13, 14, 15, 16, 17, 30, 31, 34, 70, 71, 72, 73, 75, 79, 80, 81, 82, 83,
   86, 87, 88, 89, 90, 91, 92, 93, 94);

INSERT INTO `study_taxonomy_node` (`study_id`, `taxonomy_node_id`)
SELECT m.study_id, tn.`id`
FROM (
    SELECT 1 AS study_id, 'ai-llm' AS slug UNION ALL
    SELECT 2, 'messaging-cache' UNION ALL
    SELECT 3, 'database' UNION ALL
    SELECT 4, 'backend-core' UNION ALL
    SELECT 8, 'backend-core' UNION ALL
    SELECT 11, 'devops' UNION ALL
    SELECT 13, 'backend-core' UNION ALL
    SELECT 14, 'backend-core' UNION ALL
    SELECT 15, 'backend-core' UNION ALL
    SELECT 16, 'devops' UNION ALL
    SELECT 17, 'monitoring-ops' UNION ALL
    SELECT 30, 'backend-core' UNION ALL
    SELECT 31, 'ai-llm' UNION ALL
    SELECT 34, 'backend-core' UNION ALL
    SELECT 70, 'backend-core' UNION ALL
    SELECT 71, 'engineering-practices' UNION ALL
    SELECT 72, 'backend-core' UNION ALL
    SELECT 73, 'msa-distributed' UNION ALL
    SELECT 75, 'msa-distributed' UNION ALL
    SELECT 79, 'messaging-cache' UNION ALL
    SELECT 80, 'database' UNION ALL
    SELECT 81, 'backend-core' UNION ALL
    SELECT 82, 'database' UNION ALL
    SELECT 83, 'ai-llm' UNION ALL
    SELECT 86, 'msa-distributed' UNION ALL
    SELECT 87, 'monitoring-ops' UNION ALL
    SELECT 88, 'monitoring-ops' UNION ALL
    SELECT 89, 'database' UNION ALL
    SELECT 90, 'ai-llm' UNION ALL
    SELECT 91, 'monitoring-ops' UNION ALL
    SELECT 92, 'monitoring-ops' UNION ALL
    SELECT 93, 'monitoring-ops' UNION ALL
    SELECT 94, 'monitoring-ops'
) m
JOIN `taxonomy_node` tn ON tn.`slug` = m.slug
-- 환경마다 실제 존재하는 study 콘텐츠가 다를 수 있어(로컬 dev DB와 운영 DB는 별개 데이터),
-- 해당 study_id가 실제로 있는 경우에만 적용한다 (FK 위반으로 마이그레이션 전체가 실패하는 것을 방지).
WHERE EXISTS (SELECT 1 FROM `study` s WHERE s.`id` = m.study_id);

-- 부가 소속 (기존 primary는 유지한 채 추가)
INSERT INTO `study_taxonomy_node` (`study_id`, `taxonomy_node_id`)
SELECT m.study_id, tn.`id`
FROM (
    SELECT 85 AS study_id UNION ALL
    SELECT 89
) m
JOIN `taxonomy_node` tn ON tn.`slug` = 'ai-llm'
WHERE EXISTS (SELECT 1 FROM `study` s WHERE s.`id` = m.study_id);

-- 회고 부가 태그 (트러블슈팅/포스트모템 성격 강한 글)
INSERT INTO `study_taxonomy_node` (`study_id`, `taxonomy_node_id`)
SELECT m.study_id, tn.`id`
FROM (
    SELECT 4 AS study_id UNION ALL SELECT 70 UNION ALL SELECT 71 UNION ALL SELECT 77 UNION ALL
    SELECT 78 UNION ALL SELECT 83 UNION ALL SELECT 84 UNION ALL SELECT 87 UNION ALL
    SELECT 91 UNION ALL SELECT 92 UNION ALL SELECT 93 UNION ALL SELECT 94
) m
JOIN `taxonomy_node` tn ON tn.`slug` = 'retrospective'
WHERE EXISTS (SELECT 1 FROM `study` s WHERE s.`id` = m.study_id);
