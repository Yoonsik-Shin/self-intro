-- 전체 경력 아카이브, 기본 이력서, 직무별 원본 템플릿을 구분한다.

SELECT id INTO @challenge_detail_id FROM experience_detail
WHERE experience_id = 17 AND content = '시험·과제형 Challenge 도메인 설계·출시' LIMIT 1;
SELECT id INTO @submission_detail_id FROM experience_detail
WHERE experience_id = 17 AND content = '여섯 학습 문맥의 문항 제출 파이프라인 통합' LIMIT 1;
SELECT id INTO @curriculum_detail_id FROM experience_detail
WHERE experience_id = 17 AND content = '운영 중 교육과정 개편과 학습 연속성 보존' LIMIT 1;

UPDATE print_template
SET name = '[경력 아카이브] 전체 경력기술서',
    target_role = 'CAREER_ARCHIVE',
    visible = 1,
    display_order = 2,
    updated_at = NOW()
WHERE id = 9;

UPDATE print_template
SET name = '[기본] 백엔드 이력서',
    target_role = 'BACKEND_GENERAL',
    excluded_ids = CAST(JSON_ARRAY(
        'competencies', 'projects', 'architecture-components', 'architecture-diagram',
        'career-project:19',
        'career-detail:1', 'career-detail:28', 'career-detail:29', 'career-detail:30',
        'career-detail:2', 'career-detail:4', 'career-detail:5',
        CONCAT('career-detail:', @challenge_detail_id),
        CONCAT('career-detail:', @submission_detail_id),
        CONCAT('career-detail:', @curriculum_detail_id),
        'credential:6', 'credential:7', 'credential:8', 'credential:9', 'credential:13'
    ) AS CHAR),
    content_overrides = JSON_OBJECT(
        'profile', JSON_OBJECT(
            'jobTitle', 'Backend Engineer · Performance & Architecture',
            'bio', '운영 병목을 측정하고 데이터 접근·처리 경계를 재설계해 온 백엔드 엔지니어입니다. 이벤트 fan-out으로 학습 종료 API 평균 응답시간을 2.74초에서 413ms로 단축하고, MongoDB 쿼리·인덱스와 읽기 모델을 최적화했으며, 반복되던 60초 timeout을 구조 변경으로 해소했습니다.'
        ),
        'selectedSkillIds', JSON_ARRAY(1, 2, 5, 8, 16, 30, 31, 54, 56, 63, 71)
    ),
    visible = 1,
    display_order = 1,
    updated_at = NOW()
WHERE id = 10;

UPDATE print_template
SET name = '[포트폴리오] 프로젝트·아키텍처 통합',
    display_order = 3,
    updated_at = NOW()
WHERE id = 11;

INSERT INTO print_template
    (name, excluded_ids, section_order, section_gaps, target_role, content_overrides,
     schema_version, source, visible, display_order, document_type, orientation, line_height,
     is_final_submission, created_at, updated_at)
VALUES
    ('[직무별] 플랫폼·아키텍처',
     CAST(JSON_ARRAY(
        'competencies', 'projects', 'architecture-components', 'architecture-diagram',
        'career-project:18', 'career-detail:1', 'career-detail:3', 'career-detail:30',
        CONCAT('career-detail:', @challenge_detail_id),
        CONCAT('career-detail:', @submission_detail_id),
        CONCAT('career-detail:', @curriculum_detail_id),
        'credential:6', 'credential:7', 'credential:8', 'credential:9', 'credential:13'
     ) AS CHAR),
     '["intro-profile","skills","career","credentials"]',
     '{"skills":16,"career":20,"credentials":16}',
     'PLATFORM_ARCHITECTURE',
     JSON_OBJECT(
        'profile', JSON_OBJECT(
            'jobTitle', 'Platform Backend Engineer',
            'bio', '운영 병목을 관측해 데이터·처리 경계를 다시 설계하고, 반복 가능한 서비스 개발 기반으로 확장합니다. 이벤트 fan-out, 읽기·쓰기 분리, MongoDB 최적화와 인메모리 읽기 모델, 공용 패키지·CLI·배포 템플릿을 실제 운영 서비스에 적용했습니다.'
        ),
        'selectedSkillIds', JSON_ARRAY(2, 8, 16, 30, 31, 54, 63, 71)
     ),
     2, 'MANUAL', 0, 10, 'RESUME', 'PORTRAIT', 1.5, 0, NOW(), NOW()),
    ('[직무별] Java·Spring 백엔드',
     CAST(JSON_ARRAY(
        'competencies', 'architecture-components', 'architecture-diagram',
        'career-project:19', 'career-detail:1', 'career-detail:28', 'career-detail:29',
        'career-detail:2', 'career-detail:4', 'career-detail:5',
        CONCAT('career-detail:', @challenge_detail_id),
        CONCAT('career-detail:', @submission_detail_id),
        CONCAT('career-detail:', @curriculum_detail_id),
        'project:3', 'credential:6', 'credential:7', 'credential:8', 'credential:9', 'credential:13'
     ) AS CHAR),
     '["intro-profile","skills","career","projects","credentials"]',
     '{"skills":16,"career":20,"projects":20,"credentials":16}',
     'JAVA_SPRING_BACKEND',
     JSON_OBJECT(
        'profile', JSON_OBJECT(
            'jobTitle', 'Java · Spring Backend Engineer',
            'bio', 'TypeScript/NestJS 운영 경험에서 쌓은 성능·장애 대응 역량을 Java/Spring 생태계로 확장하고 있습니다. Spring Boot 백오피스를 단독 구축해 운영팀 실사용까지 책임졌고, 개인 서비스에서는 JPA·Flyway·MySQL과 계층형 도메인 설계를 지속적으로 고도화했습니다.'
        ),
        'selectedSkillIds', JSON_ARRAY(1, 5, 16, 22, 31, 55, 56, 61, 62, 63)
     ),
     2, 'MANUAL', 0, 11, 'RESUME', 'PORTRAIT', 1.5, 0, NOW(), NOW()),
    ('[직무별] AI 서비스 백엔드',
     CAST(JSON_ARRAY(
        'competencies', 'architecture-components', 'architecture-diagram',
        'career-project:18', 'career-detail:3', 'career-detail:30',
        'career-detail:28', 'career-detail:29', 'career-detail:41', 'career-detail:43',
        'career-detail:44', 'career-detail:4', 'career-detail:5',
        CONCAT('career-detail:', @challenge_detail_id),
        CONCAT('career-detail:', @submission_detail_id),
        CONCAT('career-detail:', @curriculum_detail_id),
        'project:2', 'credential:6', 'credential:7', 'credential:8', 'credential:9', 'credential:13'
     ) AS CHAR),
     '["intro-profile","skills","career","projects","credentials"]',
     '{"skills":16,"career":20,"projects":20,"credentials":16}',
     'AI_SERVICE_BACKEND',
     JSON_OBJECT(
        'profile', JSON_OBJECT(
            'jobTitle', 'AI Service Backend Engineer',
            'bio', 'AI 모델 호출 자체보다 제품이 긴 처리시간과 실패를 견디는 구조에 집중합니다. AI 튜터의 세션·대화·비동기 메시지 상태를 설계하고 timeout·재처리·중복 소비를 제어했으며, 실제 사용자에게 출시해 운영했습니다.'
        ),
        'selectedSkillIds', JSON_ARRAY(1, 2, 3, 5, 8, 16, 38, 54, 71)
     ),
     2, 'MANUAL', 0, 12, 'RESUME', 'PORTRAIT', 1.5, 0, NOW(), NOW()),
    ('[직무별] Node.js·도메인 백엔드',
     CAST(JSON_ARRAY(
        'competencies', 'projects', 'architecture-components', 'architecture-diagram',
        'career-project:18', 'career-detail:3', 'career-detail:30',
        'career-detail:28', 'career-detail:29', 'career-detail:43',
        'career-detail:31', 'career-detail:5',
        'credential:6', 'credential:7', 'credential:8', 'credential:9', 'credential:13'
     ) AS CHAR),
     '["intro-profile","skills","career","credentials"]',
     '{"skills":16,"career":20,"credentials":16}',
     'NODE_DOMAIN_BACKEND',
     JSON_OBJECT(
        'profile', JSON_OBJECT(
            'jobTitle', 'Node.js · Domain Backend Engineer',
            'bio', '복잡한 학습 규칙을 도메인 모델과 확장 가능한 처리 흐름으로 바꾸는 백엔드 엔지니어입니다. 시험·과제형 도메인을 설계·출시하고, 여섯 학습 문맥의 제출 파이프라인과 운영 중 교육과정 전환을 구현했습니다.'
        ),
        'selectedSkillIds', JSON_ARRAY(2, 4, 8, 15, 16, 30, 31, 54)
     ),
     2, 'MANUAL', 0, 13, 'RESUME', 'PORTRAIT', 1.5, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at);
