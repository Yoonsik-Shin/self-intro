-- V58: Rebuild the workplace career hierarchy from committed susimdal_legacy evidence.
--
-- Evidence boundary used for this migration:
-- - backend-node-slc-application HEAD: 4,110 / 9,521 main-branch commits by the owner identities.
-- - backend-node-slc-bff HEAD: 316 / 564 main-branch commits; the owner authored the initial commit.
-- - backend-java-slc-back-office HEAD: 144 Java source files and 134 / 139 commits by the owner identity.
-- - backend-node-common-problem HEAD: 17,656 committed seed problems and 39 / 39 commits.
-- - backend-node-common-packages HEAD: 13 / 13 commits and implemented new/generate CLI commands.
--
-- Unverifiable production effects (latency, user count, saved hours, zero missed inquiries, etc.)
-- are intentionally excluded. CAREER details describe collaboration and ownership, while child
-- PROJECT details contain technical STAR narratives.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @api_project_id = (
    SELECT experience_id FROM project WHERE slug = 'work-learning-api-bff' LIMIT 1
);
SET @backoffice_project_id = (
    SELECT experience_id FROM project WHERE slug = 'work-spring-backoffice' LIMIT 1
);
SET @bff_project_id = (
    SELECT experience_id FROM project WHERE slug = 'work-aws-cicd' LIMIT 1
);
SET @common_project_id = (
    SELECT experience_id FROM project WHERE slug = 'work-problem-monorepo' LIMIT 1
);
SET @career_id = (
    SELECT career_experience_id FROM project WHERE experience_id = @api_project_id LIMIT 1
);

-- 1. CAREER: company-wide role, collaboration, and ownership only.
UPDATE experience
SET title = '에듀테크 학습 플랫폼 Backend Engineer',
    period_start = '2023-12-01',
    period_end = '2025-10-31',
    summary = '학생·교사·학원이 사용하는 커리큘럼 기반 학습 플랫폼에서 핵심 API, BFF, 사내 백오피스와 공용 서비스를 개발했습니다. 대표 애플리케이션 저장소 main 브랜치 9,521개 커밋 중 4,110개를 담당했으며, 자발적 백오피스 TF에서는 기획·디자인·프론트엔드·운영 담당자와 협업해 백엔드와 운영 인프라를 맡았습니다.',
    takeaway = '기능 구현에 그치지 않고 요구사항 조율, 반복 릴리스, 운영 이슈 대응, 공통 개발 기반 정리까지 제품 개발의 전 과정을 경험했습니다.'
WHERE id = @career_id;

UPDATE career
SET role = 'Backend Engineer'
WHERE experience_id = @career_id;

INSERT INTO experience_detail (
    experience_id, content, situation, task, action_detail, outcome, narrative, display_order
)
SELECT
    @career_id,
    '직군 간 요구사항을 연결한 자발적 백오피스 TF 협업',
    '무료체험 신청과 운영 과정의 반복 수작업을 개선하기 위해 기획자·디자이너·프론트엔드 개발자·운영 담당자가 참여하는 자발적 TF가 구성되었습니다.',
    '각 직군의 업무 흐름을 API와 운영 가능한 백엔드 기능으로 구체화하고, 백엔드 및 인프라 범위의 구현 책임을 맡았습니다.',
    '- 기획·운영 담당자와 신청 상태, 유입경로, 프로모션 및 알림 흐름 협의\n- 프론트엔드 개발자와 세션 인증, CORS, API 응답 규격 조율\n- 개발 이후 운영 단계의 수정 요청과 서버 핫픽스 대응',
    '직군별 요구사항을 무료체험 신청·관리 API와 알림 흐름으로 연결하고, TF가 실제로 사용할 수 있는 백엔드 운영 기반을 제공했습니다.',
    '무료체험 운영의 반복 수작업을 개선하기 위한 자발적 TF에서 기획자·디자이너·프론트엔드 개발자·운영 담당자와 협업했습니다. 저는 각 직군이 설명하는 신청, 유입경로, 프로모션, 알림 요구사항을 백엔드 도메인과 API 규격으로 구체화하고 세션 인증과 CORS 이슈를 프론트엔드와 함께 조율했습니다. 개발 이후에도 운영 단계의 수정 요청과 서버 핫픽스를 이어가며, 협의된 업무 흐름이 실제로 사용 가능한 백엔드 기능으로 정착하도록 책임졌습니다.',
    0
FROM DUAL
WHERE @career_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail
      WHERE experience_id = @career_id
        AND content = '직군 간 요구사항을 연결한 자발적 백오피스 TF 협업'
  );

INSERT INTO experience_detail (
    experience_id, content, situation, task, action_detail, outcome, narrative, display_order
)
SELECT
    @career_id,
    '반복 릴리스와 서비스별 개발 규칙 정리',
    '핵심 애플리케이션과 신규 BFF, 공용 서비스가 병행 개발되면서 버전 관리와 서비스별 공통 설정을 지속적으로 정리할 필요가 있었습니다.',
    '기능 변경을 릴리스 단위로 관리하고, 새 서비스가 같은 예외 처리·로깅·인프라 규칙을 재사용할 수 있도록 개발 기반을 정리했습니다.',
    '- 핵심 애플리케이션의 버전 갱신과 반복 릴리스 수행\n- BFF 저장소를 최초 커밋부터 구성하고 v1.4.0까지 릴리스 유지\n- 공통 예외 처리·서버 부트스트랩·인프라 모듈을 사내 패키지와 CLI 템플릿으로 정리',
    '장기간 운영되는 기존 서비스와 새로 만드는 서비스 모두에서 변경 이력과 공통 개발 규칙을 이어갈 수 있는 기반을 남겼습니다.',
    '핵심 애플리케이션과 신규 BFF, 공용 서비스가 병행 개발되는 환경에서 기능 변경을 릴리스 단위로 관리했습니다. BFF는 저장소의 최초 커밋부터 기반을 구성해 v1.4.0까지 유지했고, 후반에는 여러 서비스에 반복되던 예외 처리·서버 부트스트랩·인프라 설정을 사내 패키지와 CLI 템플릿으로 정리했습니다. 이를 통해 개별 기능 개발뿐 아니라 팀이 다음 서비스를 만들고 운영할 때 이어서 사용할 수 있는 개발 규칙과 기반을 남겼습니다.',
    1
FROM DUAL
WHERE @career_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail
      WHERE experience_id = @career_id
        AND content = '반복 릴리스와 서비스별 개발 규칙 정리'
  );

-- 2. Child project metadata: separate the core API and BFF, and use source-backed periods.
UPDATE experience
SET title = 'SLC 핵심 애플리케이션 API 서버 개발',
    period_start = '2023-12-26',
    period_end = '2025-09-15',
    summary = '커리큘럼 기반 학습 플랫폼의 Express API에서 AI 튜터 세션, 교사용 학생 관리, 제출문제 통계 도메인과 데이터 이관을 개발했습니다.',
    takeaway = 'main 브랜치 9,521개 커밋 중 4,110개를 담당한 최다 기여자로서, 신규 도메인의 adapter·application·domain·infrastructure 전 계층을 구현하고 운영 중 기능을 지속 개선했습니다.'
WHERE id = @api_project_id;

UPDATE project
SET role = 'Backend Engineer', contribution_rate = 43
WHERE experience_id = @api_project_id;

UPDATE experience
SET title = 'Spring Boot 기반 무료체험 백오피스 구축',
    period_start = '2025-05-19',
    period_end = '2025-09-10',
    summary = '자발적 사내 TF에서 무료체험 신청·운영 백오피스의 Spring Boot API와 인증·알림·컨테이너 운영 구성을 담당했습니다.',
    takeaway = '커밋된 144개 Java 소스 파일 규모의 백엔드를 설계하고, 기획부터 운영 수정까지 백엔드 범위를 끝까지 담당했습니다.'
WHERE id = @backoffice_project_id;

UPDATE project
SET role = 'Backend & Infrastructure Engineer', contribution_rate = 100
WHERE experience_id = @backoffice_project_id;

UPDATE experience
SET title = 'SLC BFF 서버 초기 구축 및 운영',
    period_start = '2025-01-23',
    period_end = '2025-09-09',
    summary = 'NestJS BFF를 최초 커밋부터 구성하고 애플리케이션·계정 서버 호출, 인증·인가, 에러 변환, 기능별 API와 배포 기반을 개발했습니다.',
    takeaway = 'main 브랜치 564개 커밋 중 316개를 담당하며 공통 기반과 주요 기능을 개발하고 v1.4.0까지 릴리스를 이어갔습니다.'
WHERE id = @bff_project_id;

UPDATE project
SET role = 'Backend & DevOps Engineer', contribution_rate = 56
WHERE experience_id = @bff_project_id;

UPDATE experience
SET title = '공용 Problem 서비스와 사내 공통 패키지 구축',
    period_start = '2025-08-28',
    period_end = '2025-09-19',
    summary = '17,656개 시드 문항을 제공하는 NestJS 공용 조회 서비스와 common·core·infra 패키지, 신규 서비스 및 모듈 생성 CLI를 구축했습니다.',
    takeaway = '서비스 저장소와 패키지 저장소의 main 브랜치를 단독으로 개발하고, 공용 패키지를 실제 Problem 서비스가 소비하도록 전환했습니다.'
WHERE id = @common_project_id;

UPDATE project
SET role = 'Backend Engineer', contribution_rate = 100
WHERE experience_id = @common_project_id;

-- 3. Core API project details: technical STAR narratives.
UPDATE experience_detail
SET experience_id = @api_project_id,
    content = '4개 학습 컨텍스트를 통합한 AI 튜터 세션 개발',
    situation = '문제풀이·복습·챌린지·개념보강은 서로 다른 학습 데이터 구조를 사용하지만, 외부 AI 서버와 대화 세션을 주고받는 흐름은 일관된 모델과 API가 필요했습니다.',
    task = '네 학습 컨텍스트를 하나의 세션 모델로 다루고, 사용자 메시지 저장부터 외부 AI 응답 성공·실패 반영까지 비동기 흐름을 구현했습니다.',
    action_detail = '- AiTutorSessionFactory와 source converter factory로 4개 컨텍스트 변환 분리\n- User·Assistant·System 역할과 Text·Image 콘텐츠를 포함한 세션/메시지 엔티티 설계\n- application·domain·adapter·infrastructure 전 계층과 BFF DTO·UseCase 구현\n- SQS 응답 이벤트 리스너와 MongoDB 트랜잭션을 이용한 메시지 상태 변경 처리\n- 커서 기반 조회와 Good·Bad 메시지 평가 API 구현',
    outcome = '네 학습 기능이 같은 세션·메시지 모델과 API를 사용하도록 통합하고, 외부 AI 응답의 성공 및 실패를 세션 상태에 반영하는 비동기 처리 경로를 완성했습니다.',
    narrative = '문제풀이·복습·챌린지·개념보강은 서로 다른 학습 데이터 구조를 사용하지만 외부 AI 서버와 대화하는 흐름은 일관된 모델이 필요했습니다. 이를 위해 AiTutorSessionFactory와 컨텍스트별 converter factory를 설계하고 User·Assistant·System 역할, Text·Image 콘텐츠를 포함한 세션 및 메시지 엔티티를 구현했습니다. 애플리케이션 서버의 application·domain·adapter·infrastructure 전 계층과 BFF의 DTO·UseCase를 함께 개발했으며, SQS 응답 이벤트 리스너와 MongoDB 트랜잭션으로 외부 응답의 성공·실패에 따른 메시지 상태 변경을 처리했습니다. 그 결과 네 학습 기능이 같은 세션·메시지 모델과 API를 사용하고, 커서 조회와 메시지 평가까지 이어지는 대화 기능을 제공할 수 있게 했습니다.',
    display_order = 0
WHERE id = 1;

INSERT INTO experience_detail (
    experience_id, content, situation, task, action_detail, outcome, narrative, display_order
)
SELECT
    @api_project_id,
    '교사용 학생 Presence·조치·호출 도메인 구축',
    '교사가 학생의 접속 상태와 학습 중 필요한 조치를 확인하고, 특정 학생에게 개입할 수 있는 서버 기능이 필요했습니다.',
    'Presence 상태 수집, 학습 유형별 조치 항목, 교사 호출을 서로 분리된 도메인과 API로 구현했습니다.',
    '- 온라인·오프라인·백그라운드 등 Presence 엔티티와 상태 동기화 API 구현\n- Study·StudyReview·Challenge·ConceptEnhancement 소스별 ManageableAction factory와 조회·등록·처리 API 구현\n- TeacherCall 생성·조회·응답 API와 학습 유형별 답변 source converter 구현\n- BFF에 각 기능의 controller·DTO·usecase 모듈 연결',
    '교사용 화면이 학생 상태, 처리할 학습 조치, 호출 응답을 각각 일관된 API로 조회하고 변경할 수 있는 백엔드 기능을 제공했습니다.',
    '교사가 학생의 접속 상태와 학습 중 필요한 조치를 확인하고 특정 학생에게 개입할 수 있도록 Presence, ManageableAction, TeacherCall 도메인을 구축했습니다. Presence에는 온라인·오프라인·백그라운드 상태와 동기화 API를 구현했고, ManageableAction은 문제풀이·복습·챌린지·개념보강 소스를 factory와 converter로 분리했습니다. TeacherCall에는 생성·조회·응답 API와 학습 유형별 답변 변환을 구현하고 BFF의 controller·DTO·usecase까지 연결했습니다. 그 결과 교사용 화면이 학생 상태와 처리할 조치, 호출 응답을 분리된 API로 다룰 수 있는 서버 기반을 제공했습니다.',
    1
FROM DUAL
WHERE @api_project_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail
      WHERE experience_id = @api_project_id
        AND content = '교사용 학생 Presence·조치·호출 도메인 구축'
  );

INSERT INTO experience_detail (
    experience_id, content, situation, task, action_detail, outcome, narrative, display_order
)
SELECT
    @api_project_id,
    'SubmittedProblem 통계 도메인 분리와 데이터 이관',
    '제출문제 관련 통계가 하나의 도메인에 모여 있어 학급·학생·전체·학원 관점의 조회와 변경 책임을 분리할 필요가 있었습니다.',
    '기존 SubmittedProblem을 조회 목적별 도메인으로 나누고, 기존 통계 데이터를 새 구조에 맞게 병합·이관하는 스크립트를 작성했습니다.',
    '- class·student·total·academy submitted-problem 도메인과 Read·Write repository 분리\n- curriculumId·problemId·academy 또는 student 기준으로 기존 데이터 병합\n- 제출수·정답수·오답수·스킵수·평가수·소요시간 등 14개 지표 이관\n- MongoDB session transaction 안에서 updateOne upsert와 기존 문서 삭제 처리',
    '통계 조회의 책임을 네 도메인으로 분리하고, 기존 view/application 데이터의 집계값을 새 저장 구조로 옮길 수 있는 반복 실행 가능한 이관 절차를 마련했습니다.',
    '제출문제 통계가 하나의 도메인에 모여 있던 구조를 학급·학생·전체·학원 관점으로 분리하고 Read·Write repository를 나눴습니다. 이어서 curriculumId와 problemId, 학원 또는 학생 식별자를 기준으로 기존 view 및 application 데이터를 병합하는 마이그레이션 스크립트를 작성했습니다. 스크립트는 제출수·정답수·오답수·스킵수·평가수·소요시간 등 14개 지표를 합산하고 MongoDB transaction 안에서 upsert와 기존 문서 삭제를 처리합니다. 그 결과 통계 도메인의 조회 책임을 분리하고 기존 데이터를 새 구조로 옮길 수 있는 이관 절차를 마련했습니다.',
    2
FROM DUAL
WHERE @api_project_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail
      WHERE experience_id = @api_project_id
        AND content = 'SubmittedProblem 통계 도메인 분리와 데이터 이관'
  );

-- 4. BFF project details. Detail 2 is moved out of the combined API project.
UPDATE experience_detail
SET experience_id = @bff_project_id,
    content = 'NestJS BFF 초기 구조와 서버 간 호출 기반 구축',
    situation = '프론트엔드가 핵심 애플리케이션 서버와 계정 서버의 API를 화면별로 조합해야 해, 인증 정보 전달과 외부 API 오류 처리를 한곳에서 담당할 BFF가 필요했습니다.',
    task = '새 NestJS 저장소를 초기화하고 인증·인가, 서버 간 HTTP 호출, 오류 변환, 기능 모듈을 확장할 공통 기반을 구축했습니다.',
    action_detail = '- 저장소 최초 커밋으로 NestJS 서버와 환경 설정, Docker 개발 환경 구성\n- AccessToken·AuthorizedUser decorator와 역할 기반 Guard 구현\n- Axios requester와 408·502·504·network 오류 converter 구성\n- Swagger, 공통 exception filter, logging 및 Datadog tracer 연결\n- academy·presence·manageable-action·teacher-call·ai-tutor-session 등 기능 모듈 개발',
    outcome = '프론트엔드가 인증 정보와 서버별 오류 변환을 직접 반복하지 않고, 화면에 필요한 API를 BFF의 일관된 응답으로 소비할 수 있는 기반을 구축했습니다.',
    narrative = '프론트엔드가 핵심 애플리케이션 서버와 계정 서버의 API를 화면별로 조합해야 하는 상황에서 인증 전달과 외부 API 오류 처리를 담당할 BFF가 필요했습니다. 저장소 최초 커밋으로 NestJS 서버와 환경 설정, Docker 개발 환경을 구성하고 AccessToken·AuthorizedUser decorator와 역할 기반 Guard를 구현했습니다. Axios requester에는 408·502·504·network 오류 converter를 두고 Swagger, 공통 exception filter, logging, Datadog tracer를 연결했습니다. 이후 academy·presence·manageable-action·teacher-call·ai-tutor-session 모듈을 개발해 프론트엔드가 인증과 서버별 오류 변환을 반복하지 않고 일관된 BFF API를 소비할 수 있게 했습니다.',
    display_order = 0
WHERE id = 2;

UPDATE experience_detail
SET experience_id = @bff_project_id,
    content = 'BFF dev·stg·prod 배포 파이프라인과 릴리스 운영',
    situation = '새 BFF를 로컬 개발뿐 아니라 dev·stg·prod 환경에 반복 배포하고, 환경별 설정과 관측성 구성을 함께 유지해야 했습니다.',
    task = '컨테이너 빌드부터 ECS 배포까지 환경별 파일과 워크플로우를 구성하고 기능 변경을 버전 릴리스로 관리했습니다.',
    action_detail = '- Dockerfile과 docker-compose 개발 환경 작성\n- dev·stg·prod ECS task definition 구성\n- develop 자동 빌드 및 환경별 수동 배포 GitHub Actions workflow 작성·유지\n- Datadog tracer와 ECS 로그 설정 연동\n- v1.0.0부터 v1.4.0까지 버전 갱신 및 릴리스 유지',
    outcome = '동일한 BFF 애플리케이션을 세 환경에 배포할 수 있는 반복 가능한 경로를 만들고, 기능 변경을 v1.4.0까지 릴리스 단위로 운영했습니다.',
    narrative = '새 BFF를 로컬 개발뿐 아니라 dev·stg·prod 환경에 반복 배포하려면 환경별 설정과 관측성 구성을 함께 유지해야 했습니다. Dockerfile과 docker-compose를 작성하고 세 환경의 ECS task definition, develop 브랜치 자동 빌드, 환경별 수동 배포 GitHub Actions workflow를 구성했습니다. 또한 Datadog tracer와 ECS 로그 설정을 연결하고 기능 변경에 맞춰 v1.0.0부터 v1.4.0까지 버전을 갱신했습니다. 그 결과 동일한 BFF 애플리케이션을 세 환경에 전달하는 반복 가능한 배포 경로와 릴리스 이력을 유지했습니다.',
    display_order = 1
WHERE id = 4;

-- 5. Back-office project details.
UPDATE experience_detail
SET experience_id = @backoffice_project_id,
    content = '무료체험 신청·운영 도메인과 알림 흐름 구축',
    situation = '무료체험 신청, 유입경로, 프로모션과 운영 알림이 여러 수작업으로 나뉘어 있어 TF가 함께 사용할 백오피스 API가 필요했습니다.',
    task = '신청부터 상태 관리까지의 도메인을 설계하고, 운영 담당자가 필요한 알림을 외부 채널과 연동했습니다.',
    action_detail = '- free-trial user·application·inflow·promotion·rental·term·employee 도메인과 8개 controller 구현\n- 광고·제휴·직원 QR 등 유입경로 타입 모델링과 조회 API 개발\n- NCP 카카오 알림톡 HMAC-SHA256 서명 생성 및 발송 API 구현\n- Microsoft Teams webhook Adaptive Card 알림 연동\n- 기획·프론트엔드·운영 담당자의 변경 요청을 반영하며 운영 수정',
    outcome = '무료체험 신청과 운영 상태를 백오피스 API에서 관리하고, 신청 이벤트를 알림톡과 Teams로 전달하는 업무 흐름을 구축했습니다.',
    narrative = '무료체험 신청, 유입경로, 프로모션과 운영 알림이 수작업으로 나뉘어 있어 TF가 함께 사용할 백오피스 API가 필요했습니다. free-trial user·application·inflow·promotion·rental·term·employee 도메인과 8개 controller를 구현하고 광고·제휴·직원 QR 등 유입경로 타입을 모델링했습니다. NCP 카카오 알림톡은 HMAC-SHA256 서명을 직접 생성해 연동하고 Microsoft Teams webhook에는 Adaptive Card 알림을 연결했습니다. 기획·프론트엔드·운영 담당자의 변경 요청을 반영하며 신청과 상태 관리, 알림을 하나의 백엔드 업무 흐름으로 구축했습니다.',
    display_order = 0
WHERE id = 3;

INSERT INTO experience_detail (
    experience_id, content, situation, task, action_detail, outcome, narrative, display_order
)
SELECT
    @backoffice_project_id,
    'Redis 세션 인증과 백오피스 운영 환경 구성',
    '분리 배포된 프론트엔드와 백오피스 API 사이에서 세션 쿠키를 전달하고, 애플리케이션과 저장소·프록시·로그 화면을 함께 운영해야 했습니다.',
    '크로스도메인 세션 인증을 구성하고 백오피스 실행에 필요한 컨테이너와 프록시, 모니터링 환경을 묶었습니다.',
    '- Spring Security 인증과 Spring Session Data Redis 연동\n- DefaultCookieSerializer SameSite=None 및 secure cookie 설정과 CORS credential 허용\n- Docker Compose로 app·Nginx·MySQL·Redis·Grafana 구성\n- Nginx reverse proxy와 Swagger Basic Auth, Grafana sub-path 연결\n- 운영 서버에서 인증 및 Grafana 로그인 이슈 수정',
    '분리된 프론트엔드가 Redis 기반 서버 세션을 사용할 수 있게 하고, 백오피스 애플리케이션과 필수 운영 컴포넌트를 함께 실행·점검할 수 있는 환경을 구성했습니다.',
    '분리 배포된 프론트엔드와 백오피스 API 사이에서 세션 쿠키를 전달하고 여러 운영 컴포넌트를 함께 실행해야 했습니다. Spring Security와 Spring Session Data Redis를 연동하고 DefaultCookieSerializer의 SameSite=None, secure cookie 설정과 credential을 허용하는 CORS 구성을 적용했습니다. Docker Compose에는 app·Nginx·MySQL·Redis·Grafana를 묶고, Nginx reverse proxy와 Swagger Basic Auth, Grafana sub-path를 구성했습니다. 운영 중에는 인증과 Grafana 로그인 이슈를 수정해 분리된 프론트엔드가 서버 세션을 사용하고 운영자가 애플리케이션 상태를 점검할 수 있는 환경을 마련했습니다.',
    1
FROM DUAL
WHERE @backoffice_project_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail
      WHERE experience_id = @backoffice_project_id
        AND content = 'Redis 세션 인증과 백오피스 운영 환경 구성'
  );

-- 6. Common service and package project details.
UPDATE experience_detail
SET experience_id = @common_project_id,
    content = 'common·core·infra 패키지와 서비스 생성 CLI 구축',
    situation = '신규 NestJS 서비스마다 예외 처리, 서버 초기화, MongoDB·Redis·SQS 설정과 배포 파일을 반복 작성하고 있었습니다.',
    task = '반복 코드를 역할별 사내 패키지로 분리하고, 새 서비스와 도메인 모듈을 생성하는 CLI 템플릿을 구현했습니다.',
    action_detail = '- npm workspaces 모노레포에 common·core·infra·cli 패키지 구성\n- Axios 오류 변환, exception filter, validation, Swagger 서버 부트스트랩 패키지화\n- MongoDB transaction·repository, Redis, SQS, S3 모듈을 infra 패키지로 분리\n- Commander 기반 susimdal new 및 susimdal generate 명령 구현\n- Docker·ECS task definition·GitHub Actions를 포함한 서비스 템플릿 작성',
    outcome = '공통 코드와 신규 서비스 골격을 사내 패키지 및 CLI로 재사용할 수 있게 하고, 공용 Problem 서비스가 해당 패키지를 실제 의존하도록 전환했습니다.',
    narrative = '신규 NestJS 서비스마다 예외 처리, 서버 초기화, MongoDB·Redis·SQS 설정과 배포 파일을 반복 작성하는 문제를 줄이기 위해 npm workspaces 모노레포를 구성했습니다. common에는 Axios 오류 변환과 공통 인터페이스, core에는 exception filter·validation·Swagger 서버 초기화, infra에는 MongoDB transaction 및 repository·Redis·SQS·S3 모듈을 분리했습니다. Commander 기반 CLI에는 새 서비스를 만드는 susimdal new와 도메인 모듈을 만드는 susimdal generate 명령을 구현하고 Docker·ECS·GitHub Actions 템플릿을 포함했습니다. 이후 공용 Problem 서비스가 이 패키지를 실제 의존하도록 전환해 공통 기반을 재사용 가능한 형태로 연결했습니다.',
    display_order = 1
WHERE id = 5;

INSERT INTO experience_detail (
    experience_id, content, situation, task, action_detail, outcome, narrative, display_order
)
SELECT
    @common_project_id,
    '17,656개 문항을 제공하는 공용 Problem 서비스 구축',
    '여러 서비스가 같은 문항 데이터를 각각 다루는 대신, 문항 조회 책임을 분리한 공용 서비스가 필요했습니다.',
    '단건·다건 문항 조회 API와 데이터 접근 계층을 구현하고 dev·stg·prod 배포 구성을 갖춘 독립 서비스를 만들었습니다.',
    '- NestJS 11과 adapter·application·domain·infrastructure 계층으로 서비스 구성\n- 단건 조회와 problemId 배열 기반 다건 조회 API 구현\n- MongoDB repository와 로컬 replica set·mongoimport·인덱스 초기화 구성\n- 커밋된 17,656개 problems.json 시드로 로컬 데이터 구성\n- Docker, ECR, ECS task definition, GitHub Actions 배포 workflow 작성',
    '문항 조회 책임을 독립 서비스로 분리하고, 여러 호출자가 단건 또는 ID 목록으로 동일한 문항 데이터를 조회할 수 있는 API와 배포 기반을 구축했습니다.',
    '여러 서비스가 같은 문항 데이터를 각각 다루는 대신 문항 조회 책임을 분리한 공용 서비스가 필요했습니다. NestJS 11을 adapter·application·domain·infrastructure 계층으로 구성하고 단건 조회와 problemId 배열 기반 다건 조회 API를 구현했습니다. MongoDB repository와 로컬 replica set, mongoimport, 인덱스 초기화를 구성하고 커밋된 17,656개 problems.json 시드로 로컬 데이터를 만들었습니다. Docker와 ECR, dev·stg·prod ECS task definition, GitHub Actions workflow까지 작성해 독립적으로 배포 가능한 문항 조회 서비스를 구축했습니다.',
    0
FROM DUAL
WHERE @common_project_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail
      WHERE experience_id = @common_project_id
        AND content = '17,656개 문항을 제공하는 공용 Problem 서비스 구축'
  );

-- 7. Rewrite linked workplace studies without unsupported production metrics.
UPDATE study
SET title = '4개 학습 컨텍스트를 통합한 AI 튜터 세션 아키텍처',
    summary = 'Factory와 converter로 네 학습 컨텍스트를 하나의 세션 모델에 연결하고 SQS 응답 이벤트와 MongoDB 트랜잭션으로 메시지 상태를 관리한 구현 기록',
    content_markdown = '# 4개 학습 컨텍스트를 통합한 AI 튜터 세션 아키텍처\n\n## 문제\n문제풀이·복습·챌린지·개념보강은 소스 데이터가 다르지만, 외부 AI 서버와 주고받는 세션·메시지 API는 일관되어야 했습니다.\n\n## 설계와 구현\n- `AiTutorSessionFactory`와 source converter factory로 컨텍스트별 변환 책임을 분리했습니다.\n- User·Assistant·System 역할과 Text·Image 콘텐츠를 세션 메시지 모델로 정의했습니다.\n- 애플리케이션 서버의 domain·application·adapter·infrastructure 전 계층과 NestJS BFF의 DTO·UseCase를 구현했습니다.\n- 외부 AI 응답 성공·실패 이벤트를 SQS listener에서 받아 MongoDB transaction 안에서 메시지 상태에 반영했습니다.\n- 커서 기반 세션·메시지 조회와 Good·Bad 평가 API를 추가했습니다.\n\n## 결과\n네 학습 기능이 같은 세션·메시지 모델을 사용하면서도 컨텍스트별 변환 코드는 factory 뒤에 분리되었습니다. 외부 AI 응답은 동기 HTTP 요청에 묶이지 않고 성공·실패 이벤트를 통해 저장 상태에 반영됩니다.'
WHERE slug = 'ai-tutor-session-architecture';

UPDATE study
SET title = '교사용 Presence·학습 조치·호출 도메인 설계',
    summary = '학생 접속 상태, 학습 유형별 조치 항목, 교사 호출을 분리된 도메인과 BFF API로 연결한 구현 기록',
    content_markdown = '# 교사용 Presence·학습 조치·호출 도메인 설계\n\n## 문제\n교사가 학생의 현재 접속 상태와 처리해야 할 학습 조치를 확인하고 특정 학생에게 개입할 수 있는 서버 기능이 필요했습니다.\n\n## 설계와 구현\n- Presence에 온라인·오프라인·백그라운드 상태와 상태 변경 source를 모델링했습니다.\n- 상태 등록·조회와 오프라인 동기화 API를 구현했습니다.\n- ManageableAction은 Study·StudyReview·Challenge·ConceptEnhancement source를 factory와 converter로 분리했습니다.\n- TeacherCall에는 생성·조회·응답 use case와 학습 유형별 답변 source converter를 구현했습니다.\n- 애플리케이션 API와 NestJS BFF의 controller·DTO·usecase를 함께 연결했습니다.\n\n## 결과\n교사용 화면이 학생 상태, 처리할 학습 조치, 호출 응답을 서로 다른 책임의 API로 조회하고 변경할 수 있는 백엔드 기능을 제공했습니다.'
WHERE slug = 'realtime-student-presence-and-monitoring';

UPDATE study
SET title = 'SubmittedProblem 통계 도메인 분리와 MongoDB 데이터 이관',
    summary = '제출문제 통계를 학급·학생·전체·학원 관점으로 분리하고 14개 집계 지표를 병합·이관한 리팩토링 기록',
    content_markdown = '# SubmittedProblem 통계 도메인 분리와 MongoDB 데이터 이관\n\n## 문제\n제출문제 통계의 조회와 변경 책임이 하나의 도메인에 모여 있어 학급·학생·전체·학원 관점의 모델을 분리할 필요가 있었습니다.\n\n## 설계와 구현\n- class·student·total·academy submitted-problem 도메인으로 분리했습니다.\n- 각 도메인에서 Read·Write repository 인터페이스를 나눴습니다.\n- 기존 view DB와 application DB의 데이터를 curriculumId·problemId·academy 또는 student 기준으로 병합했습니다.\n- 제출수·정답수·오답수·유형별 스킵수·평가수·소요시간 등 14개 지표를 합산했습니다.\n- MongoDB session transaction 안에서 대상 문서를 upsert하고 기존 문서를 삭제하도록 이관 스크립트를 작성했습니다.\n\n## 결과\n통계 조회 책임을 네 도메인으로 분리하고, 기존 집계값을 새 저장 구조로 옮길 수 있는 이관 절차를 마련했습니다. 운영 성능 수치는 저장소만으로 확인할 수 없어 기재하지 않았습니다.'
WHERE slug = 'cqrs-refactoring-and-data-migration';

UPDATE study
SET title = 'Spring Boot 백오피스의 Redis 세션과 크로스도메인 인증',
    summary = 'Spring Security·Spring Session Data Redis·SameSite 쿠키·CORS 설정으로 분리 배포된 프론트엔드의 세션 인증을 구성한 기록',
    content_markdown = '# Spring Boot 백오피스의 Redis 세션과 크로스도메인 인증\n\n## 문제\n프론트엔드와 백오피스 API가 분리된 도메인에 배포되어 브라우저가 서버 세션 쿠키를 교차 요청에 포함하도록 인증과 CORS 설정을 함께 맞춰야 했습니다.\n\n## 설계와 구현\n- Spring Security의 세션 로그인과 권한 규칙을 구성했습니다.\n- Spring Session Data Redis를 세션 저장소로 연결했습니다.\n- `DefaultCookieSerializer`에 SameSite=None과 secure cookie 설정을 적용했습니다.\n- 허용 origin, method, header와 credential을 포함한 CORS 구성을 작성했습니다.\n- Docker Compose에 app·Nginx·MySQL·Redis·Grafana를 묶고 Nginx reverse proxy와 운영 도구 경로를 구성했습니다.\n\n## 결과\n분리 배포된 프론트엔드가 Redis 기반 서버 세션을 사용할 수 있게 했고, 백오피스 실행과 운영 점검에 필요한 컴포넌트를 함께 구성했습니다.'
WHERE slug = 'spring-boot-backoffice-and-session-auth';

UPDATE study
SET title = '사내 공통 NestJS 패키지와 서비스 생성 CLI 구축',
    summary = '반복되는 서버 공통 코드를 common·core·infra 패키지로 분리하고 new·generate 명령과 배포 템플릿을 구현한 기록',
    content_markdown = '# 사내 공통 NestJS 패키지와 서비스 생성 CLI 구축\n\n## 문제\n신규 서비스마다 예외 처리, 서버 초기화, 데이터베이스·메시징 설정과 배포 파일을 반복 작성하고 있었습니다.\n\n## 설계와 구현\n- npm workspaces에 `@susimdal/common`, `@susimdal/core`, `@susimdal/infra`, `@susimdal/cli`를 구성했습니다.\n- common에는 Axios 오류 변환과 공통 인터페이스, core에는 exception filter·validation·Swagger 서버 초기화를 분리했습니다.\n- infra에는 MongoDB transaction 및 repository, Redis, SQS, S3 모듈을 분리했습니다.\n- Commander로 `susimdal new <area> <service>`와 `susimdal generate <moduleName>` 명령을 구현했습니다.\n- 서비스 템플릿에 Dockerfile, dev·stg·prod ECS task definition과 GitHub Actions workflow를 포함했습니다.\n\n## 결과\n공통 코드를 패키지와 CLI 템플릿으로 재사용할 수 있게 했고, 공용 Problem 서비스가 해당 패키지를 실제 의존하도록 전환했습니다. 소요 시간 단축 수치는 측정 근거가 없어 기재하지 않았습니다.'
WHERE slug = 'common-packages-and-cli-scaffolding';

-- 8. Move workplace study links from CAREER to the child project that owns the evidence.
INSERT IGNORE INTO study_experience (study_id, experience_id)
SELECT id, @api_project_id FROM study
WHERE slug IN (
    'ai-tutor-session-architecture',
    'realtime-student-presence-and-monitoring',
    'cqrs-refactoring-and-data-migration'
) AND @api_project_id IS NOT NULL;

INSERT IGNORE INTO study_experience (study_id, experience_id)
SELECT id, @backoffice_project_id FROM study
WHERE slug = 'spring-boot-backoffice-and-session-auth'
  AND @backoffice_project_id IS NOT NULL;

INSERT IGNORE INTO study_experience (study_id, experience_id)
SELECT id, @common_project_id FROM study
WHERE slug = 'common-packages-and-cli-scaffolding'
  AND @common_project_id IS NOT NULL;

DELETE se
FROM study_experience se
JOIN study s ON s.id = se.study_id
WHERE se.experience_id = @career_id
  AND s.slug IN (
      'ai-tutor-session-architecture',
      'realtime-student-presence-and-monitoring',
      'cqrs-refactoring-and-data-migration',
      'spring-boot-backoffice-and-session-auth',
      'common-packages-and-cli-scaffolding'
  );

SET @presence_detail_id = (
    SELECT id FROM experience_detail
    WHERE experience_id = @api_project_id
      AND content = '교사용 학생 Presence·조치·호출 도메인 구축'
    LIMIT 1
);
SET @cqrs_detail_id = (
    SELECT id FROM experience_detail
    WHERE experience_id = @api_project_id
      AND content = 'SubmittedProblem 통계 도메인 분리와 데이터 이관'
    LIMIT 1
);
SET @backoffice_auth_detail_id = (
    SELECT id FROM experience_detail
    WHERE experience_id = @backoffice_project_id
      AND content = 'Redis 세션 인증과 백오피스 운영 환경 구성'
    LIMIT 1
);

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT id, @presence_detail_id FROM study
WHERE slug = 'realtime-student-presence-and-monitoring'
  AND @presence_detail_id IS NOT NULL;

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT id, @cqrs_detail_id FROM study
WHERE slug = 'cqrs-refactoring-and-data-migration'
  AND @cqrs_detail_id IS NOT NULL;

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT id, @backoffice_auth_detail_id FROM study
WHERE slug = 'spring-boot-backoffice-and-session-auth'
  AND @backoffice_auth_detail_id IS NOT NULL;

-- Remove the obsolete study links that pointed at the old combined BFF detail.
DELETE sed
FROM study_experience_detail sed
JOIN study s ON s.id = sed.study_id
WHERE sed.experience_detail_id = 2
  AND s.slug IN (
      'realtime-student-presence-and-monitoring',
      'cqrs-refactoring-and-data-migration'
  );

-- Keep detail order deterministic after inserting the new rows.
UPDATE experience_detail
SET display_order = CASE content
    WHEN '4개 학습 컨텍스트를 통합한 AI 튜터 세션 개발' THEN 0
    WHEN '교사용 학생 Presence·조치·호출 도메인 구축' THEN 1
    WHEN 'SubmittedProblem 통계 도메인 분리와 데이터 이관' THEN 2
    ELSE display_order
END
WHERE experience_id = @api_project_id;

UPDATE experience_detail
SET display_order = CASE content
    WHEN 'NestJS BFF 초기 구조와 서버 간 호출 기반 구축' THEN 0
    WHEN 'BFF dev·stg·prod 배포 파이프라인과 릴리스 운영' THEN 1
    ELSE display_order
END
WHERE experience_id = @bff_project_id;

UPDATE experience_detail
SET display_order = CASE content
    WHEN '무료체험 신청·운영 도메인과 알림 흐름 구축' THEN 0
    WHEN 'Redis 세션 인증과 백오피스 운영 환경 구성' THEN 1
    ELSE display_order
END
WHERE experience_id = @backoffice_project_id;

UPDATE experience_detail
SET display_order = CASE content
    WHEN '17,656개 문항을 제공하는 공용 Problem 서비스 구축' THEN 0
    WHEN 'common·core·infra 패키지와 서비스 생성 CLI 구축' THEN 1
    ELSE display_order
END
WHERE experience_id = @common_project_id;
