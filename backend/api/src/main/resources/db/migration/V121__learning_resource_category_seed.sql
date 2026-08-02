INSERT INTO `learning_resource_category` (`name`, `slug`, `display_order`) VALUES
('이력서/면접/커리어', 'resume-interview-career', 1),
('CS 기초', 'cs-basics', 2),
('백엔드 코어', 'backend-core', 3),
('데이터베이스', 'database', 4),
('인프라/DevOps', 'infra-devops', 5),
('메시징/캐시', 'messaging-cache', 6),
('MSA/분산시스템', 'msa-distributed', 7),
('AI/LLM', 'ai-llm', 8),
('프론트엔드', 'frontend', 9),
('테스트/성능', 'test-performance', 10),
('모니터링/운영', 'monitoring-ops', 11),
('코드품질/설계', 'code-quality-design', 12),
('데이터 엔지니어링', 'data-engineering', 13),
('협업도구', 'collaboration-tools', 14),
('기타(수학/게임/UX 등)', 'etc-math-game-ux', 15);

UPDATE `learning_resource_category` SET `display_order` = 99 WHERE `slug` = 'uncategorized';
