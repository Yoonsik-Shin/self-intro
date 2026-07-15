CREATE TABLE competency (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE competency_skill (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    competency_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_competency_skill UNIQUE (competency_id, skill_id),
    CONSTRAINT fk_competency_skill_competency FOREIGN KEY (competency_id) REFERENCES competency (id) ON DELETE CASCADE,
    CONSTRAINT fk_competency_skill_skill FOREIGN KEY (skill_id) REFERENCES skill (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE competency_evidence (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    competency_id BIGINT NOT NULL,
    experience_id BIGINT NOT NULL,
    evidence_summary VARCHAR(700) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_competency_evidence UNIQUE (competency_id, experience_id),
    CONSTRAINT fk_competency_evidence_competency FOREIGN KEY (competency_id) REFERENCES competency (id) ON DELETE CASCADE,
    CONSTRAINT fk_competency_evidence_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE competency_study (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    competency_id BIGINT NOT NULL,
    study_id BIGINT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_competency_study UNIQUE (competency_id, study_id),
    CONSTRAINT fk_competency_study_competency FOREIGN KEY (competency_id) REFERENCES competency (id) ON DELETE CASCADE,
    CONSTRAINT fk_competency_study_study FOREIGN KEY (study_id) REFERENCES study (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO competency (title, summary, display_order, is_visible, created_at, updated_at) VALUES
('백엔드 아키텍처와 도메인 설계', '복잡한 업무 규칙을 도메인 경계로 분리하고 변경에 유연한 API와 서비스 구조로 설계합니다.', 1, TRUE, NOW(), NOW()),
('비동기·분산 시스템 신뢰성', '메시지 중복, 유실, 재처리와 상태 전이를 고려해 멱등성과 데이터 정합성을 확보합니다.', 2, TRUE, NOW(), NOW()),
('데이터 모델링과 안전한 마이그레이션', '조회 성능과 운영 안정성을 함께 고려해 스키마, 인덱스, 암호화 및 무중단 마이그레이션을 설계합니다.', 3, TRUE, NOW(), NOW()),
('운영 자동화·관측성·보안', '배포 이후의 장애 탐지와 보안 경계를 포함해 실제 운영 가능한 시스템을 구성합니다.', 4, TRUE, NOW(), NOW()),
('AI·RAG 서비스 파이프라인', 'LLM과 검색·음성 처리 구성요소를 서비스 흐름에 연결하고 품질과 지연을 함께 개선합니다.', 5, TRUE, NOW(), NOW());

INSERT INTO competency_skill (competency_id, skill_id, display_order)
SELECT c.id, s.id, s.display_order
FROM competency c
JOIN skill s ON
    (c.display_order = 1 AND s.name IN ('Java', 'Spring Boot', 'Node.js', 'TypeScript', 'NestJS', 'Express', 'QueryDSL')) OR
    (c.display_order = 2 AND s.name IN ('Redis', 'Kafka', 'AWS ECS/SQS', 'SQS', 'gRPC', 'n8n')) OR
    (c.display_order = 3 AND s.name IN ('MySQL', 'MongoDB', 'Flyway', 'QueryDSL', 'Cosmos DB', 'Database')) OR
    (c.display_order = 4 AND s.name IN ('Docker', 'Docker Compose', 'Nginx', 'Grafana', 'Loki', 'Alloy', 'Azure', 'Bicep', 'IaC')) OR
    (c.display_order = 5 AND s.name IN ('RAG', 'LLM', 'Azure OpenAI', 'OpenAI', 'STT/TTS', 'LangChain', 'LangGraph'));

INSERT INTO competency_evidence (competency_id, experience_id, evidence_summary, is_primary, display_order)
SELECT c.id, e.id, COALESCE(e.takeaway, e.summary),
       CASE
           WHEN c.display_order = 1 AND e.type = 'CAREER' THEN TRUE
           WHEN c.display_order = 2 AND e.title LIKE '%음성 스트리밍%' THEN TRUE
           WHEN c.display_order = 3 AND e.title LIKE '%고객문의%' THEN TRUE
           WHEN c.display_order = 4 AND e.title LIKE '%LogDoctor%' THEN TRUE
           WHEN c.display_order = 5 AND e.title LIKE '%RAG 면접%' THEN TRUE
           ELSE FALSE
       END,
       e.display_order
FROM competency c
JOIN experience e ON
    (c.display_order = 1 AND (e.type = 'CAREER' OR e.title LIKE '%고객문의%')) OR
    (c.display_order = 2 AND (e.title LIKE '%음성 스트리밍%' OR e.type = 'CAREER')) OR
    (c.display_order = 3 AND (e.title LIKE '%고객문의%' OR e.type = 'CAREER')) OR
    (c.display_order = 4 AND (e.title LIKE '%LogDoctor%' OR e.title LIKE '%고객문의%')) OR
    (c.display_order = 5 AND (e.title LIKE '%RAG 면접%' OR e.title LIKE '%LogDoctor%'));

INSERT INTO competency_study (competency_id, study_id, display_order)
SELECT DISTINCT cs.competency_id, ss.study_id, st.id
FROM competency_skill cs
JOIN study_skill ss ON ss.skill_id = cs.skill_id
JOIN study st ON st.id = ss.study_id;
