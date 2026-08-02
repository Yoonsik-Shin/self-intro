-- V149: 최신 백엔드 아키텍처 개선 사항 반영 (Multi-Module, Dual DB, K8s Pod Separation, CQRS, Observability)
-- architecture_overview 및 architecture_layer / architecture_layer_item 최신화 & 관련 스터디(Study) 노트 링크 연결

UPDATE `architecture_overview`
SET `heading` = '시스템 아키텍처 (Self-Intro Enterprise Architecture)',
    `subheading` = '최근 3-Tier Multi-Module Microservices(core, api, ai-worker)로 백엔드를 고도화하고, Kubernetes Pod 독립 배포, Oracle 26ai Native Vector Search + MySQL HeatWave 기반 Dual DB, gRPC / RabbitMQ CQRS 이벤트 기반 아키텍처, 그리고 Prometheus & Grafana 관측 환경과 ArgoCD GitOps 무중단 배포 시스템을 완성한 전체 설계 명세입니다.',
    `diagram_heading` = '실제 운영(Production) 엔터프라이즈 아키텍처 및 배포 토폴로지 흐름도',
    `diagram_text` = ' +---------------------------------------------------------------------------------------------------------+
 |                                           [ Web Client User ]                                           |
 |                                                    |                                                    |
 |          https://unbrdn.me, www.unbrdn.me           |              https://api.unbrdn.me                 |
 |                      +-----------------------------+-----------------------------+                      |
 |                      |                                                           |                      |
 |                      v                                                           v                      |
 |            [ Cloudflare DNS Proxy + Origin CA TLS ]  <------------------------------------------------> |
 |                                                    |                                                    |
 |                                                    v (OCI Load Balancer)                                |
 |                                     [ Ingress Nginx Controller ]                                        |
 |                                   SSL/TLS Route, SSE proxy-buffering off                                |
 |  +---------------------------------------------------------------------------------------------------+  |
 |  |                                 Oracle Kubernetes Engine (OKE Cluster)                            |  |
 |  |                                                                                                   |  |
 |  |  [ Argo CD GitOps ]                  [ Sealed Secrets Controller ]    [ Prometheus & Grafana ]  |  |
 |  |    - Auto Sync / Self-Heal             - Decrypts DB/AI/Wallet Secrets   - Node Exporter & Loki    |  |
 |  |                  |                                      |                         |               |  |
 |  |                  v                                      v                         v               |  |
 |  |  +------------------------------+   +------------------------------+   +-----------------------+  |  |
 |  |  |   [ self-intro-frontend ]    |   |     [ self-intro-api ]       |   | [ self-intro-worker ] |  |  |
 |  |  |   Next.js 16 (App Router)    |   |  Spring Boot 3.5 (Java 21)   |   |  Spring AI & Scheduler|  |  |
 |  |  |   ARM64 Pod (Port 3000)      |   |  REST API / Playwright Pod   |   |  AI Worker Pod        |  |  |
 |  |  +------------------------------+   +--------------+---------------+   +-----------+-----------+  |  |
 |  |                                                    |                           |              |  |
 |  |                                                    | (JDBC Direct)             | (gRPC/mTLS)  |  |
 |  +----------------------------------------------------+---------------------------+--------------+  |
 |                                                       |                           |                 |
 |                                                       v                           v                 |
 |                                    [ Dual Database & Async Message Infrastructure ]                |
 |                                                       |                           |                 |
 |             +-----------------------------------------+         +-----------------+-------------+   |
 |             v                                                   v                               v   |
 |   [ MySQL HeatWave (Core OLTP DB) ]            [ Oracle 26ai Autonomous DB ]          [ RabbitMQ / Redis ]|
 |   - Flyway 148+ Schema Migration               - Native VECTOR & HNSW Index           - CQRS Event Broker |
 |   - Core CRUD & Domain Data                    - Hybrid Semantic Search Top-K         - Distributed Locks |
 |                                                                                                             |
 |             +---------------------------------------------------+---------------------------------------+   |
 |             v                                                   v                                           |
 |   [ NVIDIA NIM & OpenAI LLM ]                         [ OCI Object Storage (S3 호환) ]                       |
 |     Spring AI Vector Embedding                          Presigned URL Media Upload                          |
 +---------------------------------------------------------------------------------------------------------+',
    `updated_at` = NOW()
WHERE `id` = 1;

-- 기존 레이어 항목 초기화 후 신규 5개 레이어로 재구성
DELETE FROM `architecture_layer_item`;
DELETE FROM `architecture_layer`;

-- 레이어 생성
INSERT INTO `architecture_layer` (`id`, `icon`, `title`, `display_order`, `is_visible`, `created_at`, `updated_at`) VALUES
(1, '💻', 'Backend & Multi-Module Microservices', 1, 1, NOW(), NOW()),
(2, '🤖', 'AI Worker & Hybrid Vector Search', 2, 1, NOW(), NOW()),
(3, '🎨', 'Frontend & BFF Layer', 3, 1, NOW(), NOW()),
(4, '☸️', 'DevOps, Observability & GitOps', 4, 1, NOW(), NOW()),
(5, '🗄️', 'Dual Database & Data Pipeline', 5, 1, NOW(), NOW());

-- 1. Backend & Multi-Module Microservices
INSERT INTO `architecture_layer_item` (`layer_id`, `strong_text`, `body_text`, `display_order`) VALUES
(1, 'Java 21 & Spring Boot 3.5 3-Tier 멀티모듈 구조', ': core(도메인·공통), api(REST Web Service), ai-worker(비동기 AI 수집·배치) 3개 모듈로 책임을 철저히 분리 [📖 관련 스터디 노트](/study/backend-architecture-modular-k8s-pod-separation)', 0),
(1, 'K8s Pod 독립 스케일링 & Recreate 배포 전략', ': Dockerfile.api와 Dockerfile.worker로 컨테이너 빌드를 분리하여 파드별 CPU/Memory 리소스 및 배포 수명주기 독립 제어 [📖 관련 스터디 노트](/study/backend-architecture-modular-k8s-pod-separation)', 1),
(1, 'gRPC & RabbitMQ CQRS 이벤트 파이프라인', ': API 파드와 AI Worker 파드 간 gRPC 통신 및 RabbitMQ 비동기 이벤트 발행으로 명령(Command)과 조회(Query) 관심사 격리 [📖 관련 스터디 노트](/study/msa-grpc-rabbitmq-cqrs-architecture)', 2),
(1, 'Spring Security & Nginx auth_request 서브루틴', ': /api/admin/** 권한 제어 및 쿠키 기반 SSO 토큰 검증 서브루틴으로 경계 보안 강화', 3),
(1, 'Spring Data JPA & QueryDSL 타입세이프 쿼리', ': 동적 검색, 다중 조건 필터링 및 대용량 배치 처리를 컴파일 타임 검증 가능한 타입 세이프 쿼리로 최적화', 4);

-- 2. AI Worker & Hybrid Vector Search
INSERT INTO `architecture_layer_item` (`layer_id`, `strong_text`, `body_text`, `display_order`) VALUES
(2, 'Oracle 26ai Native VECTOR & HNSW Index', ': Oracle Database 26ai의 Native VECTOR(1536, FLOAT32) 데이터 타입과 HNSW 코사인 인덱스 기반 고성능 벡터 검색 구현 [📖 관련 스터디 노트](/study/oracle-26ai-vector-search-msa-dual-db-architecture)', 0),
(2, 'VECTOR_DISTANCE 코사인 유사도 Top-K 하이브리드 검색', ': JPA 네이티브 쿼리로 키워드 검색과 벡터 유사도 검색을 결합한 Hybrid RAG 파이프라인 탑재 [📖 관련 스터디 노트](/study/oracle-26ai-vector-search-msa-dual-db-architecture)', 1),
(2, 'Spring AI & NVIDIA NIM LLM 연동', ': text-embedding-3-small 기반 임베딩 및 NVIDIA NIM LLM 초안 생성 지원, API 실패 시 텍스트 해시 기반 결정론적 단위벡터 폴백 보장', 2),
(2, 'K8s mTLS Wallet Volume Mount', ': Oracle ATP 보안 연결을 위한 mTLS 전자지갑(Wallet)을 Kubernetes Secret으로 마운트하고 TNS_ADMIN 경로 자동 주입 [📖 관련 스터디 노트](/study/oracle-26ai-vector-search-msa-dual-db-architecture)', 3);

-- 3. Frontend & BFF Layer
INSERT INTO `architecture_layer_item` (`layer_id`, `strong_text`, `body_text`, `display_order`) VALUES
(3, 'Next.js 16 (App Router) & React 19 & TypeScript', ': (public)과 admin 라우트 그룹 분리, SSR/BFF 중계 렌더링으로 번들 사이즈 최적화 및 빠른 LCP 달성', 0),
(3, 'Zustand & TanStack Query 전역 상태 및 API 캐싱', ': 클라이언트 전역 상태와 비동기 데이터 캐싱/재요청을 결합하여 반응형 UI 제공', 1),
(3, '인터랙티브 포트폴리오 아키텍처 대시보드', ': Visual Flow 노드 다이어그램 ↔ ASCII Terminal 전환 토글 뷰어 및 레이어 필터 탭 시스템 구축', 2),
(3, '브라우저 완결형 PDF/인쇄 내보내기 엔진', ': 서버 렌더러 없이 클라이언트 브라우저 단에서 섹션·스킬 선택 및 A4 페이지 분할 계산 완결', 3);

-- 4. DevOps, Observability & GitOps
INSERT INTO `architecture_layer_item` (`layer_id`, `strong_text`, `body_text`, `display_order`) VALUES
(4, 'Oracle Kubernetes Engine (OKE) & ARM64 파이프라인', ': GitHub Actions 기반 ARM64 네이티브 Docker 이미지 빌드 및 OCIR 자동 푸시', 0),
(4, 'ArgoCD 무중단 GitOps 배포 파이프라인', ': OKE 클러스터 상의 ArgoCD가 GitHub 레포지토리를 상시 감시하며 Auto-Sync / Self-Heal로 무중단 배포 유지 [📖 관련 스터디 노트](/study/k8s-ingress-crio-logging-architecture-refactoring)', 1),
(4, 'Prometheus + Grafana + Node Exporter 통합 관측성', ': Kubernetes Cluster 노드/파드 메트릭, JVM 메모리/CPU 지표 및 Grafana Loki/Alloy 중앙 로그 관측망 정착 [📖 관련 스터디 노트](/study/kubernetes-node-exporter-grafana-dashboard-deep-dive)', 2),
(4, 'Cloudflare TLS + Ingress Nginx & Sealed Secrets', ': unbrdn.me Origin CA SSL 터널링 및 SSE 스트리밍 proxy-buffering off 설정, Sealed Secrets 비대칭 암호화 형상 관리', 3);

-- 5. Dual Database & Data Pipeline
INSERT INTO `architecture_layer_item` (`layer_id`, `strong_text`, `body_text`, `display_order`) VALUES
(5, 'MySQL HeatWave (Core OLTP) + Oracle 26ai (Vector AI) Dual DB', ': 메인 CRUD 트랜잭션과 AI 임베딩 벡터 검색의 DB 역할을 분리한 2원화 MSA DB 데이터 저장소 구축 [📖 관련 스터디 노트](/study/oracle-26ai-vector-search-msa-dual-db-architecture)', 0),
(5, 'Flyway 148+ 버전 스키마 마이그레이션 관리', ': V1 초기 스키마부터 V148 벡터 검색 및 V149 아키텍처 갱신까지 마이그레이션 이력을 엄격 통제', 1),
(5, 'Oracle Object Storage (운영) / MinIO (로컬) S3 호환 스토리지', ': Presigned URL 기반 브라우저 직접 보안 업로드 및 데이터베이스 ObjectKey 영속화 패턴 적용', 2);
