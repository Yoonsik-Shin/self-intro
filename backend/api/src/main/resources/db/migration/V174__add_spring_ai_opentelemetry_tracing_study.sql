-- Spring AI LLM 워크플로우 관측성(Observability) 구축과 OpenTelemetry / Tempo 트레이싱 이중 Bean 충돌 트러블슈팅 스터디 추가

INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'spring-ai-opentelemetry-tempo-tracing-troubleshooting',
  'Spring AI LLM 워크플로우 관측성(Observability) 구축과 OpenTelemetry / Tempo 트레이싱 이중 Bean 충돌 트러블슈팅',
  'Spring AI 기반 LLM 및 비전 파이프라인의 프롬프트 입출력 데이터 흐름 추적을 위해 OpenTelemetry(OTLP) 및 Grafana Tempo를 구축하는 과정에서 발생한 Spring Boot Tracing 자동 설정의 Brave/OpenTelemetry 이중 Propagator Bean 충돌 문제와 K8s Tempo OOMKilled/SecurityContext 권한 오류를 근본적으로 해결한 기록입니다.',
  '# Spring AI LLM 워크플로우 관측성(Observability) 구축과 OpenTelemetry / Tempo 트레이싱 이중 Bean 충돌 트러블슈팅

## 1. 개요 및 배경

LangGraph / LangChain 생태계의 **LangSmith**와 같이, Spring AI 기반의 LLM 파이프라인(`JobApplicationUrlParseService`, `NvidiaNimClient` 비전 모델 등)에서 사용자/시스템 프롬프트, LLM 응답, 모델명, 토큰 소모량, 단계별 소요 시간(Latency)을 시각적으로 추적할 수 있는 **OpenTelemetry(OTLP) 및 Grafana Tempo 기반 Observability 체계**를 구현하였습니다.

구축 및 배포 과정에서 발생한 **K8s Tempo Pod 장애** 및 **Spring Boot Tracing 자동 설정의 이중 Propagator Bean 충돌** 현상을 분석하고 근본 원인을 수정하였습니다.

---

## 2. 발생 문제 및 근본 원인 분석

### 1) K8s 배포 환경 Tempo Pod 장애 (`0/1 Error / CrashLoopBackOff`)
ArgoCD에서 `self-intro-monitoring` 앱의 `tempo` Pod가 `0/1 Error` 상태로 다운되는 현상이 발생했습니다.
- **OOMKilled (메모리 부족)**: K8s `tempo.yaml` 매니페스트의 memory limit이 `128Mi`로 너무 낮게 설정되어 Tempo 인스턴스 초기화 시 OOM(Out Of Memory) 예외로 파드가 강제 종료(Exit Code 137)되었습니다.
- **PersistentVolume 쓰기 권한 부족**: Tempo 공식 이미지는 non-root 유저(`UID 10001`)로 동작하나, Pod 템플릿에 `securityContext.fsGroup` 설정이 누락되어 PVC 마운트 경로(`/var/tempo/wal`, `/var/tempo/blocks`) 쓰기 권한이 거부되었습니다.
- **Unpinned Image Tag (`:latest`)**: `:latest` 태그 사용으로 최신 버전 빌드 시 `compactor` 등 필수 설정 블록 누락 문제가 동반되었습니다.

### 2) Spring Boot Tracing 이중 Propagator Bean 충돌 (`UnsatisfiedDependencyException`)
백엔드(`self-intro-backend`) 부팅 시 Tomcat Context 생성 단계에서 다음과 같은 Bean 충돌 예외가 발생하며 구동이 실패했습니다:

```text
Parameter 1 of method propagatingSenderTracingObservationHandler in org.springframework.boot.actuate.autoconfigure.tracing.MicrometerTracingAutoConfiguration required a single bean, but 2 were found:
  - bravePropagator: defined by method \'bravePropagator\' in class path resource [org/springframework/boot/actuate/autoconfigure/tracing/BraveAutoConfiguration.class]
  - otelPropagator: defined by method \'otelPropagator\' in class path resource [org/springframework/boot/actuate/autoconfigure/tracing/OpenTelemetryTracingAutoConfiguration.class]
```

- **근본 원인**:
  1. `:core` 모듈에 포함된 gRPC 스타터(`net.devh:grpc-spring-boot-starter`)가 gRPC 계측용 Brave 클래스를 클래스패스에 자동으로 유입시켰습니다.
  2. Spring AI 용으로 추가한 OpenTelemetry(`micrometer-tracing-bridge-otel`) 라이브러리가 함께 탑재되면서, Spring Boot의 Micrometer Tracing 자동 설정이 **BraveAutoConfiguration**과 **OpenTelemetryTracingAutoConfiguration** 두 자동 설정 클래스를 모두 실행했습니다.
  3. 두 자동 설정이 각각 `bravePropagator`와 `otelPropagator`를 만듦에 따라, 단 1개의 Propagator만 받을 수 있는 `propagatingSenderTracingObservationHandler`가 의존성 주입 실패를 일으켰습니다.

---

## 3. 해결 방안 및 구현 (Solution & Architecture)

### 1) K8s Tempo 매니페스트 및 PVC 구조 개편 (`fix(k8s)`)
- **[tempo.yaml](file:///Users/shin-yoonsik/Desktop/Project/self-intro/deploy/k8s/base/monitoring/tempo.yaml)**:
  - 이미지 태그 `docker.io/grafana/tempo:2.4.1` 고정
  - `securityContext.fsGroup: 10001`을 지정하여 non-root 유저의 PVC 권한 확보
  - Memory limit을 `128Mi`에서 **`256Mi`** 로 상향하여 OOMKilled 해제
  - RWO PVC 마운트 잠금 방지를 위해 Deployment `strategy: Recreate` 추가
- **[tempo-configmap.yaml](file:///Users/shin-yoonsik/Desktop/Project/self-intro/deploy/k8s/base/monitoring/tempo-configmap.yaml)**:
  - `compactor` 섹션(`block_retention: 48h`) 명시

### 2) Spring Boot Tracing Auto-Configuration 정제 (`fix(backend)`)
`application.yml`의 `spring.autoconfigure.exclude`에 불필요한 `BraveAutoConfiguration`을 명시적으로 차단하고 전파 규칙을 `W3C`로 일원화했습니다.

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.actuate.autoconfigure.tracing.BraveAutoConfiguration

management:
  tracing:
    propagation:
      type: W3C
    sampling:
      probability: 1.0
  otlp:
    tracing:
      endpoint: ${OTLP_EXPORTER_ENDPOINT:http://tempo:4318/v1/traces}
```

이 조치로 `bravePropagator` 생성이 완전 차단되고 단일 **`otelPropagator`** 만 컨텍스트에 등록되어 Bean 충돌이 근본적으로 해결되었습니다.

### 3) Spring AI 파이프라인 관측성(Observability) 스팬 묶음
`JobApplicationUrlParseService`에 `@Observed` 어노테이션을 부착하여 `URL 수집 -> DOM 파싱 -> 텍스트 LLM -> 비전 배너 파싱` 전 과정을 부모-자식 트리 형태의 트레이스로 계측했습니다.

```java
@Observed(name = "job.posting.parse.workflow")
public JobApplicationUrlParseResponse parse(String url) { ... }
```

---

## 4. Grafana 시각화 및 조회 가이드 (Dashboards vs Explore)

- **Dashboards (대시보드 목록)**: Prometheus 수치 메트릭 / Loki 로그 전용 패널 화면입니다.
- **Explore (🧭 탐색 메뉴)**: OpenTelemetry / Tempo 트레이스 전용 타임라인 화면입니다.
  1. Grafana 접속(`http://localhost:3001` 또는 운영 Grafana)
  2. 좌측 메뉴 **Explore (🧭 탐색)** 선택
  3. 데이터소스 **`Tempo`** 선택 -> `Service Name: self-intro-ai-worker` 검색
  4. 각 요청 클릭 시 LLM 프롬프트, 텍스트/비전 모델 응답, 토큰 수 Waterfall 그래프 시각화

---

## 5. 핵심 성과 및 교훈 (Key Takeaways)

1. **Spring Boot Tracing 의존성 관리**: 이기종 추적 라이브러리(Brave vs OpenTelemetry) 혼용 시 `spring.autoconfigure.exclude`를 통해 전파자를 일원화해야 함.
2. **K8s Storage SecurityContext**: non-root 파드의 PVC 사용 시 `fsGroup` 지정 필수.
3. **Cloud-Native Tracing**: OTLP 익스포터를 통한 비동기 트레이싱으로 앱 부하 없이 LLM 워크플로우 데이터 흐름 완벽 확보.',
  'PUBLISHED',
  5,
  '2026-08-09',
  NOW(),
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

-- 관련 태그 연결 (Spring Boot, Docker, Kubernetes)
INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Spring Boot', 'Docker', 'Kubernetes')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 관련 스킬 연결 (Spring Boot, Kubernetes, Grafana, Docker)
INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Spring Boot', 'Kubernetes', 'Grafana', 'Docker')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;
