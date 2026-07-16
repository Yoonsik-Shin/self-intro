CREATE TABLE architecture_overview (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    heading VARCHAR(200) NOT NULL,
    subheading VARCHAR(500) NOT NULL,
    diagram_heading VARCHAR(200) NOT NULL,
    diagram_text TEXT NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE architecture_layer (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    icon VARCHAR(16) NOT NULL,
    title VARCHAR(120) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE architecture_layer_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    layer_id BIGINT NOT NULL,
    strong_text VARCHAR(200) NULL,
    body_text VARCHAR(500) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_architecture_layer_item_layer FOREIGN KEY (layer_id) REFERENCES architecture_layer (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO architecture_overview (heading, subheading, diagram_heading, diagram_text, updated_at) VALUES (
'시스템 아키텍처 (Self-Intro Architecture)',
'이 포트폴리오 웹앱을 구동하고 데이터를 서빙하는 풀스택 컨테이너 인프라 설계 명세입니다.',
'실제 운영(Production) 시스템 아키텍처 및 배포 흐름도',
' +-----------------------------------------------------------------------------------------+
 |                                    [ Web Client User ]                                  |
 |                                             |                                           |
 |                       https://unbrdn.me     |     https://api.unbrdn.me                 |
 |                     +-----------------------+-----------------------+                   |
 |                     |                                               |                   |
 |                     v                                               v                   |
 |           [ Cloudflare Pages ]                            [ Cloudflare DNS Proxy ]      |
 |           - Frontend Static Hosting                                 |                   |
 |           - Worldwide Edge Caching                                  | OCI Load Balancer |
 |                                                                     v                   |
 |                                                          [ Ingress Nginx Controller ]   |
 |                                                                     | SSL / TLS Route   |
 |                                                                     v                   |
 |  +-----------------------------------------------------------------------------------+  |
 |  |                          Oracle Kubernetes Engine (OKE Cluster)                   |  |
 |  |                                                                                   |  |
 |  |   [ Argo CD Engine ]                 [ Sealed Secrets Controller ]                |  |
 |  |     - Watches GitHub Repository        - Decrypts encrypted DB Secrets            |  |
 |  |     - Automated git sync to cluster                                               |  |
 |  |                    |                                 |                            |  |
 |  |                    v                                 v                            |  |
 |  |        +-------------------------------------------------------+                  |  |
 |  |        |                  [ self-intro-backend-pod ]           |                  |  |
 |  |        |     - Spring Boot 3.3.3 API Server (Java 21 JRE)      |                  |  |
 |  |        |     - Runs on ARM64 Ampere A1 Compute Instance        |                  |  |
 |  |        +-------------------------------------------------------+                  |  |
 |  |                                    |                                              |  |
 |  +------------------------------------|----------------------------------------------+  |
 |                                       | JDBC Connector (OCI VCN Private Subnet)          |
 |                                       v                                                 |
 |                   [ MySQL HeatWave Database (Always Free) ]                             |
 |                     - Persistent relational database store                              |
 |                     - Flyway schema & SampleDataLoader automatic seeds                  |
 +-----------------------------------------------------------------------------------------+',
NOW());

INSERT INTO architecture_layer (icon, title, display_order, is_visible, created_at, updated_at) VALUES
('💻', 'Backend Layer', 1, TRUE, NOW(), NOW()),
('🎨', 'Frontend Layer', 2, TRUE, NOW(), NOW()),
('☸️', 'DevOps & GitOps', 3, TRUE, NOW(), NOW());

INSERT INTO architecture_layer_item (layer_id, strong_text, body_text, display_order)
SELECT l.id, v.strong_text, v.body_text, v.display_order
FROM architecture_layer l
JOIN (
    SELECT 1 AS layer_order, 'Java 21 & Spring Boot 3.3' AS strong_text, ' 기반의 안정적인 API 서비스 구축' AS body_text, 0 AS display_order
    UNION ALL SELECT 1, 'Spring Data JPA', ' 및 H2/MySQL 데이터베이스 통합 제어', 1
    UNION ALL SELECT 1, 'Flyway 스키마 마이그레이션', '을 활용해 실행 시 DDL 데이터 자동 적재 및 버전 제어', 2
    UNION ALL SELECT 1, 'SampleDataLoader', '를 통해 로컬/인메모리 시작 시 테스트용 개발 이력 시드 자동 세팅', 3
    UNION ALL SELECT 2, 'React 19 & TypeScript & Vite', ' 환경의 고성능 컴파일러 및 리플로우 최적화', 0
    UNION ALL SELECT 2, 'Zustand & TanStack Query', '를 조합한 프론트 전역 상태 및 비동기 API 캐시 제어', 1
    UNION ALL SELECT 2, 'Tailwind CSS (Vanilla CSS 폴백)', ' 미드나잇 글래스모피즘 프리미엄 UI 디자인 테마', 2
    UNION ALL SELECT 2, 'PDF 인쇄 미디어 쿼리', ' 최적화로 브라우저 상의 인쇄 레이아웃 단일 이력서 규격화', 3
    UNION ALL SELECT 3, 'Cloudflare Pages CDN', ': 프론트엔드 정적 빌드 파일을 전 세계 엣지 노드에 초고속 캐싱 및 배포', 0
    UNION ALL SELECT 3, 'GitHub Actions & OCIR', ': 백엔드 푸시 시 ARM64 네이티브 컨테이너 이미지 자동 빌드 및 Oracle OCI Registry 배포', 1
    UNION ALL SELECT 3, 'Argo CD 자동 동기화', ': k8s 배포 매니페스트 변경을 Argo CD가 실시간 감지하여 OKE 클러스터에 무중단 롤아웃 배포', 2
    UNION ALL SELECT 3, 'Sealed Secrets 보안', ': DB 비밀번호 등 민감 데이터를 비대칭 키로 안전하게 암호화하여 Git에 안심하고 형상 관리', 3
) v ON v.layer_order = l.display_order;
