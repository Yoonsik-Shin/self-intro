UPDATE architecture_overview
SET subheading = '이 포트폴리오 웹앱의 도메인 모듈 구조, DB 데이터 관리 방식, 그리고 Cloudflare·오라클 Free Tier 기반 배포 인프라까지 담은 설계 명세입니다.';

UPDATE architecture_layer SET display_order = 4 WHERE title = 'DevOps & GitOps';

INSERT INTO architecture_layer (icon, title, display_order, is_visible, created_at, updated_at)
VALUES ('🗄️', 'Database & Data Management', 3, TRUE, NOW(), NOW());

DELETE FROM architecture_layer_item WHERE layer_id IN (
    SELECT id FROM architecture_layer WHERE title IN ('Backend Layer', 'Frontend Layer', 'DevOps & GitOps')
);

INSERT INTO architecture_layer_item (layer_id, strong_text, body_text, display_order)
SELECT l.id, v.strong_text, v.body_text, v.display_order
FROM architecture_layer l
JOIN (
    SELECT 'Backend Layer' AS layer_title, 'Java 21 & Spring Boot 3.3' AS strong_text, ' 기반의 API 서버를 auth·bff·study와 11개 도메인 모듈(profile, skill, experience, competency, architecture 등)로 분리해 구축' AS body_text, 0 AS display_order
    UNION ALL SELECT 'Backend Layer', 'Spring Data JPA & QueryDSL', '로 동적 검색·필터링 쿼리를 타입 세이프하게 처리', 1
    UNION ALL SELECT 'Backend Layer', 'BFF(Backend For Frontend) 집계 계층', '이 여러 도메인 응답을 화면 단위로 합쳐 프론트에 단일 API로 제공', 2
    UNION ALL SELECT 'Backend Layer', 'NVIDIA NIM 기반 AI 초안 생성', ': competency·experience·study 3개 모듈에 공통 LLM 클라이언트를 연동해 SSE 스트리밍으로 콘텐츠 초안 제안', 3

    UNION ALL SELECT 'Frontend Layer', 'React 19 & TypeScript & Vite', ' 환경의 고성능 컴파일러 및 리플로우 최적화', 0
    UNION ALL SELECT 'Frontend Layer', 'Zustand & TanStack Query', '를 조합한 프론트 전역 상태 및 비동기 API 캐시 제어', 1
    UNION ALL SELECT 'Frontend Layer', '관리자 CMS 연동 API 클라이언트 11종', ': profile, skill, experience, study, competency, architecture, visitor 등 전체 콘텐츠를 관리자 화면에서 실시간 편집', 2
    UNION ALL SELECT 'Frontend Layer', 'Presigned URL 이미지 업로드', ': 브라우저가 오브젝트 스토리지에 파일을 직접 전송하고 백엔드는 objectKey만 저장', 3
    UNION ALL SELECT 'Frontend Layer', 'PDF 인쇄 미디어 쿼리', ' 최적화로 브라우저 상의 인쇄 레이아웃 단일 이력서 규격화', 4

    UNION ALL SELECT 'Database & Data Management', 'Flyway 마이그레이션 25개 버전', '으로 V1 초기 스키마부터 이 페이지의 콘텐츠 테이블(V25)까지 스키마 변경 이력을 전부 추적', 0
    UNION ALL SELECT 'Database & Data Management', 'MySQL HeatWave Always Free(운영) / MySQL 8.0 컨테이너(로컬) 이원화', ': 로컬은 JPA_DDL_AUTO=update, 운영은 Flyway 단독(JPA_DDL_AUTO=none)으로 스키마 변경을 엄격히 통제', 1
    UNION ALL SELECT 'Database & Data Management', '프로필, 스킬, 경력, 역량, Study, 아키텍처 전 콘텐츠의 DB 관리', ': 지금 보고 있는 이 페이지도 하드코딩이 아니라 관리자 화면에서 편집하는 DB 콘텐츠', 2
    UNION ALL SELECT 'Database & Data Management', 'Oracle Object Storage(운영) / MinIO(로컬) S3 호환 스토리지', ': Presigned URL 발급 후 브라우저가 직접 업로드하고 DB에는 objectKey만 저장', 3

    UNION ALL SELECT 'DevOps & GitOps', 'Cloudflare Pages CDN', ': 프론트엔드 정적 빌드 파일을 전 세계 엣지 노드에 초고속 캐싱 및 배포', 0
    UNION ALL SELECT 'DevOps & GitOps', 'GitHub Actions & OCIR', ': 백엔드 푸시 시 ARM64 네이티브 컨테이너 이미지 자동 빌드 및 Oracle OCI Registry 배포', 1
    UNION ALL SELECT 'DevOps & GitOps', 'Argo CD 자동 동기화', ': k8s 배포 매니페스트 변경을 Argo CD가 실시간 감지하여 OKE 클러스터에 무중단 롤아웃 배포', 2
    UNION ALL SELECT 'DevOps & GitOps', 'Sealed Secrets 3종 분리 암호화', ': DB·AI(NVIDIA API 키)·Storage 자격증명을 각각 비대칭 키로 암호화해 Git에 안심하고 형상 관리', 3
    UNION ALL SELECT 'DevOps & GitOps', '단일 Ampere A1 노드 자원 타이트 튜닝', ': Backend Pod(요청 250m CPU·512Mi, 제한 1 CPU·1Gi)와 ingress-nginx(요청 100m CPU·128Mi)까지 Always Free 한도 안에서 세밀 조정', 4
) v ON v.layer_title = l.title;
