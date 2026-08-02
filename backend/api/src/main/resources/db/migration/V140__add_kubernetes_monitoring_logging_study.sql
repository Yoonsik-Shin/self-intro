-- Kubernetes 환경의 Ingress Webhook 정책, CRI-O 이미지 풀링 오류 및 12-Factor App 기반 로깅 아키텍처 개선을 다루는 스터디 노트 추가.

INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'k8s-ingress-crio-logging-architecture-refactoring',
  'Kubernetes Ingress 보안 정책, CRI-O FQDN 및 12-Factor App 로깅 아키텍처 개선',
  'Kubernetes 환경에서 ArgoCD 배포 중 발생한 Ingress Webhook 정책 거부, CRI-O 단축명 이미지 풀링 실패, Logback 파일 생성 실패 예외의 근본 원인을 분석하고 12-Factor App 기반 콘솔 로깅(STDOUT) 및 Grafana Alloy/Loki 통합 수집 아키텍처로 개선한 과정을 다룹니다.',
  '# Kubernetes Ingress 보안 정책, CRI-O FQDN 및 12-Factor App 로깅 아키텍처 개선

## 1. 개요 및 배경

Self-Intro 포트폴리오 프로젝트의 Kubernetes 운영 환경 구축 및 ArgoCD 지속적 배포(CD) 과정에서 발생한 모니터링/로깅 스택(Grafana, Loki, Prometheus, Grafana Alloy) 배포 장애 요소를 조치하고, 12-Factor App 클라우드 네이티브 모범 사례에 맞춰 로깅 아키텍처를 근본적으로 개편한 기록입니다.

---

## 2. 문제 상황 및 근본 원인 분석

### 1) NGINX Ingress Webhook 정책 거부 (`SyncFailed`)
ArgoCD에서 `grafana-ingress` 리소스 동기화 시 `SyncFailed` 예외가 발생했습니다.
- **원인**: Ingress NGINX Controller 보안 강화 정책(CVE-2021-25742 차단)에 의해 `allow-snippet-annotations: false` 설정이 활성화되면서 `nginx.ingress.kubernetes.io/configuration-snippet` 어노테이션을 통한 임의 Nginx 설정 주입이 Admission Webhook 단계에서 거부되었습니다.

### 2) 모니터링 Pod 이미지 풀링 실패 (`ImageInspectError`)
`grafana-alloy` (DaemonSet) 및 `prometheus` (Deployment) 파드가 `0/1 ImageInspectError` 상태로 멈춰 섰습니다.
- **원인**: 쿠버네티스 노드의 컨테이너 런타임(CRI-O / Podman)에 `short-name-mode: enforcing` 보안 정책이 기본 적용되어 있어 `grafana/alloy:v1.0.0`, `prom/prometheus:v2.54.0`과 같이 레지스트리 도메인이 생략된 단축 이름(Short Name) 이미지 Pull을 거부하였습니다.

### 3) Logback 파일 생성 실패 예외 및 로깅 아키텍처 불일치
Spring Boot 백엔드가 구동은 되었으나 표준 에러(`STDERR`)에 `FileNotFoundException: /app/logs/application.log` 예외가 지속적으로 출력되었습니다.
- **원인**: `application.yml`의 `logging.file.name: ${LOG_FILE_PATH:/app/logs}/application.log` 설정으로 인해 `LOG_FILE_PATH` 미지정 시 `/app/logs` 디렉토리에 파일 생성을 시도하였으나, K8s 컨테이너 내부 샌드박스 권한 문제로 생성이 실패하였습니다.
- **아키텍처 불일치**: K8s 매니페스트에 `emptyDir` 볼륨을 추가하는 임시 방편은 파드 디스크 쓰기 I/O 오버헤드를 유발하고, 컨테이너 로깅을 `STDOUT`으로 일원화하는 12-Factor App 원칙과 충돌합니다.

---

## 3. 해결 방안 및 아키텍처 개선

### 1) Ingress 어노테이션 표준화 (`custom-response-headers`)
`configuration-snippet` 대신 NGINX Ingress Controller의 표준 헤더 주입 어노테이션인 `custom-response-headers`를 적용하여 `X-Robots-Tag` 검색엔진 수집 차단 설정을 안전하게 주입했습니다.

```yaml
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "true"
  nginx.ingress.kubernetes.io/custom-response-headers: "X-Robots-Tag: noindex, nofollow, noarchive, nosnippet"
```

### 2) 이미지 FQDN(Fully Qualified Domain Name) 적용
CRI-O 런타임의 단축명 검증 거부를 해결하기 위해 모든 모니터링 스택 이미지 매니페스트에 `docker.io/` Prefix를 명시했습니다.
- `docker.io/grafana/alloy:v1.0.0`
- `docker.io/prom/prometheus:v2.54.0`
- `docker.io/grafana/grafana:11.0.0`
- `docker.io/grafana/loki:3.0.0`

### 3) 12-Factor App 기반 콘솔 로깅(STDOUT) 일원화
- **Spring Boot 설정 개선**: `application.yml`에서 파일 경로 기본값을 제거하고 `logging.file.name: ${LOG_FILE_PATH:}`로 수정하여, `LOG_FILE_PATH`가 명시되지 않는 K8s 운영 환경에서는 **파일 로깅이 자동 비활성화**되도록 변경했습니다.
- **Loki/Alloy 파이프라인 일원화**: 모든 로그(traceId, spanId 포함)를 `STDOUT`으로 출력하면 K8s 노드가 `/var/log/containers/*.log`로 자동 수집하고, **Grafana Alloy(DaemonSet)**가 이를 수집하여 Loki로 전송합니다.
- **로컬 환경 호환성**: `docker-compose.yml`에는 `LOG_FILE_PATH=/app/logs/application.log`를 지정하여 로컬 개발 환경의 파일 로그 필요성을 보장했습니다.

---

## 4. 정량 성과 및 검증

1. **배포 정상화**: Ingress Webhook 에러 및 CRI-O 이미지 풀 에러 0건 처리.
2. **파드 상태**: `grafana-alloy`, `prometheus`, `grafana`, `loki`, `self-intro-backend`, `self-intro-frontend`, `self-intro-redis` 등 100% `1/1 Running` 달성.
3. **로깅 최적화**: 컨테이너 불필요 파일 I/O 및 예외 출력 제거, TraceId 기반의 중앙 집중식 관측 가능성(Observability) 확보.

---

## 5. 핵심 요약 (Key Takeaways)

- **Snippet 금지 정책**: Ingress NGINX 안전 어노테이션(`custom-response-headers`) 활용.
- **CRI-O 런타임**: 이미지 명시 시 반드시 `docker.io/` 등 FQDN 명시.
- **Cloud-Native Logging**: 12-Factor App 지침에 따라 K8s 앱 로그는 `STDOUT`으로 내보내고 DaemonSet(Alloy)으로 수집.',
  'PUBLISHED',
  5,
  '2026-08-02',
  NOW(),
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

-- 관련 태그 연결 (Docker, CI/CD)
INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Docker', 'CI/CD')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 관련 스킬 연결 (Kubernetes, Docker, Nginx, Grafana, Loki, Alloy)
INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Kubernetes', 'Docker', 'Nginx', 'Grafana', 'Loki', 'Alloy')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;
