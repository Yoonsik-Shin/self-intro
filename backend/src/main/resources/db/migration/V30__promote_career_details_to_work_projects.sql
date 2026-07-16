-- The existing career row described five concrete build cases as if the whole career were one
-- project. Promote those cases to projects linked to the career, while preserving the original
-- detail rows and every relation that points at their ids.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @career_id = (
    SELECT d.experience_id
    FROM experience_detail d
    JOIN experience e ON e.id = d.experience_id AND e.type = 'CAREER'
    WHERE d.content = 'AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발'
    LIMIT 1
);

INSERT INTO experience (
    type, title, period_start, period_end, summary, takeaway, essay_content,
    display_order, show_on_timeline, timeline_label
)
SELECT
    'PROJECT',
    '학습 플랫폼 핵심 API 및 BFF 구축',
    period_start,
    period_end,
    'AI 튜터링 세션을 4개 컨텍스트로 추상화한 Express API와 교사용·학생용 클라이언트를 중계하는 NestJS BFF를 설계·개발했습니다.',
    '9,500여 개 커밋 중 약 43%를 담당하며 핵심 API, BFF, CQRS 리팩토링과 대규모 데이터 마이그레이션을 주도했습니다.',
    essay_content,
    display_order,
    FALSE,
    NULL
FROM experience
WHERE id = @career_id;
SET @api_bff_project_id = IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
INSERT INTO project (experience_id, career_experience_id, slug, role, contribution_rate, repository_url)
SELECT @api_bff_project_id, @career_id, 'work-learning-api-bff', c.role, 43, NULL
FROM career c
WHERE c.experience_id = @career_id AND @api_bff_project_id IS NOT NULL;

INSERT INTO experience (
    type, title, period_start, period_end, summary, takeaway, essay_content,
    display_order, show_on_timeline, timeline_label
)
SELECT
    'PROJECT',
    'Spring Boot 기반 사내 백오피스 구축',
    period_start,
    period_end,
    '여러 부서의 반복 수작업을 줄이기 위해 Spring Boot 3.2 기반 사내 백오피스와 알림·인증 자동화 흐름을 단독 구축했습니다.',
    '6만여 개 문항 조회와 부서 공용 워크플로우를 자동화하며 독립적인 사내 서비스 설계·운영 경험을 확보했습니다.',
    NULL,
    display_order + 1,
    FALSE,
    NULL
FROM experience
WHERE id = @career_id;
SET @backoffice_project_id = IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
INSERT INTO project (experience_id, career_experience_id, slug, role, contribution_rate, repository_url)
SELECT @backoffice_project_id, @career_id, 'work-spring-backoffice', c.role, 100, NULL
FROM career c
WHERE c.experience_id = @career_id AND @backoffice_project_id IS NOT NULL;

INSERT INTO experience (
    type, title, period_start, period_end, summary, takeaway, essay_content,
    display_order, show_on_timeline, timeline_label
)
SELECT
    'PROJECT',
    'AWS 인프라 및 CI/CD 파이프라인 구축·운영',
    period_start,
    period_end,
    'AWS ECS·SQS 기반 인프라와 Docker 배포 환경, GitHub Actions CI/CD 및 Datadog 모니터링 체계를 구축·운영했습니다.',
    '배포 수작업과 환경 차이를 줄이고 장애를 조기에 발견할 수 있는 안정적인 서비스 운영 기반을 마련했습니다.',
    NULL,
    display_order + 2,
    FALSE,
    NULL
FROM experience
WHERE id = @career_id;
SET @infra_project_id = IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
INSERT INTO project (experience_id, career_experience_id, slug, role, contribution_rate, repository_url)
SELECT @infra_project_id, @career_id, 'work-aws-cicd', c.role, NULL, NULL
FROM career c
WHERE c.experience_id = @career_id AND @infra_project_id IS NOT NULL;

INSERT INTO experience (
    type, title, period_start, period_end, summary, takeaway, essay_content,
    display_order, show_on_timeline, timeline_label
)
SELECT
    'PROJECT',
    '공용 Problem 서비스 및 모노레포 패키지 구축',
    period_start,
    period_end,
    '6만여 문항을 제공하는 NestJS 공용 문제 서비스와 npm workspaces 기반 공통 패키지 모노레포를 단독 구축했습니다.',
    '마이크로서비스의 공통 아키텍처 패턴을 표준화하고 신규 서버 모듈의 초기 설정 시간을 단축했습니다.',
    NULL,
    display_order + 3,
    FALSE,
    NULL
FROM experience
WHERE id = @career_id;
SET @problem_project_id = IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
INSERT INTO project (experience_id, career_experience_id, slug, role, contribution_rate, repository_url)
SELECT @problem_project_id, @career_id, 'work-problem-monorepo', c.role, 100, NULL
FROM career c
WHERE c.experience_id = @career_id AND @problem_project_id IS NOT NULL;

UPDATE experience_detail
SET experience_id = @api_bff_project_id,
    display_order = CASE content
        WHEN 'AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발' THEN 0
        ELSE 1
    END
WHERE experience_id = @career_id
  AND content IN (
      'AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발',
      '프론트엔드 중계용 BFF 서버 설계 및 구축'
  )
  AND @api_bff_project_id IS NOT NULL;

UPDATE experience_detail
SET experience_id = @backoffice_project_id, display_order = 0
WHERE experience_id = @career_id
  AND content = 'Spring Boot 기반 사내 백오피스 단독 구축'
  AND @backoffice_project_id IS NOT NULL;

UPDATE experience_detail
SET experience_id = @infra_project_id, display_order = 0
WHERE experience_id = @career_id
  AND content = 'AWS 인프라 및 CI/CD 파이프라인 설계/운영'
  AND @infra_project_id IS NOT NULL;

UPDATE experience_detail
SET experience_id = @problem_project_id, display_order = 0
WHERE experience_id = @career_id
  AND content = '공용 문제(Problem) 서비스 및 사내 공통 패키지 모노레포 단독 구축'
  AND @problem_project_id IS NOT NULL;

INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT project_id, skill_id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY first_order, skill_id) - 1
FROM (
    SELECT d.experience_id AS project_id, ds.skill_id, MIN(ds.list_order) AS first_order
    FROM experience_detail d
    JOIN experience_detail_skill ds ON ds.experience_detail_id = d.id
    WHERE d.experience_id IN (@api_bff_project_id, @backoffice_project_id, @infra_project_id, @problem_project_id)
    GROUP BY d.experience_id, ds.skill_id
) project_skills;

INSERT INTO experience_tag (experience_id, tag_id)
SELECT project_id, source.tag_id
FROM (
    SELECT @api_bff_project_id AS project_id
    UNION ALL SELECT @backoffice_project_id
    UNION ALL SELECT @infra_project_id
    UNION ALL SELECT @problem_project_id
) projects
JOIN experience_tag source ON source.experience_id = @career_id
WHERE project_id IS NOT NULL;

UPDATE experience_placement
SET experience_id = @api_bff_project_id
WHERE experience_id = @career_id
  AND placement_type = 'CORE_PROJECT'
  AND @api_bff_project_id IS NOT NULL;

DELETE mapping
FROM experience_placement_detail mapping
JOIN experience_placement placement ON placement.id = mapping.placement_id
JOIN experience_detail detail ON detail.id = mapping.experience_detail_id
WHERE placement.experience_id = @api_bff_project_id
  AND detail.experience_id <> @api_bff_project_id;

UPDATE experience_placement_detail mapping
JOIN experience_detail detail ON detail.id = mapping.experience_detail_id
SET mapping.display_order = detail.display_order
WHERE detail.experience_id = @api_bff_project_id;

UPDATE experience
SET title = '에듀테크 스타트업 Backend & DevOps 경력'
WHERE id = @career_id;
