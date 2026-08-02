-- Grafana + Prometheus + Spring Boot Actuator 모니터링 대시보드 심층 가이드 스터디 노트 추가.
-- 대시보드 19004(Spring Boot 3.x Statistics) 패널별 상세 해석과 Prometheus/Actuator 수집 파이프라인 아키텍처를 다룹니다.

INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'grafana-prometheus-spring-boot-dashboard-deep-dive',
  'Grafana × Prometheus × Spring Boot Actuator 모니터링 대시보드 심층 가이드',
  'Spring Boot 3.x 기반 애플리케이션의 Grafana 대시보드(19004) 패널별 의미를 자세히 해석하고, Prometheus가 Actuator 메트릭을 수집하는 전체 파이프라인 아키텍처, 실제 운영에서 만난 RBAC 권한 부재 및 Spring Security 401 차단 문제의 근본 원인과 해결 과정을 기록합니다.',
  '# Grafana × Prometheus × Spring Boot Actuator 모니터링 대시보드 심층 가이드

## 1. 개요: 왜 모니터링 대시보드가 필요한가

운영 중인 서비스의 장애를 "사용자 신고" 이전에 감지하려면, 애플리케이션 내부 상태를 수치로 측정하고 시각화하는 **관측 가능성(Observability)** 체계가 필수입니다. 이 스터디에서는 Self-Intro 프로젝트에 구축한 Prometheus + Grafana 모니터링 스택의 작동 원리와, 대시보드의 각 패널이 실제로 무엇을 보여주는지 상세히 다룹니다.

---

## 2. 메트릭 수집 파이프라인 아키텍처

### 전체 흐름

```
Spring Boot App (Pod)
  └─ Actuator (/actuator/prometheus)
       └─ Micrometer (JVM, HTTP, DB 메트릭 수집)
            │
            ▼  [10초 간격 HTTP Pull]
       Prometheus (Pod)
            │  PromQL 쿼리
            ▼
       Grafana (Pod) → 대시보드 시각화
```

### 각 구성 요소의 역할

| 구성 요소 | 역할 | 설명 |
| :--- | :--- | :--- |
| **Spring Boot Actuator** | 메트릭 노출 | `/actuator/prometheus` 엔드포인트에서 JVM, HTTP, DB 등의 메트릭을 Prometheus 텍스트 포맷으로 노출 |
| **Micrometer** | 메트릭 수집 라이브러리 | Spring Boot 내장. JVM 힙, GC, 스레드, HTTP 요청 카운터/히스토그램 등을 자동으로 계측(Instrumentation) |
| **Prometheus** | 시계열 데이터베이스 | 주기적으로(10초) 대상 Pod의 메트릭 엔드포인트를 **Pull** 방식으로 수집하여 TSDB에 저장 |
| **Grafana** | 시각화 대시보드 | Prometheus에 PromQL 쿼리를 실행하여 그래프·게이지·테이블 등으로 시각화 |

### Pull vs Push 방식

Prometheus는 **Pull 방식**입니다. 대상 서버가 메트릭을 보내는 것(Push)이 아니라, Prometheus가 직접 대상 서버에 HTTP 요청을 보내 메트릭을 가져옵니다.

- **장점**: 대상 서버가 모니터링 시스템의 존재를 몰라도 됩니다. 서비스 코드에 Prometheus 클라이언트를 직접 연동할 필요가 없고, Actuator만 열어두면 끝입니다.
- **장점**: 수집 주기를 Prometheus 설정으로 중앙 관리할 수 있습니다.
- **단점**: 대상 서버가 방화벽 뒤에 있거나 NAT 환경이면 Pull이 불가능합니다. 이 경우 Pushgateway를 중간에 두는 우회 방법을 씁니다.

---

## 3. Kubernetes 환경의 서비스 디스커버리

Prometheus는 K8s API Server에 질의하여 `self-intro` 네임스페이스의 Pod 목록을 자동으로 발견(Service Discovery)합니다. 이를 위해 다음 구성이 필요합니다:

### 1) RBAC 권한 (ServiceAccount + ClusterRole)

Prometheus Pod가 K8s API Server에 접근하여 Pod 목록을 조회하려면 RBAC 권한이 필수입니다:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus-sa
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-role
rules:
  - apiGroups: [""]
    resources: [nodes, services, endpoints, pods]
    verbs: ["get", "list", "watch"]
```

**실제 장애 사례**: 이 RBAC을 설정하지 않았을 때 Prometheus 로그에 다음 에러가 반복되었습니다:
```
pods is forbidden: User "system:serviceaccount:self-intro:default"
cannot list resource "pods" in API group ""
```
→ `default` ServiceAccount에는 Pod 조회 권한이 없기 때문입니다.

### 2) Relabel 설정 (scrape_configs)

Prometheus `scrape_configs`에서 K8s Pod의 레이블을 기반으로 수집 대상을 필터링합니다:

```yaml
scrape_configs:
  - job_name: ''self-intro-backend''
    metrics_path: ''/actuator/prometheus''
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: [self-intro]
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
        action: keep
        regex: self-intro-backend.*
```

`relabel_configs`의 `keep` 액션은 정규식에 매칭되는 Pod만 수집 대상으로 유지하고 나머지는 버립니다. `self-intro-backend.*` 패턴으로 API Pod과 Worker Pod을 모두 포함합니다.

### 3) 레이블 매핑 (대시보드 드롭다운 필터)

Grafana 19004 대시보드의 상단 드롭다운 필터(`Application`, `Namespace`, `Instance`)가 작동하려면, Prometheus가 수집한 메트릭에 해당 레이블이 존재해야 합니다:

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
    target_label: application
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: instance
```

이 매핑이 없으면 드롭다운에 `None`만 표시되고 모든 패널이 `N/A`로 나옵니다.

---

## 4. Spring Security와 메트릭 엔드포인트 인가

### 실제 장애 사례: Prometheus 401 Unauthorized

Prometheus RBAC을 설정하고 Pod 디스커버리가 정상 작동했음에도 대시보드에 데이터가 표시되지 않았습니다. Prometheus 타겟 조회 결과:

```
health: down
lastError: "server returned HTTP status 401"
```

**근본 원인**: Spring Security의 `SecurityFilterChain`에서 `/actuator/health/**`만 `permitAll()`로 열어두고, `/actuator/prometheus` 경로는 인가되지 않아 Prometheus의 HTTP Pull 요청이 401로 거부되었습니다.

### 해결: Actuator 전체 경로 허용

```java
.requestMatchers("/actuator/**")
.permitAll()
```

Actuator 엔드포인트는 클러스터 내부 네트워크에서만 접근 가능하고(Ingress로 외부 노출하지 않음), 민감 정보는 `management.endpoints.web.exposure.include`로 별도 제어하므로 `permitAll()`이 안전합니다.

---

## 5. 대시보드 19004 패널별 상세 해석

### Basic Statistics 섹션

| 패널 | 의미 | PromQL (내부) | 정상 범위 |
| :--- | :--- | :--- | :--- |
| **Uptime** | 애플리케이션이 시작된 후 경과 시간 | `process_uptime_seconds` | 배포 직후 0에서 시작, 지속 증가 |
| **Start Time** | JVM 프로세스 시작 시각 (UNIX timestamp) | `process_start_time_seconds` | 마지막 배포/재시작 시각과 일치 |
| **Heap Used** | JVM 힙 메모리 중 실제 사용 중인 양 | `jvm_memory_used_bytes{area="heap"}` | 전체 힙의 30~70% |
| **Non-Heap Used** | 메타스페이스, 코드 캐시 등 힙 외 메모리 | `jvm_memory_used_bytes{area="nonheap"}` | 100~200MB |
| **Process Open Files** | JVM 프로세스가 열고 있는 파일 디스크립터 수 | `process_open_fds` | 100~500개 |
| **CPU Usage** | JVM 프로세스의 CPU 사용률 | `process_cpu_usage` | 평소 5% 이하, 요청 폭증 시 상승 |
| **Load Average** | OS 레벨 1분 평균 로드 | `system_load_average_1m` | CPU 코어 수 이하 |

### JVM Statistics - Memory 섹션

#### Heap 메모리란?
JVM이 객체를 할당하는 주요 메모리 영역입니다. Spring Boot에서 HTTP 요청을 처리할 때 생성되는 DTO, Entity, 임시 컬렉션 등이 모두 Heap에 할당됩니다.

| 패널 | 의미 | 주의사항 |
| :--- | :--- | :--- |
| **JVM Heap (Committed)** | OS에서 JVM에 할당(Committed)된 힙 메모리 총량 | Xmx 설정 이하 |
| **JVM Heap (Used)** | 현재 실제 사용 중인 힙 메모리 | Committed의 30~70%가 정상 |
| **JVM Non-Heap (Committed/Used)** | 클래스 메타데이터, JIT 컴파일 코드 캐시 등 | 급격히 증가하면 메타스페이스 누수 의심 |

#### 메모리 풀 (Memory Pool)

JVM은 힙을 여러 영역(Pool)으로 세분화합니다:

- **Eden Space**: 새로 생성된 객체가 처음 할당되는 곳. Minor GC가 이 영역을 정리합니다.
- **Survivor Space**: Eden에서 살아남은 객체가 이동하는 곳. S0/S1 두 영역이 번갈아 사용됩니다.
- **Old Gen (Tenured)**: Survivor에서 오래 살아남은 객체가 이동하는 곳. Major GC(Full GC)가 이 영역을 정리합니다.
- **Metaspace**: 클래스 메타데이터 저장소. Java 8 이후 PermGen을 대체. 동적 클래스 로딩이 많으면 증가합니다.
- **Code Cache**: JIT 컴파일된 네이티브 코드가 저장되는 곳.

### JVM Statistics - GC (Garbage Collection) 섹션

| 패널 | 의미 | 정상 범위 |
| :--- | :--- | :--- |
| **GC Pause Duration** | GC로 인해 애플리케이션 스레드가 일시 정지(Stop-The-World)된 시간 | 50ms 이하 |
| **GC Count (rate)** | 초당 GC 발생 횟수 | Minor GC: 초당 0~2회, Major GC: 시간당 0~1회 |

#### GC 경보 기준 (실무 가이드)
- **GC Pause > 500ms**: 사용자 체감 지연 발생 가능. 힙 크기 조정 또는 GC 알고리즘 변경 검토.
- **Old Gen 사용률 > 80% 지속**: 메모리 누수 의심. 힙 덤프 분석 필요.
- **Full GC 빈도 > 분당 1회**: 심각한 메모리 압박. 즉시 조치 필요.

### Database Connection Pool HikariCP Statistics 섹션

| 패널 | 의미 | 정상 범위 |
| :--- | :--- | :--- |
| **Active Connections** | 현재 SQL을 실행 중인 DB 커넥션 수 | 전체 풀의 50% 이하 |
| **Idle Connections** | 대기 중인 유휴 커넥션 수 | minimum-idle 설정값 근처 |
| **Pending Threads** | 커넥션을 기다리며 대기 중인 스레드 수 | **0이 정상**. 1 이상이면 풀 고갈 징후 |
| **Connection Timeout Total** | 커넥션 획득 타임아웃 누적 횟수 | **0이 정상**. 증가하면 풀 크기 증설 또는 슬로우 쿼리 점검 |

#### HikariCP 풀 고갈 시나리오
`Pending Threads > 0`이 지속되면 다음을 점검합니다:
1. **슬로우 쿼리**: 커넥션을 오래 점유하는 느린 SQL이 있는지 확인
2. **트랜잭션 미반환**: `@Transactional` 내부에서 외부 API 호출 등으로 커넥션이 장시간 잠기는 경우
3. **풀 크기 부족**: `spring.datasource.hikari.maximum-pool-size` 증설 검토

### HTTP Statistics 섹션

| 패널 | 의미 | PromQL 핵심 |
| :--- | :--- | :--- |
| **HTTP Request Rate (TPS)** | 초당 HTTP 요청 처리 건수 | `rate(http_server_requests_seconds_count[1m])` |
| **HTTP Request Duration** | HTTP 요청 응답 시간 분포 (p50, p95, p99) | `http_server_requests_seconds_bucket` 히스토그램 |

#### 응답 시간 백분위수(Percentile) 해석
- **p50 (중앙값)**: 절반의 요청이 이 시간 이내에 완료. 서비스의 "일반적인" 성능.
- **p95**: 95%의 요청이 이 시간 이내. 대부분의 사용자 경험.
- **p99**: 99%의 요청이 이 시간 이내. 이 값이 높으면 간헐적 지연 발생.
- **실무 기준**: p95 < 200ms, p99 < 500ms를 목표로 합니다.

### Logback Statistics 섹션

| 패널 | 의미 | 정상 범위 |
| :--- | :--- | :--- |
| **Log Events Rate (by level)** | 초당 로그 출력 건수 (ERROR, WARN, INFO, DEBUG별) | ERROR: 0에 가까울수록 좋음 |

#### 로그 레벨별 알람 기준
- **ERROR rate > 분당 5회 지속**: 즉시 확인 필요. 반복되는 예외 패턴 파악.
- **WARN rate 급증**: 일시적일 수 있으나 추이 관찰 필요.
- **INFO rate**: 트래픽에 비례하여 증가하는 것이 정상.

---

## 6. 대시보드 활용 실전 팁

### 1) 배포 전후 비교
배포 직후 대시보드의 시간 범위를 `Last 15 minutes`로 설정하면, 배포 전후의 메모리 사용량·응답 시간·에러율 변화를 즉시 비교할 수 있습니다.

### 2) 장애 시 우선 확인 순서
1. **HTTP Statistics**: 4xx/5xx 에러율 급증 여부
2. **HikariCP Pending Threads**: DB 커넥션 풀 고갈 여부
3. **GC Pause Duration**: GC 일시정지로 인한 응답 지연 여부
4. **Heap Used**: 메모리 부족(OOM) 직전 상태 여부
5. **Logback ERROR rate**: 반복되는 예외 패턴 확인

### 3) Grafana 알람(Alerting) 설정 권장 기준

| 항목 | 조건 | 심각도 |
| :--- | :--- | :--- |
| Heap 사용률 | > 85% (5분 지속) | Warning |
| GC Pause | > 1초 | Critical |
| HikariCP Pending | > 0 (3분 지속) | Warning |
| HTTP 5xx rate | > 분당 10건 | Critical |
| ERROR 로그 | > 분당 5건 (5분 지속) | Warning |

---

## 7. 실제 운영 트러블슈팅 기록

### 문제 1: Prometheus Pod가 K8s Pod를 발견하지 못함
- **증상**: Grafana 대시보드 전체 N/A
- **원인**: Prometheus가 사용하는 `default` ServiceAccount에 K8s API Server의 Pod 조회 RBAC 권한이 없었음
- **해결**: 전용 ServiceAccount(`prometheus-sa`)를 생성하고 ClusterRole/ClusterRoleBinding으로 pods list/watch 권한 부여

### 문제 2: Pod는 발견했으나 메트릭 수집 실패 (401)
- **증상**: Prometheus 타겟 상태 `health: down`, `lastError: server returned HTTP status 401`
- **원인**: Spring Security의 `SecurityFilterChain`에서 `/actuator/health/**`만 permitAll로 열어두고, Prometheus가 수집하는 `/actuator/prometheus` 경로는 인가 규칙에 걸려 401 반환
- **해결**: `.requestMatchers("/actuator/**").permitAll()`로 전체 Actuator 엔드포인트 허용. 클러스터 내부 네트워크에서만 접근 가능하므로 보안 위험 없음.

### 문제 3: 대시보드 드롭다운 필터 None
- **증상**: Application, Namespace, Instance 드롭다운이 모두 None
- **원인**: Prometheus relabel_configs에서 `application`, `namespace`, `instance` 레이블을 K8s 메타데이터로부터 매핑하지 않았음
- **해결**: relabel_configs에 `__meta_kubernetes_pod_label_app_kubernetes_io_name → application`, `__meta_kubernetes_namespace → namespace`, `__meta_kubernetes_pod_name → instance` 매핑 추가

---

## 8. 핵심 요약 (Key Takeaways)

- **Pull 기반 수집**: Prometheus는 대상 서버에 직접 HTTP 요청을 보내 메트릭을 가져오는 Pull 방식. 서비스 코드 수정 불필요.
- **RBAC 필수**: K8s 환경에서 Prometheus가 Pod를 자동 발견하려면 ServiceAccount에 pods list/watch 권한이 있어야 합니다.
- **Spring Security 인가 확인**: Actuator 메트릭 엔드포인트가 인가 규칙에 의해 차단되지 않는지 반드시 확인해야 합니다.
- **레이블 매핑**: Grafana 커뮤니티 대시보드는 `application`, `namespace`, `instance` 레이블을 기대합니다. Prometheus relabel_configs에서 K8s 메타데이터를 이 레이블로 매핑해야 드롭다운 필터가 작동합니다.
- **GC와 커넥션 풀 모니터링**: GC Pause Duration과 HikariCP Pending Threads는 장애의 선행 지표입니다. 0이 아닌 값이 지속되면 즉시 점검하세요.',
  'PUBLISHED',
  5,
  '2026-08-02',
  NOW(),
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

-- 관련 태그 연결 (Observability, Spring Boot, Actuator, Grafana)
INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Observability', 'Spring Boot', 'Actuator', 'Grafana')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 관련 스킬 연결 (Grafana, Prometheus, Kubernetes, Spring Boot)
INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Grafana', 'Prometheus', 'Kubernetes', 'Spring Boot')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 이전 모니터링 스터디(V140)와 연관 관계 설정
INSERT INTO `study_related` (`study_id`, `related_study_id`, `relation_type`)
SELECT @study_id, `id`, 'RELATED' FROM `study` WHERE `slug` = 'k8s-ingress-crio-logging-architecture-refactoring'
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;
