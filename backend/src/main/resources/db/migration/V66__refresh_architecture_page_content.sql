-- V66: Refresh the site's own "system architecture" page (architecture_overview/layer/item)
-- to match the current implementation. The content seeded in V25/V26 had drifted: it still
-- described a Vite+React frontend on Cloudflare Pages and Spring Boot 3.3, neither of which
-- matches the current repository.
--
-- Evidence boundary (same sources as V65's header, plus):
-- - Frontend is Next.js 16 (frontend-next/package.json), not Vite/React alone.
-- - Frontend is NOT static-hosted on Cloudflare Pages: deploy/k8s/overlays/prod/frontend/
--   ingress.yaml routes unbrdn.me/www.unbrdn.me to a self-intro-frontend Service (port 3000)
--   behind the same ingress-nginx + Cloudflare Origin CA cert as the backend
--   (api.unbrdn.me, deploy/k8s/overlays/prod/backend/ingress.yaml), and
--   deploy/argocd/applications/frontend-prod.yaml is a separate auto-synced ArgoCD Application
--   deploying that image from OCIR - i.e. the frontend is containerized on OKE like the backend.
-- - backend/build.gradle: Spring Boot 3.5, Java 21.
-- - 64 migrations existed before this one (V1-V64); V65 (this same change set) adds one more.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE architecture_overview
SET subheading = '이 포트폴리오 웹앱의 11개 도메인 모듈로 나뉜 백엔드, Next.js 프론트엔드, 도메인별로 격리된 LLM 콘텐츠 생성과 Ko-fi 후원 연동, 그리고 Kubernetes·ArgoCD 기반 GitOps 배포 인프라까지 담은 설계 명세입니다.',
    diagram_heading = '실제 운영(Production) 시스템 아키텍처 및 배포 흐름도',
    diagram_text = ' +-----------------------------------------------------------------------------------------+
 |                                    [ Web Client User ]                                  |
 |                                             |                                           |
 |         https://unbrdn.me, www.unbrdn.me    |    https://api.unbrdn.me                 |
 |                     +-----------------------+-----------------------+                   |
 |                     |                                               |                   |
 |                     v                                               v                   |
 |           [ Cloudflare DNS Proxy + Origin CA TLS ]  <-------------------------------->  |
 |                                             |                                           |
 |                                             | OCI Load Balancer                         |
 |                                             v                                           |
 |                              [ Ingress Nginx Controller ]                               |
 |                            SSL/TLS Route, SSE proxy-buffering off                       |
 |  +-----------------------------------------------------------------------------------+  |
 |  |                          Oracle Kubernetes Engine (OKE Cluster)                   |  |
 |  |                                                                                   |  |
 |  |   [ Argo CD (backend / frontend Applications) ]   [ Sealed Secrets Controller ]   |  |
 |  |     - Watches GitHub repo, auto sync/prune/self-heal - Decrypts DB/AI/Ko-fi/      |  |
 |  |                    |                                    Storage secrets           |  |
 |  |                    v                                          |                   |  |
 |  |   +---------------------------+     +---------------------------+                 |  |
 |  |   | [ self-intro-frontend ]   |     | [ self-intro-backend ]     |                 |  |
 |  |   |  Next.js 16 (App Router)  |     |  Spring Boot 3.5 (Java 21) |                 |  |
 |  |   |  ARM64 pod, port 3000     |     |  ARM64 pod, port 8080      |                 |  |
 |  |   +---------------------------+     +--------------|-------------+                 |  |
 |  +------------------------------------------------------|--------------------------------+  |
 |                                                          | JDBC (OCI VCN Private Subnet)     |
 |                                                          v                                   |
 |                                   [ MySQL HeatWave Database (Always Free) ]                  |
 |                                     - Flyway가 관리하는 스키마, 65개 버전 이력                   |
 |                                                          |                                    |
 |                              +---------------------------+----------------------------+       |
 |                              v                                                        v       |
 |                [ NVIDIA NIM (외부 LLM API) ]                       [ OCI Object Storage (S3 호환) ]
 |                  Spring AI 경유, 도메인별 기능 플래그로 격리              Presigned URL 업로드
 |                                                                                                |
 |                              ^                                                                 |
 |                              | Webhook (verification-token 검증)                               |
 |                       [ Ko-fi 후원 결제 ]                                                       |
 +-----------------------------------------------------------------------------------------+'
ORDER BY id
LIMIT 1;

DELETE FROM architecture_layer_item WHERE layer_id IN (
    SELECT id FROM (
        SELECT id FROM architecture_layer
        WHERE title IN ('Backend Layer', 'Frontend Layer', 'Database & Data Management', 'DevOps & GitOps')
    ) l
);

INSERT INTO architecture_layer_item (layer_id, strong_text, body_text, display_order)
SELECT l.id, v.strong_text, v.body_text, v.display_order
FROM architecture_layer l
JOIN (
    SELECT 'Backend Layer' AS layer_title, 'Java 21 & Spring Boot 3.5' AS strong_text, ': ai·architecture·competency·donation·experience·printtemplate·profile·skill·storage·visitor·study까지 11개 도메인 모듈로 분리해 구축' AS body_text, 0 AS display_order
    UNION ALL SELECT 'Backend Layer', 'Spring Security 세션 인증', ': /api/admin/**를 ROLE_ADMIN 전용으로 제한하고 공개 GET은 화이트리스트로 개방, CSRF 쿠키 필터 적용', 1
    UNION ALL SELECT 'Backend Layer', 'Spring Data JPA & QueryDSL', '로 동적 검색·필터링 쿼리를 타입 세이프하게 처리', 2
    UNION ALL SELECT 'Backend Layer', 'NVIDIA NIM 기반 AI 초안 생성', ': competency·experience·study 3개 모듈이 공용 LLM 클라이언트를 쓰되 도메인별 기능 플래그로 독립 on/off, SSE 스트리밍 지원', 3
    UNION ALL SELECT 'Backend Layer', 'Ko-fi 웹훅 후원 결제', ': verification-token 검증과 거래 ID 단위 락으로 중복 반영을 막고 다통화·구독 후원을 지원', 4

    UNION ALL SELECT 'Frontend Layer', 'Next.js 16 (App Router) & React 19 & TypeScript', ': (public)/admin 라우트 그룹으로 공개 페이지와 관리자 CMS를 분리', 0
    UNION ALL SELECT 'Frontend Layer', 'Zustand & TanStack Query', '를 조합한 프론트 전역 상태 및 비동기 API 캐시 제어', 1
    UNION ALL SELECT 'Frontend Layer', '브라우저 완결형 인쇄/PDF 내보내기', ': 섹션·스킬 선택 → 페이지 분할 계산 → 서버 템플릿 저장까지 클라이언트에서 처리, 별도 PDF 렌더 서버 없음', 2
    UNION ALL SELECT 'Frontend Layer', '관리자 CMS 연동 API 클라이언트', ': profile·skill·experience·study·competency·architecture·donation·visitor 등 전체 콘텐츠를 관리자 화면에서 실시간 편집', 3

    UNION ALL SELECT 'Database & Data Management', 'Flyway 마이그레이션 65개 버전', '으로 V1 초기 스키마부터 이 페이지의 콘텐츠 갱신(V66)까지 스키마 변경 이력을 전부 추적', 0
    UNION ALL SELECT 'Database & Data Management', 'MySQL HeatWave Always Free(운영) / MySQL 8.0 컨테이너(로컬) 이원화', ': 로컬은 JPA_DDL_AUTO=update, 운영은 Flyway 단독으로 스키마 변경을 엄격히 통제', 1
    UNION ALL SELECT 'Database & Data Management', '프로필·스킬·경력·역량·Study·아키텍처·후원 전 콘텐츠의 DB 관리', ': 지금 보고 있는 이 페이지도 하드코딩이 아니라 관리자 화면에서 편집하는 DB 콘텐츠', 2
    UNION ALL SELECT 'Database & Data Management', 'Oracle Object Storage(운영) / MinIO(로컬) S3 호환 스토리지', ': Presigned URL 발급 후 브라우저가 직접 업로드하고 DB에는 objectKey만 저장', 3

    UNION ALL SELECT 'DevOps & GitOps', 'GitHub Actions & OCIR', ': 백엔드·프론트엔드 각각 ARM64 네이티브 이미지를 빌드해 Oracle OCI Registry에 배포하고 Kustomize 이미지 태그를 main에 재커밋', 0
    UNION ALL SELECT 'DevOps & GitOps', 'ArgoCD 자동 동기화', ': backend/frontend 두 Application이 각각 auto-sync·prune·self-heal로 OKE 클러스터에 무중단 반영', 1
    UNION ALL SELECT 'DevOps & GitOps', 'Sealed Secrets 분리 암호화', ': DB·AI(NVIDIA API 키)·Ko-fi·Storage 자격증명을 각각 비대칭 키로 암호화해 Git에 안심하고 형상 관리', 2
    UNION ALL SELECT 'DevOps & GitOps', 'Cloudflare + Ingress Nginx 단일 진입점', ': unbrdn.me/www.unbrdn.me(프론트)와 api.unbrdn.me(백엔드) 모두 Origin CA 인증서를 쓰는 동일 ingress 뒤에서 서빙, SSE 스트리밍을 위한 프록시 버퍼링 해제 설정 포함', 3
) v ON v.layer_title = l.title;
