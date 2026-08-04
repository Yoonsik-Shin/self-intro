-- RabbitMQ, Oracle ATP 기술 스택 등록.
-- 실제 backend/backend-worker 간 메시징(RabbitMQ)과 채용공고 읽기 모델 저장소(Oracle ATP)로
-- 프로젝트에서 실사용 중인데 skill 테이블에 빠져있었음. Prometheus exporter 모니터링 구축
-- 스터디(rabbitmq-mysql-oracle-atp-exporter-setup)와도 연결합니다.

INSERT INTO `skill` (`name`, `category`, `skill_level`, `is_core`, `display_order`, `usage_type`, `skill_comment`, `badge_key`, `badge_color`)
VALUES
  ('RabbitMQ', 'DEVOPS', '중급', 1, 72, 'PROJECT_USE', 'backend와 backend-worker 간 비동기 메시징에 사용', 'rabbitmq', 'FF6600'),
  ('Oracle', 'DATABASE', '중급', 1, 73, 'PROJECT_USE', '채용공고 읽기 모델(CQRS) 저장소로 Oracle Autonomous Database 사용', 'oracle', 'F80000');

INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT s.`id`, sk.`id`
FROM `study` s
JOIN `skill` sk ON sk.`name` IN ('RabbitMQ', 'Oracle')
WHERE s.`slug` = 'rabbitmq-mysql-oracle-atp-exporter-setup'
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;
