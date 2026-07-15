-- Split the previously compressed AWS entry while preserving every existing relation.
UPDATE skill
SET name = 'AWS ECS',
    skill_comment = '컨테이너 기반 서비스 배포 및 운영',
    badge_key = 'amazonecs',
    badge_color = 'FF9900'
WHERE name = 'AWS ECS/SQS';

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'Amazon SQS', 'DEVOPS', '중급', NULL, '비동기 메시징 및 외부 AI 서버 연동', 'WORK_EXPERIENCE',
       'amazonsqs', 'FF4F8B', FALSE, 31
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'Amazon SQS');

INSERT IGNORE INTO experience_skill (experience_id, skill_id, list_order)
SELECT es.experience_id, sqs.id, es.list_order + 1
FROM experience_skill es
JOIN skill ecs ON ecs.id = es.skill_id AND ecs.name = 'AWS ECS'
JOIN skill sqs ON sqs.name = 'Amazon SQS';

INSERT IGNORE INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT eds.experience_detail_id, sqs.id, eds.list_order + 1
FROM experience_detail_skill eds
JOIN skill ecs ON ecs.id = eds.skill_id AND ecs.name = 'AWS ECS'
JOIN skill sqs ON sqs.name = 'Amazon SQS';

INSERT IGNORE INTO study_skill (study_id, skill_id)
SELECT ss.study_id, sqs.id
FROM study_skill ss
JOIN skill ecs ON ecs.id = ss.skill_id AND ecs.name = 'AWS ECS'
JOIN skill sqs ON sqs.name = 'Amazon SQS';

-- Normalize ambiguous names and categories.
UPDATE skill SET name = 'Database Modeling' WHERE name = 'DB Modeling';
UPDATE skill SET name = 'SQL Query Optimization' WHERE name = 'Optimization';
UPDATE skill SET name = 'Infrastructure as Code (IaC)' WHERE name = 'IaC';
UPDATE skill SET category = 'FRAMEWORK' WHERE name IN ('QueryDSL', 'Teams SDK');
UPDATE skill SET category = 'DEVOPS' WHERE name IN ('Azure', 'Git');
UPDATE skill SET is_core = FALSE WHERE name IN ('Express', 'React', 'Azure Functions');

-- Merge overlapping machine-learning entries into a single technology.
UPDATE skill
SET name = 'Machine Learning / Deep Learning',
    skill_level = '중급',
    skill_comment = '머신러닝·딥러닝 기초 학습 및 데이터 분석 적용'
WHERE name = 'ML/DL';

INSERT IGNORE INTO experience_skill (experience_id, skill_id, list_order)
SELECT source_rel.experience_id, target.id, source_rel.list_order
FROM experience_skill source_rel
JOIN skill source ON source.id = source_rel.skill_id AND source.name = 'Machine Learning'
JOIN skill target ON target.name = 'Machine Learning / Deep Learning';

INSERT IGNORE INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT source_rel.experience_detail_id, target.id, source_rel.list_order
FROM experience_detail_skill source_rel
JOIN skill source ON source.id = source_rel.skill_id AND source.name = 'Machine Learning'
JOIN skill target ON target.name = 'Machine Learning / Deep Learning';

INSERT IGNORE INTO study_skill (study_id, skill_id)
SELECT source_rel.study_id, target.id
FROM study_skill source_rel
JOIN skill source ON source.id = source_rel.skill_id AND source.name = 'Machine Learning'
JOIN skill target ON target.name = 'Machine Learning / Deep Learning';

DELETE es FROM experience_skill es JOIN skill source ON source.id = es.skill_id WHERE source.name = 'Machine Learning';
DELETE eds FROM experience_detail_skill eds JOIN skill source ON source.id = eds.skill_id WHERE source.name = 'Machine Learning';
DELETE ss FROM study_skill ss JOIN skill source ON source.id = ss.skill_id WHERE source.name = 'Machine Learning';
DELETE FROM skill WHERE name = 'Machine Learning';

-- Technologies explicitly evidenced by career/project content but missing from the catalog.
INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'PostgreSQL', 'DATABASE', '중급', '16', 'CS Test Bed의 운영 데이터 저장소', 'PROJECT_USE',
       'postgresql', '4169E1', FALSE, 54
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'PostgreSQL');

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'MySQL', 'DATABASE', '중급', NULL, 'Spring Boot 기반 서비스의 관계형 데이터 저장소', 'WORK_EXPERIENCE',
       'mysql', '4479A1', FALSE, 55
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'MySQL');

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'gRPC', 'FRAMEWORK', '중급', NULL, 'AI 면접 음성 스트리밍 서비스 간 통신', 'PROJECT_USE',
       'grpc', '244C5A', FALSE, 56
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'gRPC');

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'Apache Kafka', 'DEVOPS', '중급', NULL, 'AI 면접 비동기 이벤트 및 상태 변경 처리', 'PROJECT_USE',
       'apachekafka', '231F20', FALSE, 57
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name IN ('Apache Kafka', 'Kafka'));

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'KQL', 'LANGUAGE', '중급', NULL, 'Azure 로그 비용과 사용량 진단 쿼리 작성', 'PROJECT_USE',
       'microsoftazure', '0078D4', FALSE, 58
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'KQL');

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'Azure Log Analytics', 'DEVOPS', '중급', NULL, 'LogDoctor의 로그 수집·비용 진단 대상 플랫폼', 'PROJECT_USE',
       'microsoftazure', '0078D4', FALSE, 59
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'Azure Log Analytics');

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'Spring Data JPA', 'FRAMEWORK', '중급', NULL, 'Spring Boot 백오피스 및 CS Test Bed 데이터 접근', 'WORK_EXPERIENCE',
       'spring', '6DB33F', FALSE, 60
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'Spring Data JPA');

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'Spring Security', 'FRAMEWORK', '중급', NULL, '백오피스 인증·인가 및 CS Test Bed 보안 구성', 'WORK_EXPERIENCE',
       'springsecurity', '6DB33F', FALSE, 61
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'Spring Security');

INSERT INTO skill (name, category, skill_level, skill_version, skill_comment, usage_type,
                   badge_key, badge_color, is_core, display_order)
SELECT 'GitHub Actions', 'DEVOPS', '중급', NULL, '서비스 빌드·배포 CI/CD 자동화', 'WORK_EXPERIENCE',
       'githubactions', '2088FF', FALSE, 62
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'GitHub Actions');

-- Connect the new entries to the evidence already present in the portfolio.
INSERT IGNORE INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 100 FROM experience e JOIN skill s ON s.name = 'PostgreSQL'
WHERE e.title LIKE '%고객문의%';
INSERT IGNORE INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 101 FROM experience e JOIN skill s ON s.name IN ('Spring Data JPA', 'Spring Security')
WHERE e.title LIKE '%고객문의%' OR e.type = 'CAREER';
INSERT IGNORE INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 102 FROM experience e JOIN skill s ON s.name IN ('MySQL', 'GitHub Actions')
WHERE e.type = 'CAREER';
INSERT IGNORE INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 103 FROM experience e JOIN skill s ON s.name IN ('gRPC', 'Apache Kafka')
WHERE e.title LIKE '%면접%';
INSERT IGNORE INTO experience_skill (experience_id, skill_id, list_order)
SELECT e.id, s.id, 104 FROM experience e JOIN skill s ON s.name IN ('KQL', 'Azure Log Analytics')
WHERE e.title LIKE '%LogDoctor%' OR e.title LIKE '%로그 비용%';

INSERT IGNORE INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT ed.id, s.id, 100 FROM experience_detail ed JOIN skill s ON s.name IN ('Spring Data JPA', 'Spring Security', 'MySQL')
WHERE ed.content LIKE '%Spring Boot%';
INSERT IGNORE INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT ed.id, s.id, 101 FROM experience_detail ed JOIN skill s ON s.name IN ('KQL', 'Azure Log Analytics')
WHERE ed.content LIKE '%KQL%' OR ed.action_detail LIKE '%KQL%';

INSERT IGNORE INTO study_skill (study_id, skill_id)
SELECT st.id, s.id FROM study st JOIN skill s ON s.name IN ('PostgreSQL', 'Spring Data JPA', 'Spring Security')
WHERE st.title LIKE '%CS%' OR st.content_markdown LIKE '%PostgreSQL%' OR st.content_markdown LIKE '%JPA%';
INSERT IGNORE INTO study_skill (study_id, skill_id)
SELECT st.id, s.id FROM study st JOIN skill s ON s.name IN ('KQL', 'Azure Log Analytics')
WHERE st.content_markdown LIKE '%KQL%' OR st.content_markdown LIKE '%Log Analytics%';
