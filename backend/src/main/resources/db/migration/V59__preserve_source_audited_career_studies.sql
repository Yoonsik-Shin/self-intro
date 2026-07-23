-- V59: SampleDataLoader historically rewrote local study prose and selected detail links with
-- substring heuristics after Flyway completed. Re-apply the source-audited study text and replace
-- the five workplace study-detail mappings with deterministic project-slug + detail-title links.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

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

DELETE sed
FROM study_experience_detail sed
JOIN study s ON s.id = sed.study_id
WHERE s.slug IN (
    'ai-tutor-session-architecture',
    'realtime-student-presence-and-monitoring',
    'cqrs-refactoring-and-data-migration',
    'spring-boot-backoffice-and-session-auth',
    'common-packages-and-cli-scaffolding'
);

INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, d.id
FROM study s
JOIN experience_detail d ON d.content = CASE s.slug
    WHEN 'ai-tutor-session-architecture' THEN '4개 학습 컨텍스트를 통합한 AI 튜터 세션 개발'
    WHEN 'realtime-student-presence-and-monitoring' THEN '교사용 학생 Presence·조치·호출 도메인 구축'
    WHEN 'cqrs-refactoring-and-data-migration' THEN 'SubmittedProblem 통계 도메인 분리와 데이터 이관'
    WHEN 'spring-boot-backoffice-and-session-auth' THEN 'Redis 세션 인증과 백오피스 운영 환경 구성'
    WHEN 'common-packages-and-cli-scaffolding' THEN 'common·core·infra 패키지와 서비스 생성 CLI 구축'
END
JOIN project p ON p.experience_id = d.experience_id
WHERE (s.slug = 'ai-tutor-session-architecture' AND p.slug = 'work-learning-api-bff')
   OR (s.slug = 'realtime-student-presence-and-monitoring' AND p.slug = 'work-learning-api-bff')
   OR (s.slug = 'cqrs-refactoring-and-data-migration' AND p.slug = 'work-learning-api-bff')
   OR (s.slug = 'spring-boot-backoffice-and-session-auth' AND p.slug = 'work-spring-backoffice')
   OR (s.slug = 'common-packages-and-cli-scaffolding' AND p.slug = 'work-problem-monorepo');
