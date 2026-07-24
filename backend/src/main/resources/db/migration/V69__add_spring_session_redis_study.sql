-- V69: Add Spring Security 6 & Spring Session Redis Distributed Auth Study note.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ensure 'backend' category exists if not found
INSERT IGNORE INTO study_category (name, slug, display_order)
VALUES ('백엔드', 'backend', 4);

SET @backend_category_id = (
    SELECT id FROM study_category WHERE slug = 'backend' OR name = '백엔드' OR name = 'Backend' LIMIT 1
);

SET @backend_category_id = IFNULL(@backend_category_id, (SELECT id FROM study_category LIMIT 1));

INSERT INTO study (
    slug,
    title,
    summary,
    content_markdown,
    status,
    category_id,
    learned_at,
    published_at,
    created_at,
    updated_at
) VALUES (
    'spring-security-session-redis-distributed-auth-architecture',
    'Spring Security 6 & Spring Session Redis 기반 분산 로그인 세션 아키텍처 설계',
    '단일 서버의 In-Memory 세션 구조를 Spring Security 6, AuthService 유스케이스 분리 및 Spring Session Redis로 고도화하고, Kubernetes(k8s) 무상태(Stateless) Pod 스케일아웃 배포 환경을 구축한 과정을 다룹니다.',
    '# Spring Security 6 & Spring Session Redis 기반 분산 로그인 세션 아키텍처 설계\n\n## 1. 개요 및 배경\n본 아키텍처 연구 노트는 `self-intro` 서비스의 로그인 인증 체계를 단일 서버 메모리 기반(In-Memory Session)에서 **Spring Security 6 native DSL**, **`AuthService` 유스케이스 계층 분리**, 그리고 **Spring Session Redis 기반 분산 세션 관리**로 고도화하고, **Kubernetes(k8s) Pod 스케일아웃(Scale-out) 무상태 배포**를 달성한 아키텍처 설계와 구현에 대해 정밀하게 다룹니다.\n\n```mermaid\ngraph TD\n    subgraph Client [사용자 브라우저]\n        Req[HTTP Request + JSESSIONID 쿠키]\n    end\n\n    subgraph K8s [Kubernetes Cluster]\n        Ingress[Ingress NGINX Gateway]\n        Pod1[Spring Boot Backend Pod 1]\n        Pod2[Spring Boot Backend Pod 2]\n    end\n\n    subgraph DistributedInfra [중앙 인프라]\n        Redis[(Spring Session Redis)]\n        DB[(MySQL Database)]\n    end\n\n    Req -->|Round-Robin| Ingress\n    Ingress -->|Dispatched| Pod1\n    Ingress -->|Dispatched| Pod2\n    Pod1 <-->|Spring Session Filter| Redis\n    Pod2 <-->|Spring Session Filter| Redis\n    Pod1 -->|JPA| DB\n    Pod2 -->|JPA| DB\n```\n\n---\n\n## 2. 문제 제기 및 기존 구조의 한계\n\n### 2.1. 단일 서버 In-Memory 세션의 스케일아웃 한계\n- 기존 구현은 Embedded Tomcat의 `HttpSession` 메모리에 세션을 저장했습니다.\n- 백엔드 Pod를 2대 이상으로 세우고 L4/L7 로드밸런서를 연결할 경우, Pod 1에서 로그인한 사용자의 다음 요청이 Pod 2로 전달되면 세션을 찾지 못해 `401 Unauthorized`가 발생하는 세션 파편화(Session Fragmentation) 문제가 존재했습니다.\n\n### 2.2. Presentation Layer에 노출된 인증 유스케이스\n- Controller 레벨에서 `AuthenticationManager` 인증과 `SecurityContextRepository.saveContext()` 저장을 직접 다루어 프레젠테이션 레이어의 캡슐화가 훼손되는 문제가 있었습니다.\n\n---\n\n## 3. 핵심 아키텍처 설계 및 구현\n\n### 3.1. `AuthService` (Application Service) 유스케이스 분리\n`AuthController`는 단순 API 엔드포인트 수신 역할만 수행하고, 로그인 인증 및 세션 저장 흐름은 `AuthService`로 격리했습니다.\n\n```java\n@Service\n@RequiredArgsConstructor\npublic class AuthService {\n\n    private final AuthenticationManager authenticationManager;\n    private final SecurityContextRepository securityContextRepository;\n\n    public void login(\n            String username,\n            String password,\n            HttpServletRequest httpRequest,\n            HttpServletResponse httpResponse) {\n        // 1. 아이디/비밀번호 검증 (BCrypt + UserDetailsService)\n        Authentication authentication =\n                authenticationManager.authenticate(\n                        new UsernamePasswordAuthenticationToken(username, password));\n\n        // 2. 비어있는 깨끗한 SecurityContext 생성 및 쓰레드 등록\n        SecurityContext context = SecurityContextHolder.createEmptyContext();\n        context.setAuthentication(authentication);\n        SecurityContextHolder.setContext(context);\n\n        // 3. 세션 저장소에 컨텍스트 저장 및 JSESSIONID 쿠키 발급\n        securityContextRepository.saveContext(context, httpRequest, httpResponse);\n    }\n}\n```\n\n### 3.2. Spring Session Redis 분산 세션 통합\n- `spring-session-data-redis` 의존성을 연결하고 `RedisConfig`를 전역 인프라로 구성했습니다.\n- `@ConditionalOnProperty(name = \"spring.session.store-type\", havingValue = \"redis\")` 및 `@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 43200)`을 적용하여, 프로덕션/도커 환경에서는 중앙 Redis가 세션을 통제하도록 구성했습니다.\n\n### 3.3. Kubernetes (k8s) GitOps & 무상태 Pod 배포\n- `deploy/k8s/base/redis/`에 Redis Deployment 및 Service 매니페스트를 선언했습니다.\n- `deploy/k8s/overlays/prod/backend/kustomization.yaml`에 `SPRING_SESSION_STORE_TYPE=redis`, `REDIS_HOST=self-intro-redis`를 주입하여 Argo CD를 통한 자동화된 GitOps 배포 파이프라인을 완료했습니다.\n\n---\n\n## 4. 인프라 대안 및 엔터프라이즈 프로덕션 트레이드오프\n\n### 4.1. 현재 배포 구조의 한계 및 금전적 제약 (Cost Efficiency)\n- 현재 `self-intro` 서비스는 개인 포트폴리오 및 오라클 클라우드 프리티어(OCI Free Tier) 인프라 환경의 **금전적 예산 제약(Cost Constraints)**을 고려하여 단일 Redis Pod (`redis:7-alpine`) 서비스로 구현되었습니다.\n- 단일 Redis Pod 환경에서는 Redis 노드 장애 발생 시 세션 데이터 복구 전까지 일시적인 세션 끊김(Session Loss)이 발생할 수 있는 아키텍처적 유일한 단점(Single Point of Failure, SPOF)이 존재합니다.\n\n### 4.2. 엔터프라이즈 대규모 프로덕션 환경에서의 권장 아키텍처\n만약 예산 제약이 없는 엔터프라이즈 환경이었다면 다음과 같은 아키텍처 구성이 훨씬 적절합니다:\n1. **Multi-Node Cluster / Distributed Sentinel 연동**:\n   - Kubernetes Node Pool의 노드 수량을 3개 이상으로 확장하고, 각 노드에 Redis Pod를 분산 배치하여 Sentinel 피어링 혹은 Redis Cluster 샤딩을 구축합니다.\n2. **Managed Redis Service (ElastiCache / OCI Cache for Redis)**:\n   - AWS ElastiCache 또는 OCI Cache for Redis와 같은 클라우드 관리형 Redis 서비스를 이용함으로써 Multi-AZ 자동 장애 조치(Auto-Failover), 자동 백업 및 패치를 클라우드 벤더사 레벨에서 보장받도록 설계하는 것이 가장 안정적인 프로덕션 아키텍처입니다.\n\n---\n\n## 5. 성과 및 인사이트\n- **Stateless Pod Scale-Out 달성**: 세션을 중앙 Redis로 일원화하여 백엔드 Pod 수량(`replicas`)에 상관없이 100% 무상태(Stateless) 인프라로 전환되었습니다.\n- **테스트 격리성 확보**: 로컬 및 CI 테스트 환경에서는 `spring.session.store-type=none`으로 자동 오프라인 격리 처리하여 외부 Redis 없이 빠르게 빌드가 수행되도록 설계했습니다.\n',
    'PUBLISHED',
    @backend_category_id,
    '2026-07-24',
    '2026-07-24 23:00:00',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    summary = VALUES(summary),
    content_markdown = VALUES(content_markdown),
    status = VALUES(status),
    category_id = VALUES(category_id),
    learned_at = VALUES(learned_at),
    published_at = VALUES(published_at),
    updated_at = NOW();

SET @study_id = (
    SELECT id FROM study WHERE slug = 'spring-security-session-redis-distributed-auth-architecture' LIMIT 1
);

-- Map Skills
INSERT IGNORE INTO study_skill (study_id, skill_id)
SELECT @study_id, id FROM skill WHERE name IN ('Java', 'Spring Boot', 'Spring Security', 'Redis', 'Docker Compose', 'Kubernetes', 'Docker');

-- Map Tags
INSERT IGNORE INTO tag (name, slug) VALUES
('Backend', 'backend-tag'),
('Spring Security', 'spring-security'),
('Redis', 'redis'),
('Session', 'session'),
('Kubernetes', 'kubernetes'),
('GitOps', 'gitops');

INSERT IGNORE INTO study_tag (study_id, tag_id)
SELECT @study_id, id FROM tag WHERE slug IN ('backend-tag', 'spring-security', 'redis', 'session', 'kubernetes', 'gitops') OR name IN ('Backend', 'Spring Security', 'Redis', 'Session', 'Kubernetes', 'GitOps');
