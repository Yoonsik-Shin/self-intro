-- V11 changed ordered join-table keys to (parent_id, list_order).
-- Add catalog-cleanup relations with deterministic, collision-free positions.
INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT existing.experience_id, sqs.id, 231
FROM experience_skill existing
JOIN skill ecs ON ecs.id = existing.skill_id AND ecs.name = 'AWS ECS'
JOIN skill sqs ON sqs.name = 'Amazon SQS'
WHERE NOT EXISTS (
    SELECT 1 FROM experience_skill linked
    WHERE linked.experience_id = existing.experience_id AND linked.skill_id = sqs.id
);

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT existing.experience_detail_id, sqs.id, 231
FROM experience_detail_skill existing
JOIN skill ecs ON ecs.id = existing.skill_id AND ecs.name = 'AWS ECS'
JOIN skill sqs ON sqs.name = 'Amazon SQS'
WHERE NOT EXISTS (
    SELECT 1 FROM experience_detail_skill linked
    WHERE linked.experience_detail_id = existing.experience_detail_id AND linked.skill_id = sqs.id
);

INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 200 + s.display_order
FROM experience e
JOIN skill s ON s.name = 'PostgreSQL'
WHERE e.title LIKE '%고객문의%'
  AND NOT EXISTS (SELECT 1 FROM experience_skill linked WHERE linked.experience_id = e.id AND linked.skill_id = s.id);

INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 200 + s.display_order
FROM experience e
JOIN skill s ON s.name IN ('Spring Data JPA', 'Spring Security')
WHERE (e.title LIKE '%고객문의%' OR e.type = 'CAREER')
  AND NOT EXISTS (SELECT 1 FROM experience_skill linked WHERE linked.experience_id = e.id AND linked.skill_id = s.id);

INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 200 + s.display_order
FROM experience e
JOIN skill s ON s.name IN ('MySQL', 'GitHub Actions')
WHERE e.type = 'CAREER'
  AND NOT EXISTS (SELECT 1 FROM experience_skill linked WHERE linked.experience_id = e.id AND linked.skill_id = s.id);

INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 200 + s.display_order
FROM experience e
JOIN skill s ON s.name IN ('gRPC', 'Apache Kafka')
WHERE e.title LIKE '%면접%'
  AND NOT EXISTS (SELECT 1 FROM experience_skill linked WHERE linked.experience_id = e.id AND linked.skill_id = s.id);

INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 200 + s.display_order
FROM experience e
JOIN skill s ON s.name IN ('KQL', 'Azure Log Analytics')
WHERE (e.title LIKE '%LogDoctor%' OR e.title LIKE '%로그 비용%')
  AND NOT EXISTS (SELECT 1 FROM experience_skill linked WHERE linked.experience_id = e.id AND linked.skill_id = s.id);

INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 241
FROM experience e
JOIN skill s ON s.name = 'Machine Learning / Deep Learning'
WHERE e.title LIKE '%빅데이터%'
  AND NOT EXISTS (SELECT 1 FROM experience_skill linked WHERE linked.experience_id = e.id AND linked.skill_id = s.id);

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT ed.id, s.id, 200 + s.display_order
FROM experience_detail ed
JOIN skill s ON s.name IN ('Spring Data JPA', 'Spring Security', 'MySQL')
WHERE ed.content LIKE '%Spring Boot%'
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail_skill linked
      WHERE linked.experience_detail_id = ed.id AND linked.skill_id = s.id
  );

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT ed.id, s.id, 200 + s.display_order
FROM experience_detail ed
JOIN skill s ON s.name IN ('KQL', 'Azure Log Analytics')
WHERE (ed.content LIKE '%KQL%' OR ed.action_detail LIKE '%KQL%')
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail_skill linked
      WHERE linked.experience_detail_id = ed.id AND linked.skill_id = s.id
  );
