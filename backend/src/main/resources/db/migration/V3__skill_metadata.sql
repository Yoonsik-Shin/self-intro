ALTER TABLE skill ADD COLUMN skill_version VARCHAR(60) NULL;
ALTER TABLE skill ADD COLUMN skill_comment VARCHAR(500) NULL;
ALTER TABLE skill ADD COLUMN usage_type VARCHAR(30) NOT NULL DEFAULT 'LEARNING';

UPDATE skill
SET usage_type = 'WORK_EXPERIENCE'
WHERE name IN ('Java 21', 'TypeScript', 'Node.js', 'NestJS', 'Express', 'MongoDB', 'Redis', 'Spring Boot', 'AWS ECS/SQS', 'Docker', 'Datadog');

UPDATE skill
SET usage_type = 'PROJECT_USE'
WHERE name IN ('Spring Boot 3.3', 'React 19', 'React', 'QueryDSL', 'Flyway', 'Playwright', 'n8n', 'Nginx', 'Docker Compose', 'Grafana', 'Loki', 'Alloy', 'FastAPI', 'Cosmos DB', 'Azure Functions', 'Azure OpenAI', 'Teams SDK', 'Bicep', 'IaC', 'gRPC', 'Kafka', 'Kubernetes');

UPDATE skill
SET skill_version = CASE name
    WHEN 'Java 21' THEN '21'
    WHEN 'Spring Boot 3.3' THEN '3.3'
    WHEN 'Spring Boot' THEN '3.x'
    WHEN 'React 19' THEN '19'
    WHEN 'TypeScript' THEN '5.x'
    WHEN 'Node.js' THEN '20.x'
    ELSE skill_version
END
WHERE name IN ('Java 21', 'Spring Boot 3.3', 'Spring Boot', 'React 19', 'TypeScript', 'Node.js');

UPDATE skill
SET skill_comment = CASE name
    WHEN 'Java 21' THEN '실무 및 프로젝트 백엔드 주력 언어'
    WHEN 'Spring Boot 3.3' THEN '포트폴리오와 CS Test Bed API 서버에서 활용'
    WHEN 'TypeScript' THEN 'NestJS, Express, React 기반 서비스 구현에 활용'
    WHEN 'Redis' THEN '세션, 캐시, 실시간 상태 제어 경험'
    WHEN 'Docker' THEN '로컬 개발과 배포 환경 컨테이너화에 활용'
    WHEN 'RAG' THEN 'AI 면접 질문 생성과 로그 진단 흐름에서 학습 및 적용'
    ELSE skill_comment
END
WHERE name IN ('Java 21', 'Spring Boot 3.3', 'TypeScript', 'Redis', 'Docker', 'RAG');
