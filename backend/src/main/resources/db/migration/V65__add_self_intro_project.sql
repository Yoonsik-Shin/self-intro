-- V65: Register this repository itself (self-intro) as a PROJECT experience entry, with
-- STAR-format experience_detail rows and three related technical-deep-dive study entries.
--
-- Evidence boundary (facts drawn directly from this repository at committed HEAD):
-- - Backend: Spring Boot 3.5 / Java 21 (backend/build.gradle), 11 domain packages under
--   modules/{ai,architecture,competency,donation,experience,printtemplate,profile,skill,
--   storage,visitor} plus the top-level study package, Spring Security session auth with
--   /api/admin/** restricted to ROLE_ADMIN (auth/config/SecurityConfig.java), Flyway
--   migrations V1-V64, QueryDSL used in study/repository/StudyRepositoryImpl.java.
-- - Print system: frontend-next/components/print/* (PrintCanvas, PdfPageLayer,
--   PrintSkillSelectorModal, SaveServerTemplateModal) and lib/pdfLayoutEngine.ts, backed by
--   the printtemplate module's PrintTemplate entity (schemaVersion, contentOverrides,
--   baseContentFingerprint - see V64).
-- - AI: modules/ai/NvidiaNimClient wraps Spring AI's ChatClient against NVIDIA NIM
--   (OpenAI-compatible), independently consumed by CompetencyAiService/ExperienceAiService/
--   study/ai/StudyAiService, each gated by its own *_AI_ENABLED flag (default false).
-- - Donation: KofiWebhookController + DonationService.handleKofiWebhook verify
--   app.donation.kofi.verification-token and dedupe via findWithLockByMulNo (the legacy
--   PayApp-era mul_no column reused for the Ko-fi transaction id); V31-V33 created the
--   original PayApp-shaped schema, V63 added currency/is_subscription/provider_paid_at for
--   Ko-fi; no PayApp client/controller code remains in modules/donation.
-- - Deployment: deploy/argocd/application.yaml (ArgoCD auto-sync/prune/self-heal against
--   deploy/k8s/overlays/prod), sealed secrets under deploy/k8s/overlays/prod/backend,
--   GitHub Actions workflows building ARM64 images and patching the Kustomize image tag back
--   into main, deploy/argocd/README.md documenting Cloudflare in front of the ArgoCD/API
--   hosts, deploy/oracle-free-tier.md documenting the OCI Free Tier target.
-- - Repository timeline: git history for this repository starts 2026-07-13 and is still
--   active (this migration itself is dated 2026-07-23).
-- Unverifiable or superseded claims (the oracle-free-tier.md plan's original Vite+React and
-- Cloudflare Pages static-hosting description, which the current Next.js/OKE deployment does
-- not match) are intentionally excluded.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Next.js is the frontend's core framework but was never added to the skill catalog.
INSERT INTO skill (
    name, category, skill_level, skill_version, skill_comment, usage_type,
    badge_key, badge_color, is_core, display_order
)
SELECT
    'Next.js', 'FRAMEWORK', '중급', '16', '개인 포트폴리오 프론트엔드의 App Router 및 SSR 프레임워크로 활용',
    'PROJECT_USE', 'nextdotjs', '000000', TRUE,
    (SELECT next_order FROM (SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM skill) s)
WHERE NOT EXISTS (SELECT 1 FROM skill WHERE name = 'Next.js');

-- 1) The project itself
INSERT INTO experience (
    type, title, period_start, period_end, summary, takeaway,
    display_order, show_on_timeline, timeline_label
)
SELECT
    'PROJECT',
    '개인 풀스택 포트폴리오 플랫폼 구축 (Self-Intro)',
    '2026-07-13',
    NULL,
    'Spring Boot 백엔드와 Next.js 프론트엔드로 구성된 개인 포트폴리오 웹 애플리케이션입니다. 경력·프로젝트·스터디 콘텐츠를 11개 도메인 모듈로 나누어 관리하고, 브라우저 기반 인쇄/PDF 내보내기, 도메인별로 격리된 LLM 연동, Ko-fi 후원 결제, Kubernetes·ArgoCD GitOps 배포까지 전체 스택을 단독으로 설계·구현·운영했습니다.',
    '11개 도메인 모듈로 나뉜 백엔드와 도메인별 어드민 화면을 갖춘 프론트엔드를 함께 설계하며, 콘텐츠 관리·AI 연동·결제·배포까지 서비스 전 영역을 혼자 구축하고 운영하는 경험을 쌓았습니다.',
    (SELECT next_order FROM (SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM experience) e),
    TRUE,
    NULL;

SET @self_intro_id = LAST_INSERT_ID();

INSERT INTO project (experience_id, career_experience_id, slug, role, contribution_rate, repository_url)
SELECT @self_intro_id, NULL, 'project-self-intro', 'Full-stack & DevOps Engineer', 100,
       'https://github.com/Yoonsik-Shin/self-intro'
WHERE @self_intro_id IS NOT NULL;

-- 2) STAR-format experience details
INSERT INTO experience_detail (
    experience_id, content, situation, task, action_detail, outcome, narrative, display_order
) VALUES
(@self_intro_id,
 '도메인별로 분리된 백엔드와 공개/관리자 API 경계 설계',
 '아키텍처, 역량, 후원, 경력·프로젝트, 인쇄 템플릿, 프로필, 스킬, 스토리지, 방문자, 스터디 등 성격이 다른 11개 콘텐츠 도메인을 하나의 포트폴리오 서버로 운영해야 했고, 공개 조회와 관리자 수정 권한을 도메인마다 흩어지지 않게 통일해야 했습니다.',
 '도메인마다 컨트롤러·서비스·도메인 계층을 독립된 모듈로 분리하고, 공개 조회와 /api/admin/** 관리자 전용 경계를 하나의 보안 설정으로 일관되게 적용했습니다.',
 '- ai/architecture/competency/donation/experience/printtemplate/profile/skill/storage/visitor와 최상위 study까지 11개 도메인을 패키지 단위 모듈로 분리\n- Spring Security 세션 인증으로 /api/admin/**를 ROLE_ADMIN 전용으로 제한하고 공개 GET 엔드포인트는 화이트리스트로 허용\n- CsrfCookieFilter로 CSRF 쿠키 기반 검증을 공개 폼 제출 구간에 적용\n- Flyway로 스키마 변경 이력을 순차 마이그레이션(V1~V64)으로 관리\n- study 도메인의 검색·필터링 쿼리를 QueryDSL로 구현',
 '서로 다른 11개 도메인을 독립된 모듈로 유지하면서도 공개/관리자 API 경계를 하나의 보안 설정으로 통일했고, 64개의 순차 마이그레이션으로 스키마 변경 이력을 추적할 수 있게 했습니다.',
 '아키텍처, 역량, 후원, 경력·프로젝트, 인쇄 템플릿, 프로필, 스킬, 스토리지, 방문자, 스터디 등 성격이 다른 11개 콘텐츠 도메인을 하나의 서버로 운영해야 했습니다. 도메인마다 컨트롤러·서비스·도메인 계층을 독립된 패키지로 분리하고, Spring Security 세션 인증으로 /api/admin/**를 ROLE_ADMIN 전용으로 제한하면서 공개 GET 엔드포인트는 화이트리스트로 열어 두었습니다. CSRF 쿠키 필터를 공개 제출 구간에 적용하고 Flyway로 스키마 변경을 V1부터 V64까지 순차 관리했으며, study 도메인의 검색은 QueryDSL로 구현했습니다. 그 결과 11개 도메인을 독립적으로 유지하면서도 공개/관리자 경계와 스키마 변경 이력을 하나의 기준으로 관리할 수 있었습니다.',
 0),
(@self_intro_id,
 '클라이언트에서 완결되는 이력서 인쇄/PDF 내보내기 시스템 구축',
 '포트폴리오 콘텐츠를 채용 담당자에게 인쇄물이나 PDF로 전달할 방법이 필요했지만, 페이지가 잘리는 위치와 포함할 섹션 구성이 사람마다 달라 고정된 서버 렌더링만으로는 대응하기 어려웠습니다.',
 '브라우저에서 섹션과 스킬을 선택하고 페이지 분할을 미리 계산해 보여주는 인쇄 미리보기 시스템을 만들고, 자주 쓰는 구성을 서버에 템플릿으로 저장할 수 있게 했습니다.',
 '- PrintCanvas/PdfPageLayer로 페이지 단위 인쇄 레이아웃 렌더링 구현\n- pdfLayoutEngine에서 섹션 높이를 계산해 페이지 분할 지점 산출\n- PrintSkillSelectorModal로 인쇄에 포함할 스킬·섹션을 선택하는 UI 구현\n- SaveServerTemplateModal로 선택한 구성을 PrintTemplate으로 서버에 저장\n- PrintTemplate에 schemaVersion과 baseContentFingerprint를 두어 원본 콘텐츠 변경 시 템플릿 드리프트 감지',
 '서버 PDF 렌더러 없이 브라우저에서 섹션 선택부터 페이지 미리보기, 템플릿 저장까지 이어지는 인쇄 흐름을 완성했고, 원본 콘텐츠가 바뀌었을 때 저장된 템플릿과의 불일치를 감지할 수 있게 했습니다.',
 '포트폴리오 콘텐츠를 채용 담당자에게 인쇄물이나 PDF로 전달해야 했지만, 페이지가 잘리는 위치와 포함할 섹션이 사람마다 달라 고정된 서버 렌더링으로는 대응하기 어려웠습니다. PrintCanvas와 PdfPageLayer로 페이지 단위 레이아웃을 렌더링하고 pdfLayoutEngine이 섹션 높이를 계산해 분할 지점을 산출하도록 했습니다. PrintSkillSelectorModal로 인쇄에 포함할 스킬과 섹션을 고르게 하고, 자주 쓰는 구성은 SaveServerTemplateModal로 PrintTemplate에 저장했습니다. schemaVersion과 baseContentFingerprint를 함께 저장해 원본 콘텐츠가 바뀌면 드리프트를 감지하게 했습니다. 그 결과 서버 PDF 렌더러 없이 브라우저 안에서 완결되는 인쇄 워크플로우를 구축했습니다.',
 1),
(@self_intro_id,
 '여러 도메인에 걸친 LLM 콘텐츠 생성을 기능 플래그로 격리',
 '역량, 경력, 스터디 세 도메인에서 각각 AI로 초안을 생성하는 기능이 필요했지만, 하나의 AI 연동 장애나 설정 문제가 전체 콘텐츠 관리 기능을 막지 않도록 격리해야 했습니다.',
 '공용 AI 클라이언트를 하나로 두고, 도메인별 사용 여부를 서로 영향 없이 켜고 끌 수 있는 구조로 연동했습니다.',
 '- Spring AI ChatClient로 NVIDIA NIM(OpenAI 호환 API, Qwen3.5 계열 모델)을 감싸는 공용 NvidiaNimClient 구현\n- CompetencyAiService/ExperienceAiService/StudyAiService가 각자의 도메인 규칙에 맞춰 공용 클라이언트를 호출\n- COMPETENCY_AI_ENABLED/EXPERIENCE_AI_ENABLED/STUDY_AI_ENABLED 세 개의 독립 플래그로 도메인별 활성화 여부 제어(기본값 비활성화)\n- 동기 생성 응답과 SSE 스트리밍 응답을 함께 지원\n- AiJsonSupport로 AI 응답 JSON 파싱 로직을 공통화',
 '세 도메인이 같은 AI 클라이언트를 공유하면서도 서로 독립적으로 켜고 끌 수 있게 했고, 한 도메인의 AI 기능 문제가 다른 도메인의 수동 콘텐츠 관리를 막지 않도록 분리했습니다.',
 '역량, 경력, 스터디 세 도메인에서 각각 AI로 초안을 생성해야 했지만, 하나의 AI 연동 문제가 전체 콘텐츠 관리를 막지 않도록 격리해야 했습니다. Spring AI ChatClient로 NVIDIA NIM을 감싸는 공용 NvidiaNimClient를 만들고, CompetencyAiService/ExperienceAiService/StudyAiService가 각자의 도메인 규칙에 맞춰 이를 호출하게 했습니다. 세 도메인 각각에 독립된 활성화 플래그를 두어 기본값은 꺼둔 채 필요한 도메인만 켤 수 있게 했고, 동기 응답과 SSE 스트리밍을 함께 지원했습니다. 응답 JSON 파싱은 AiJsonSupport로 공통화했습니다. 그 결과 한 도메인의 AI 기능 문제가 다른 도메인의 수동 콘텐츠 관리에 영향을 주지 않도록 분리할 수 있었습니다.',
 2),
(@self_intro_id,
 'PayApp에서 Ko-fi로 후원 결제 채널 전환',
 '초기에 PayApp 기반으로 구현했던 후원 결제 연동을 운영 중 Ko-fi 웹훅 방식으로 전환해야 했고, 기존 거래 식별자 저장 구조와 후원 이력을 유지한 채 전환해야 했습니다.',
 'Ko-fi 웹훅 검증과 중복 처리 방지를 구현하고, 통화·구독 후원을 지원하도록 기존 도네이션 스키마를 확장했습니다.',
 '- KofiWebhookController에서 verification-token으로 웹훅 요청을 검증\n- 기존 mul_no 컬럼을 Ko-fi 거래·메시지 ID 저장에 재사용하고 findWithLockByMulNo로 락을 걸어 중복 처리 방지\n- currency/is_subscription/provider_paid_at 컬럼을 추가해 다통화 및 구독 후원 지원(V63)\n- Spring Security 설정에서 웹훅 엔드포인트만 CSRF 예외 처리\n- PayApp 전용 컨트롤러·클라이언트 코드를 제거하고 Ko-fi 단일 채널로 정리',
 '결제 채널을 Ko-fi로 완전히 전환하면서도 기존 도네이션 테이블과 이력을 유지했고, 웹훅 검증과 트랜잭션 단위 락으로 중복 후원 반영을 막았습니다.',
 'PayApp 기반으로 구현했던 후원 결제 연동을 운영 중 Ko-fi 웹훅 방식으로 전환해야 했고, 기존 거래 식별자 저장 구조와 후원 이력은 그대로 유지해야 했습니다. KofiWebhookController에서 verification-token으로 웹훅을 검증하고, 기존 mul_no 컬럼을 Ko-fi 거래 ID 저장에 재사용하면서 findWithLockByMulNo로 락을 걸어 중복 처리를 막았습니다. currency·is_subscription·provider_paid_at 컬럼을 추가해 다통화와 구독 후원을 지원하고, 웹훅 엔드포인트만 CSRF 예외로 처리했습니다. PayApp 전용 코드는 완전히 제거하고 Ko-fi 단일 채널로 정리했습니다. 그 결과 결제 채널을 교체하면서도 기존 이력을 잃지 않고 중복 후원 반영을 방지할 수 있었습니다.',
 3),
(@self_intro_id,
 'GitOps 기반 ARM64 컨테이너 배포 파이프라인 구축',
 'Oracle Cloud Free Tier의 ARM 기반 Kubernetes 클러스터에 백엔드와 프론트엔드를 배포해야 했고, 수동 배포 대신 코드 변경이 자동으로 클러스터 상태에 반영되는 구조가 필요했습니다.',
 'GitHub Actions로 ARM64 이미지를 빌드해 레지스트리에 올리고, ArgoCD가 그 변경을 감지해 자동으로 동기화하는 배포 파이프라인을 구성했습니다.',
 '- GitHub Actions 워크플로우에서 QEMU/Buildx로 ARM64 이미지를 빌드해 OCI Registry(OCIR)에 커밋 SHA와 latest 태그로 푸시\n- sed로 Kustomize overlay의 이미지 태그를 갱신하고 그 변경을 main 브랜치에 다시 커밋\n- ArgoCD Application이 해당 커밋을 감지해 자동 sync·prune·self-heal 수행\n- 프로덕션 시크릿은 Bitnami Sealed Secrets로 암호화해 DB·AI·Ko-fi·스토리지 자격 증명 관리\n- Cloudflare를 API 및 ArgoCD 대시보드 앞단 프록시로 구성',
 '코드가 main에 머지되면 이미지 빌드부터 매니페스트 갱신, 클러스터 동기화까지 사람 개입 없이 이어지는 배포 흐름을 구축했고, 시크릿을 평문 없이 저장소에 커밋할 수 있게 했습니다.',
 'Oracle Cloud Free Tier의 ARM 기반 Kubernetes 클러스터에 백엔드와 프론트엔드를 배포하면서, 수동 배포 대신 코드 변경이 자동으로 반영되는 구조가 필요했습니다. GitHub Actions에서 QEMU/Buildx로 ARM64 이미지를 빌드해 OCIR에 푸시하고, sed로 Kustomize overlay의 이미지 태그를 갱신한 뒤 그 변경을 main에 다시 커밋했습니다. ArgoCD Application이 이 커밋을 감지해 자동으로 sync·prune·self-heal을 수행하도록 구성했고, 프로덕션 시크릿은 Sealed Secrets로 암호화해 저장소에 안전하게 커밋될 수 있게 했습니다. Cloudflare는 API와 ArgoCD 대시보드 앞단 프록시로 두었습니다. 그 결과 코드 머지부터 클러스터 반영까지 사람 개입 없이 이어지는 GitOps 배포 흐름을 완성했습니다.',
 4);

SET @detail_backend  = (SELECT id FROM experience_detail WHERE experience_id = @self_intro_id AND display_order = 0 LIMIT 1);
SET @detail_print    = (SELECT id FROM experience_detail WHERE experience_id = @self_intro_id AND display_order = 1 LIMIT 1);
SET @detail_ai       = (SELECT id FROM experience_detail WHERE experience_id = @self_intro_id AND display_order = 2 LIMIT 1);
SET @detail_donation = (SELECT id FROM experience_detail WHERE experience_id = @self_intro_id AND display_order = 3 LIMIT 1);
SET @detail_deploy   = (SELECT id FROM experience_detail WHERE experience_id = @self_intro_id AND display_order = 4 LIMIT 1);

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT @detail_backend, s.id, ROW_NUMBER() OVER (ORDER BY s.display_order) - 1
FROM skill s WHERE @detail_backend IS NOT NULL
  AND s.name IN ('Java', 'Spring Boot', 'Spring Security', 'Spring Data JPA', 'MySQL', 'Flyway', 'QueryDSL');

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT @detail_print, s.id, ROW_NUMBER() OVER (ORDER BY s.display_order) - 1
FROM skill s WHERE @detail_print IS NOT NULL
  AND s.name IN ('TypeScript', 'React', 'Next.js');

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT @detail_ai, s.id, ROW_NUMBER() OVER (ORDER BY s.display_order) - 1
FROM skill s WHERE @detail_ai IS NOT NULL
  AND s.name IN ('Java', 'Spring Boot', 'LLM');

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT @detail_donation, s.id, ROW_NUMBER() OVER (ORDER BY s.display_order) - 1
FROM skill s WHERE @detail_donation IS NOT NULL
  AND s.name IN ('Java', 'Spring Boot', 'MySQL');

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT @detail_deploy, s.id, ROW_NUMBER() OVER (ORDER BY s.display_order) - 1
FROM skill s WHERE @detail_deploy IS NOT NULL
  AND s.name IN ('Docker', 'Kubernetes', 'GitHub Actions');

-- Project-level skill badges (union of the stack actually evidenced above)
INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT @self_intro_id, s.id, ROW_NUMBER() OVER (ORDER BY s.display_order) - 1
FROM skill s WHERE @self_intro_id IS NOT NULL
  AND s.name IN ('Java', 'TypeScript', 'Spring Boot', 'Spring Security', 'Spring Data JPA',
                 'React', 'Next.js', 'MySQL', 'Flyway', 'QueryDSL', 'LLM',
                 'Docker', 'Kubernetes', 'GitHub Actions');

-- 3) Curated placement so the project also appears in the "core projects" listing
INSERT INTO experience_placement (experience_id, placement_type, display_order, enabled, created_at, updated_at)
SELECT @self_intro_id, 'CORE_PROJECT',
       (SELECT next_order FROM (
            SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
            FROM experience_placement WHERE placement_type = 'CORE_PROJECT'
        ) p),
       TRUE, NOW(), NOW()
WHERE @self_intro_id IS NOT NULL;

SET @self_intro_placement_id = (
    SELECT id FROM experience_placement
    WHERE experience_id = @self_intro_id AND placement_type = 'CORE_PROJECT'
    LIMIT 1
);

INSERT INTO experience_placement_detail (placement_id, experience_detail_id, display_order, created_at)
SELECT @self_intro_placement_id, d.id, d.display_order, NOW()
FROM experience_detail d
WHERE @self_intro_placement_id IS NOT NULL AND d.experience_id = @self_intro_id;

-- 4) Related technical deep-dive studies
INSERT INTO study (slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at)
SELECT
    'domain-module-boundary-admin-public-api-separation',
    '도메인 모듈 경계와 공개/관리자 API 분리 설계',
    '성격이 다른 여러 콘텐츠 도메인을 하나의 서버에서 운영할 때, 모듈 경계와 인증 경계를 함께 설계하는 기준',
    '# 도메인 모듈 경계와 공개/관리자 API 분리 설계\n\n## 학습 목표\n서로 다른 콘텐츠 도메인을 하나의 애플리케이션에서 운영할 때, 모듈을 어떤 기준으로 나누고 공개 조회와 관리자 수정 권한을 어떻게 일관되게 유지할지 정리합니다.\n\n## 도메인 단위 패키지 분리\n기능이 아니라 도메인을 기준으로 패키지를 나누면(컨트롤러·서비스·도메인을 한 패키지 안에 두면) 한 도메인의 변경이 다른 도메인의 코드를 건드릴 가능성이 줄어듭니다. 공통으로 쓰이는 AI 클라이언트처럼 여러 도메인이 참조하는 코드는 별도의 공용 모듈로 분리해 순환 의존을 피하는 것이 좋습니다.\n\n## 인증 경계는 URL 패턴으로 통일\n도메인마다 개별적으로 인가 로직을 작성하면 실수로 관리자 전용 기능이 공개되기 쉽습니다. `/api/admin/**` 같은 URL 패턴 하나로 관리자 경계를 통일하고, 공개로 열어야 하는 예외 엔드포인트만 명시적으로 화이트리스트에 추가하는 방식이 실수를 줄입니다.\n\n## 스키마 변경 이력 관리\n도메인이 늘어날수록 스키마 변경도 잦아집니다. Flyway처럼 순번이 붙은 마이그레이션 파일로 변경을 이력화하면, 특정 시점의 스키마 상태를 재현하거나 특정 변경이 어떤 이유로 들어갔는지 추적하기 쉬워집니다.\n\n## 트레이드오프\n도메인마다 모듈을 세밀하게 나누면 초기 설정과 보일러플레이트가 늘어납니다. 도메인 수가 적을 때는 과도한 분리가 오히려 탐색 비용을 늘릴 수 있으므로, 도메인이 독립적으로 배포·확장될 가능성이 있는 경계부터 먼저 분리하는 것이 합리적입니다.\n\n## 점검 목록\n- 새 도메인을 추가할 때 기존 도메인의 코드를 수정해야 하는가\n- 관리자 전용 기능이 URL 패턴 하나로 예외 없이 걸러지는가\n- 스키마 변경 이력만으로 현재 스키마 상태를 설명할 수 있는가',
    'PUBLISHED', (SELECT id FROM study_category WHERE slug = 'backend'), '2026-07-23', NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM study WHERE slug = 'domain-module-boundary-admin-public-api-separation');

INSERT INTO study (slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at)
SELECT
    'ai-feature-isolation-across-domains',
    '여러 도메인에 걸친 LLM 기능을 독립적으로 격리하는 방법',
    '공용 AI 클라이언트를 두고 도메인별 기능 플래그로 장애·설정 문제의 영향 범위를 격리하는 설계 원칙',
    '# 여러 도메인에 걸친 LLM 기능을 독립적으로 격리하는 방법\n\n## 학습 목표\n여러 도메인이 같은 LLM 클라이언트를 사용해 콘텐츠 초안을 생성할 때, 한 도메인의 문제가 다른 도메인까지 번지지 않도록 구조를 설계하는 기준을 정리합니다.\n\n## 공용 클라이언트와 도메인별 호출부 분리\n외부 LLM API 호출, 인증, 응답 파싱처럼 공통되는 부분은 하나의 클라이언트로 모으고, 프롬프트 구성과 결과 해석처럼 도메인 지식이 필요한 부분은 각 도메인 서비스에 남겨 둡니다. 이렇게 하면 클라이언트 교체나 응답 형식 변경이 한 곳에서만 처리됩니다.\n\n## 기능 플래그로 활성화 범위 제어\n도메인마다 독립된 on/off 플래그를 두면, 특정 도메인에서 AI 기능이 불안정하거나 아직 검증되지 않았을 때 그 도메인만 비활성화하고 나머지는 정상 운영할 수 있습니다. 기본값을 꺼둔 상태로 시작하면 배포 환경마다 검증 후 점진적으로 켤 수 있습니다.\n\n## 동기와 스트리밍 응답의 공존\n생성 결과가 짧으면 동기 응답이 단순하지만, 응답이 길어질수록 사용자는 진행 상황을 보고 싶어 합니다. SSE 스트리밍을 별도 엔드포인트로 지원하면 클라이언트가 필요에 따라 동기/스트리밍을 선택할 수 있습니다.\n\n## 실패 격리\nAI 응답 파싱이나 외부 API 오류는 해당 도메인의 생성 요청만 실패시키고, 수동 CRUD 같은 핵심 기능에는 영향을 주지 않아야 합니다. AI 기능을 부가 기능으로 취급하고 핵심 흐름과 명확히 분리하는 것이 중요합니다.\n\n## 점검 목록\n- 한 도메인의 AI 설정을 꺼도 다른 도메인이 정상 동작하는가\n- 응답 파싱 실패가 사용자에게 명확한 오류로 전달되는가\n- 새로운 도메인에 AI 기능을 추가할 때 공용 클라이언트를 재사용할 수 있는가',
    'PUBLISHED', (SELECT id FROM study_category WHERE slug = 'ai-rag'), '2026-07-23', NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM study WHERE slug = 'ai-feature-isolation-across-domains');

INSERT INTO study (slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at)
SELECT
    'gitops-arm64-deployment-pipeline',
    'GitOps 기반 ARM64 컨테이너 배포 파이프라인 설계',
    'CI가 이미지를 빌드해 매니페스트를 갱신하고 ArgoCD가 클러스터 상태를 동기화하는 배포 구조 설계 기준',
    '# GitOps 기반 ARM64 컨테이너 배포 파이프라인 설계\n\n## 학습 목표\n무료 티어의 ARM 기반 Kubernetes 환경에 애플리케이션을 배포하면서, 수동 kubectl 적용 없이 코드 변경이 클러스터 상태로 자동 반영되는 흐름을 설계하는 방법을 정리합니다.\n\n## CI와 CD의 책임 분리\nCI(GitHub Actions)는 이미지를 빌드하고 배포 매니페스트의 이미지 태그를 갱신해 저장소에 커밋하는 역할까지만 담당합니다. 실제로 클러스터에 반영하는 작업은 ArgoCD가 저장소 상태를 관찰해 수행하므로, 클러스터 접근 자격 증명을 CI 파이프라인에 둘 필요가 없습니다.\n\n## ARM 아키텍처 빌드\n호스팅 환경이 ARM 기반이라면 이미지도 ARM64로 빌드해야 합니다. QEMU 에뮬레이션 빌드는 느리거나 불안정할 수 있어, 가능하면 네이티브 ARM 러너에서 빌드하는 편이 안정적입니다.\n\n## 선언적 상태와 자동 복구\nArgoCD의 자동 동기화(auto-sync)와 자체 복구(self-heal)를 함께 켜두면, 저장소의 선언적 상태와 실제 클러스터 상태가 어긋났을 때 수동 개입 없이 원래 상태로 되돌아갑니다. prune 옵션은 저장소에서 삭제된 리소스를 클러스터에서도 함께 제거해 상태 불일치를 줄입니다.\n\n## 시크릿 관리\n평문 시크릿을 저장소에 커밋할 수 없으므로, Sealed Secrets처럼 클러스터의 공개키로 암호화한 뒤 커밋하고 클러스터 내부의 컨트롤러만 복호화할 수 있게 하는 방식이 GitOps 흐름과 자연스럽게 맞습니다.\n\n## 점검 목록\n- 클러스터 접근 자격 증명이 CI 파이프라인 바깥에 머무는가\n- 저장소 상태만으로 현재 배포된 이미지 버전을 알 수 있는가\n- 시크릿이 평문으로 저장소에 존재하지 않는가',
    'PUBLISHED', (SELECT id FROM study_category WHERE slug = 'devops'), '2026-07-23', NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM study WHERE slug = 'gitops-arm64-deployment-pipeline');

SET @study_backend  = (SELECT id FROM study WHERE slug = 'domain-module-boundary-admin-public-api-separation');
SET @study_ai       = (SELECT id FROM study WHERE slug = 'ai-feature-isolation-across-domains');
SET @study_deploy   = (SELECT id FROM study WHERE slug = 'gitops-arm64-deployment-pipeline');

INSERT IGNORE INTO study_skill (study_id, skill_id)
SELECT @study_backend, s.id FROM skill s
WHERE @study_backend IS NOT NULL AND s.name IN ('Java', 'Spring Boot', 'Spring Security', 'MySQL', 'Flyway');

INSERT IGNORE INTO study_skill (study_id, skill_id)
SELECT @study_ai, s.id FROM skill s
WHERE @study_ai IS NOT NULL AND s.name IN ('LLM', 'Spring Boot');

INSERT IGNORE INTO study_skill (study_id, skill_id)
SELECT @study_deploy, s.id FROM skill s
WHERE @study_deploy IS NOT NULL AND s.name IN ('Docker', 'Kubernetes', 'GitHub Actions');

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT @study_backend, @detail_backend WHERE @study_backend IS NOT NULL AND @detail_backend IS NOT NULL;

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT @study_ai, @detail_ai WHERE @study_ai IS NOT NULL AND @detail_ai IS NOT NULL;

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT @study_deploy, @detail_deploy WHERE @study_deploy IS NOT NULL AND @detail_deploy IS NOT NULL;
