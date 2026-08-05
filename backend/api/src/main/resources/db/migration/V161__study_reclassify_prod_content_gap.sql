-- V160 작성 시 로컬 dev DB(=git 시드 마이그레이션 스냅샷) 기준 study_id로 재분류를 짰는데,
-- 운영 DB는 그 이후 어드민 화면으로 직접 글이 추가/편집되며 study_id가 완전히 벌어져 있었다
-- (예: 로컬 id70 "자발적 태스크포스"가 운영에선 id95, 운영 id70은 아예 다른 글).
-- V160의 EXISTS 가드 덕에 크래시는 안 났지만 존재하지 않는 id라 대부분 조용히 스킵됐을 뿐이라,
-- 운영에 실제로 존재하는 id 기준으로 같은 재분류를 다시 적용한다.
-- (운영 DB에 직접 트랜잭션으로 먼저 검증 후 적용 완료 — 이 파일은 idempotent라 재실행해도 안전.)
-- 재분류: 기존 flat attach 제거 후 실제 내용 기준 재부착
DELETE FROM `study_taxonomy_node` WHERE `study_id` IN
  (95, 96, 97, 98, 100, 105, 106, 107, 108, 109, 110, 113, 119, 120, 121, 122, 153, 154, 155, 156);

INSERT INTO `study_taxonomy_node` (`study_id`, `taxonomy_node_id`)
SELECT m.study_id, tn.`id`
FROM (
    SELECT 95 AS study_id, 'backend-core' AS slug UNION ALL
    SELECT 96, 'engineering-practices' UNION ALL
    SELECT 97, 'backend-core' UNION ALL
    SELECT 98, 'msa-distributed' UNION ALL
    SELECT 100, 'msa-distributed' UNION ALL
    SELECT 105, 'messaging-cache' UNION ALL
    SELECT 106, 'database' UNION ALL
    SELECT 107, 'backend-core' UNION ALL
    SELECT 108, 'database' UNION ALL
    SELECT 109, 'backend-core' UNION ALL
    SELECT 110, 'ai-llm' UNION ALL
    SELECT 113, 'msa-distributed' UNION ALL
    SELECT 119, 'monitoring-ops' UNION ALL
    SELECT 120, 'monitoring-ops' UNION ALL
    SELECT 121, 'database' UNION ALL
    SELECT 122, 'ai-llm' UNION ALL
    SELECT 153, 'monitoring-ops' UNION ALL
    SELECT 154, 'monitoring-ops' UNION ALL
    SELECT 155, 'monitoring-ops' UNION ALL
    SELECT 156, 'monitoring-ops'
) m
JOIN `taxonomy_node` tn ON tn.`slug` = m.slug
WHERE EXISTS (SELECT 1 FROM `study` s WHERE s.`id` = m.study_id);

-- 부가 소속 (기존 primary 유지, 추가만)
INSERT INTO `study_taxonomy_node` (`study_id`, `taxonomy_node_id`)
SELECT m.study_id, tn.`id`
FROM (
    SELECT 112 AS study_id UNION ALL
    SELECT 121
) m
JOIN `taxonomy_node` tn ON tn.`slug` = 'ai-llm'
WHERE EXISTS (SELECT 1 FROM `study` s WHERE s.`id` = m.study_id)
  AND NOT EXISTS (
    SELECT 1 FROM `study_taxonomy_node` x
    WHERE x.`study_id` = m.study_id AND x.`taxonomy_node_id` = tn.`id`
  );

-- 회고 부가 태그
INSERT INTO `study_taxonomy_node` (`study_id`, `taxonomy_node_id`)
SELECT m.study_id, tn.`id`
FROM (
    SELECT 95 AS study_id UNION ALL SELECT 96 UNION ALL SELECT 103 UNION ALL SELECT 104 UNION ALL
    SELECT 110 UNION ALL SELECT 111 UNION ALL SELECT 119 UNION ALL SELECT 153 UNION ALL
    SELECT 154 UNION ALL SELECT 155 UNION ALL SELECT 156
) m
JOIN `taxonomy_node` tn ON tn.`slug` = 'retrospective'
WHERE EXISTS (SELECT 1 FROM `study` s WHERE s.`id` = m.study_id)
  AND NOT EXISTS (
    SELECT 1 FROM `study_taxonomy_node` x
    WHERE x.`study_id` = m.study_id AND x.`taxonomy_node_id` = tn.`id`
  );
