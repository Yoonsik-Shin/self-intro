-- 모니터링 스택 확장 시리즈(4편) 추가: 외부 데이터스토어 exporter, Pod 레벨 모니터링,
-- 영속성(PVC) 트러블슈팅, GitOps 운영 디테일(로그 라벨링/ArgoCD 헬스체크/대시보드 코드화).
-- 기존 모니터링 시리즈(V140~V144)의 후속편으로 FOLLOW_UP 관계로 연결합니다.

INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'rabbitmq-mysql-oracle-atp-exporter-setup',
  '외부 데이터스토어 모니터링 확장 — RabbitMQ · MySQL · Oracle ATP 3종 Exporter 구축기',
  'RabbitMQ/MySQL/Oracle ATP 세 데이터스토어에 Prometheus Exporter를 붙이며 만난 문제들 — 런타임에만 켜져있던 플러그인, 클라우드 관리형 DB의 잃어버린 관리자 계정 복구, arm64 이미지 비호환, Oracle Wallet 비밀번호 분실과 exporter 설정 스키마 마이그레이션을 다룹니다.',
  '# 외부 데이터스토어 모니터링 확장 — RabbitMQ · MySQL · Oracle ATP 3종 Exporter 구축기

## 1. 개요 및 배경

기존 모니터링 스택은 Spring Boot 애플리케이션(JVM, HTTP, HikariCP)과 K8s 노드 레벨(Node Exporter)만 커버하고 있었습니다. 실제로 서비스를 떠받치는 RabbitMQ(메시지 큐), MySQL(백엔드 API의 주 DB), Oracle ATP(백엔드 워커의 채용공고 읽기 모델 DB)는 Grafana에서 전혀 보이지 않는 사각지대였습니다.

이 글은 세 가지 서로 다른 데이터스토어에 대한 Prometheus Exporter를 붙이는 과정에서, 각 서비스마다 성격이 다른 장애물을 만나고 해결한 기록입니다.

---

## 2. RabbitMQ — 이미 켜져 있던 기능을 코드로 고정하기

RabbitMQ 3.13 관리 이미지(`rabbitmq:3.13-management-alpine`)에는 `rabbitmq_prometheus` 플러그인이 포함돼 있지만, 기본적으로 비활성화 상태입니다. 확인해보니 로컬 컨테이너는 이미 누군가(혹은 이전 세션에서) 수동으로 `rabbitmq-plugins enable rabbitmq_prometheus`를 실행해 런타임에는 켜져 있었지만, **이 설정은 docker-compose.yml/K8s 매니페스트 어디에도 기록되어 있지 않아 컨테이너를 재생성하는 순간 사라질 상태**였습니다.

```
[e*] rabbitmq_federation       3.13.7
[E*] rabbitmq_management       3.13.7
[E*] rabbitmq_prometheus       3.13.7   ← 런타임엔 켜져 있었지만 코드엔 없음
```

### 해결: enabled_plugins 파일을 코드로 고정

```yaml
# deploy/monitoring/rabbitmq/enabled_plugins (로컬)
[rabbitmq_management,rabbitmq_prometheus].
```

docker-compose에는 이 파일을 볼륨으로 마운트하고 포트 15692를 열었습니다.

```yaml
rabbitmq:
  ports:
    - "15692:15692"
  volumes:
    - ./deploy/monitoring/rabbitmq/enabled_plugins:/etc/rabbitmq/enabled_plugins:ro
```

K8s에서는 같은 내용을 ConfigMap으로 만들어 마운트했습니다.

```yaml
volumeMounts:
  - name: rabbitmq-plugins
    mountPath: /etc/rabbitmq/enabled_plugins
    subPath: enabled_plugins
```

Prometheus 스크랩 설정도 단순합니다.

```yaml
- job_name: ''rabbitmq''
  metrics_path: ''/metrics''
  static_configs:
    - targets: [''self-intro-rabbitmq.self-intro.svc.cluster.local:15692'']
```

**교훈**: "지금 잘 되고 있음"과 "코드에 정의돼 있음"은 다른 상태입니다. 런타임에 수동으로 켠 설정은 다음 재배포에서 반드시 사라집니다.

---

## 3. MySQL — mysqld_exporter, 그리고 잃어버린 관리자 계정 복구기

### 3.1 mysqld_exporter 설정

최신 `prom/mysqld-exporter`(v0.19)는 `DATA_SOURCE_NAME` 환경변수 방식이 폐지되고 `.my.cnf` 파일 방식으로 바뀌었습니다.

```ini
# .my.cnf
[client]
user=monitoring
password=<비밀번호>
host=<MySQL 호스트>
port=3306
```

```yaml
mysqld-exporter:
  image: prom/mysqld-exporter:latest
  command:
    - ''--config.my-cnf=/etc/mysqld_exporter/.my.cnf''
  volumes:
    - ./deploy/monitoring/mysql/.my.cnf:/etc/mysqld_exporter/.my.cnf:ro
```

### 3.2 prod에서 마주한 진짜 문제: "관리자 계정을 아무도 기억하지 못함"

모니터링 전용 계정(`CREATE USER ''monitoring''@''%''`)을 만들려면 `CREATE USER` 권한을 가진 관리자 계정으로 접속해야 합니다. 그런데 prod MySQL(OCI MySQL HeatWave)의 관리자 계정명 자체가 기억나지 않는 상황이었습니다.

**OCI Console도, `oci mysql db-system get` API도 admin-username 필드를 반환하지 않습니다** — 보안상 생성 시점 이후엔 어디서도 조회가 안 됩니다. 콘솔의 "접속" 탭, "작업 요청" 이력까지 다 뒤졌지만 계정명 자체는 어디에도 남아있지 않았습니다.

우회로:
1. 이미 동작 중인 앱 계정(`backend-db-secret`의 `DB_USERNAME`)으로 먼저 접속 시도 → `self_intro_app`은 앱 스키마 권한만 있어서 `CREATE USER` 거부(`ERROR 1227`).
2. OCI Console의 "관리자 비밀번호 재설정" 기능으로 **계정명은 몰라도 비밀번호만 리셋** — 이건 되지만 계정명을 여전히 몰라 로그인 불가.
3. `admin` 계정명으로 재시도 → 거부(`Access denied`, 진짜 이름이 아님을 확인).
4. Prometheus Cloud Audit 로그에서 최초 `CreateDbSystem` API 호출 기록 탐색 시도 → 감사 로그 보존 기간 내 이벤트는 많았지만 요청 바디에 계정명이 남지 않음.
5. **프라이빗 IP(VCN 내부망)라 로컬에서 직접 접속도 불가** — `kubectl run` 임시 pod를 클러스터 안에 띄워 접속 시도.

접속 명령에서 두 번 더 헤맸습니다:

```bash
# 실패: -h에 host:port를 같이 넣으면 안 됨 (호스트명으로 통째로 해석)
mysql -h 10.0.30.142:3306 -u admin -p

# 실패: kubectl run -it이 짧은 이미지 이름(mysql:8.0)을 거부
# → CRI-O의 short-name 강제 정책. 완전한 레지스트리 경로 필요
--image=docker.io/library/mysql:8.0

# 성공한 형태
kubectl run mysql-client-tmp -n self-intro --rm -it --restart=Never \
  --image=docker.io/library/mysql:8.0 -- mysql -h 10.0.30.142 -P 3306 -u admin -p
```

결국 계정명은 사용자가 **콘솔 "접속" 탭이 아니라 실제로 예전에 기억하던 이름(`yoonsik`)**으로 성공했고, `SHOW GRANTS FOR CURRENT_USER()`로 `WITH GRANT OPTION` 확인 후 모니터링 계정을 생성했습니다.

```sql
CREATE USER ''monitoring''@''%'' IDENTIFIED BY ''<비밀번호>'';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO ''monitoring''@''%'';
```

---

## 4. Oracle ATP — arm64 호환성과 config.yaml 스키마 마이그레이션

### 4.1 첫 번째 함정: amd64 전용 이미지

가장 널리 쓰이는 `iamseth/oracledb_exporter`는 **arm64 빌드가 아예 없습니다**. OKE의 Always Free 노드는 Ampere A1(arm64)이라 `exec format error`로 즉시 죽습니다.

```
exec /oracledb_exporter: exec format error
```

`docker manifest inspect`로 사전에 아키텍처를 확인하는 습관이 여기서 갈렸습니다.

```bash
docker manifest inspect iamseth/oracledb_exporter:latest
# → amd64 단일 아키텍처만 존재
```

Oracle 공식 이미지(`container-registry.oracle.com/database/observability-exporter`)는 amd64/arm64 멀티아치를 지원합니다.

### 4.2 두 번째 함정: wallet 지갑 비밀번호 분실

worker가 이미 쓰고 있는 ATP wallet(`oracle-atp-worker-wallet` 시크릿)을 재사용하려 했으나, wallet의 `ewallet.pem`을 열려면 **다운로드 시점에만 존재하는 wallet 비밀번호**가 필요했습니다. 어디에도 기록되지 않아 복구 불가.

해결: `oci db autonomous-database generate-wallet` CLI로 **새 wallet을 발급**했습니다. 기존 wallet은 그대로 유효하게 남아있으므로(ADB는 여러 wallet 동시 지원) prod 서비스에 영향 없이 exporter 전용 wallet을 새로 만들 수 있었습니다.

```bash
oci db autonomous-database generate-wallet \
  --autonomous-database-id <OCID> \
  --password ''<새 wallet 비밀번호>'' \
  --generate-type ALL \
  --file wallet.zip
```

### 4.3 세 번째 함정: 네이티브 세그폴트

Oracle 공식 이미지 1.5.2로 교체 후 exec format error는 사라졌지만, 이번엔 godror(Oracle 공식 Go 드라이버)의 cgo 레이어에서 세그폴트가 발생했습니다.

```
fault   0x70
exec /oracledb_exporter: ...(Go 런타임 크래시 덤프)
```

원인은 wallet의 `sqlnet.ora`에 있었습니다.

```
WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="?/network/admin")))
```

`?`는 `TNS_ADMIN`이 아니라 `ORACLE_HOME` 치환 변수입니다. 컨테이너엔 그런 경로가 없어 wallet 경로 해석이 깨지면서 네이티브 레이어가 죽은 것으로 추정됩니다. `DIRECTORY`를 실제 마운트 경로로 명시하니 — 그래도 크래시는 재발했습니다. 결국 이미지 버전을 2.0.0으로 올리고 나서야 안정화됐습니다(1.5.2의 arm64 빌드 자체에 버그가 있었던 것으로 보입니다).

### 4.4 네 번째 함정: 2.0.0의 설정 방식 전면 개편

2.0.0은 `DATA_SOURCE_NAME` 환경변수를 완전히 제거하고 `--config.file` YAML 방식으로 바뀌었습니다. GitHub 저장소의 `main` 브랜치 예제와 실제 `2.0.0` 태그의 스키마가 미묘하게 달라(`connMaxLifetime`, `log.level/format`, `web.*` 필드가 2.0.0엔 없음) 한 번 더 삽질했습니다. **릴리스 태그 기준으로 예제를 확인하는 것**이 정답이었습니다.

```yaml
databases:
  default:
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    url: ${DB_TNS_ALIAS}
    tnsAdmin: /etc/oracle/wallet
    queryTimeout: 5
    maxOpenConns: 10
    maxIdleConns: 10

metrics:
  default: default-metrics.toml

log:
  destination: /opt/alert.log
  interval: 15s
```

모니터링 계정도 최소 권한으로 새로 만들었습니다.

```sql
CREATE USER monitoring IDENTIFIED BY "<비밀번호>";
GRANT CREATE SESSION TO monitoring;
GRANT SELECT_CATALOG_ROLE TO monitoring;
```

---

## 5. 대시보드 해석 가이드

### RabbitMQ Overview

| 패널 | 지표 | 정상 범위 |
| :--- | :--- | :--- |
| Connections/Channels/Consumers | `rabbitmq_connections` 등 | 서비스 규모에 비례, 급격한 증가는 커넥션 누수 의심 |
| Queued Messages (ready/unacked) | `rabbitmq_queue_messages_ready/unacked` | unacked가 지속 증가하면 consumer가 ack를 못 하고 있다는 신호 |
| Disk Space Available | `rabbitmq_disk_space_available_bytes` | RabbitMQ는 디스크 여유 공간이 임계치 아래로 떨어지면 publish를 강제로 막습니다 |

### MySQL Overview

| 패널 | 지표 | 정상 범위 |
| :--- | :--- | :--- |
| Threads Connected | `mysql_global_status_threads_connected` | `max_connections`의 70% 이하 |
| Slow Queries | `mysql_global_status_slow_queries` | 0에 가까울수록 좋음, 누적 증가 추이를 봐야 함(카운터) |
| InnoDB Buffer Pool | `mysql_global_status_innodb_buffer_pool_bytes_data` | 물리 메모리 대비 버퍼풀 크기가 데이터셋보다 작으면 디스크 I/O 증가 |
| Commands by Type | `rate(mysql_global_status_commands_total[1m])` | select/insert/update/delete 비율로 워크로드 성격 파악 |

### Oracle ATP Overview

| 패널 | 지표 | 정상 범위 |
| :--- | :--- | :--- |
| Active Sessions | `oracledb_sessions_value{status="ACTIVE"}` | ATP는 서비스 레벨(high/medium/low/tp)별 세션 한도가 있어 이 값이 한도에 근접하면 커넥션 거부 발생 |
| Tablespace Used % | `oracledb_tablespace_used_percent` | 85% 이상 지속 시 스토리지 확장 검토 |
| Wait Time by Class | `oracledb_wait_time_*` | `user_io`/`system_io`가 크면 쿼리 튜닝 또는 인덱스 점검 대상 |

---

## 6. 핵심 요약 (Key Takeaways)

- **런타임 설정과 코드 정의는 다르다**: RabbitMQ 플러그인처럼 콘솔/CLI로 즉석에서 켠 설정은 재배포 시 사라집니다. 반드시 매니페스트에 명시해야 합니다.
- **클라우드 관리형 DB의 관리자 계정은 생성 시점 이후 조회 불가한 경우가 많습니다**(OCI MySQL 확인). 계정 정보는 별도로 안전하게 보관해야 하며, 분실 시 비밀번호 리셋(계정명 불필요)까지가 공급자가 제공하는 마지노선입니다.
- **arm64 노드에서는 이미지 아키텍처를 먼저 확인하세요**(`docker manifest inspect`). amd64 전용 이미지는 `exec format error`로 늦게 발견될수록 디버깅 비용이 커집니다.
- **Oracle Wallet은 다운로드 시점에만 존재하는 비밀번호를 요구합니다.** 기존 wallet의 비밀번호를 분실했다면, 재발급이 기존 wallet에 영향을 주지 않으므로 새로 받는 것이 가장 빠른 해법입니다.
- **오픈소스 프로젝트 예제는 `main` 브랜치가 아니라 실제 사용 중인 릴리스 태그 기준으로 확인해야 합니다.** 메이저 버전 업그레이드 시 설정 스키마가 통째로 바뀌는 경우가 흔합니다.
',
  'DRAFT',
  5,
  '2026-08-04',
  NULL,
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Observability', 'Grafana')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Grafana', 'Prometheus', 'MySQL')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 이전 편과 FOLLOW_UP 관계 설정
INSERT INTO `study_relation` (`source_study_id`, `target_study_id`, `relation_type`, `display_order`)
SELECT @study_id, `id`, 'FOLLOW_UP', 0 FROM `study` WHERE `slug` = 'kubernetes-node-exporter-grafana-dashboard-deep-dive'
ON DUPLICATE KEY UPDATE `source_study_id` = `source_study_id`;


INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'kubernetes-pod-level-monitoring-cadvisor-kube-state-metrics',
  'Kubernetes Pod 레벨 모니터링 완성 — kube-state-metrics와 cAdvisor',
  '노드 레벨 지표만으로는 답할 수 없는 ''Pod 단위'' 질문을 채우기 위해 kube-state-metrics와 cAdvisor를 도입한 과정. kubelet 프록시 경유 스크랩 설정과, cgroup 계층 롤업이 실제 컨테이너 지표와 섞여 나오는 함정을 다룹니다.',
  '# Kubernetes Pod 레벨 모니터링 완성 — kube-state-metrics와 cAdvisor

## 1. 개요: Node Exporter만으로는 부족했던 이유

이전 스터디(Node Exporter × Grafana 심층 가이드)에서 노드 레벨의 물리 자원(CPU, RAM, Disk, Network)은 이미 수집하고 있었습니다. 하지만 "어떤 Pod가 메모리를 많이 쓰는지", "재시작이 잦은 Pod가 있는지", "리소스 request/limit 대비 실사용량은 얼마인지" 같은 **Pod 단위 질문에는 답할 수 없었습니다.** 노드 전체 CPU 사용률이 80%라는 걸 알아도, 그게 어떤 Pod 때문인지는 노드 지표만으로는 알 수 없기 때문입니다.

이 레이어를 채우려면 서로 역할이 다른 두 가지 도구가 필요합니다.

| 구분 | kube-state-metrics | cAdvisor |
| :--- | :--- | :--- |
| **수집 대상** | K8s API 서버의 오브젝트 상태(메타데이터) | 컨테이너의 실제 리소스 사용량 |
| **예시 지표** | Pod phase, 재시작 횟수, resource request/limit, Deployment replica 수 | CPU 사용 시간, 메모리 working set, 네트워크 I/O |
| **데이터 출처** | `kube-apiserver`를 watch | kubelet에 내장 |
| **비유** | "이 Pod가 지금 Running인지, 재시작을 몇 번 했는지" (인사기록카드) | "이 컨테이너가 지금 CPU를 얼마나 쓰고 있는지" (전력계) |

---

## 2. kube-state-metrics 배포

특이할 것 없는 표준 배포입니다. RBAC으로 클러스터 전역의 오브젝트를 list/watch할 권한을 부여합니다.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-state-metrics
rules:
  - apiGroups: [""]
    resources: [nodes, pods, services, ...]
    verbs: ["list", "watch"]
  - apiGroups: ["apps"]
    resources: [deployments, replicasets, statefulsets, daemonsets]
    verbs: ["list", "watch"]
```

Prometheus 스크랩은 정적 타겟으로 충분합니다(단일 인스턴스이므로 서비스 디스커버리 불필요).

```yaml
- job_name: ''kube-state-metrics''
  static_configs:
    - targets: [''kube-state-metrics.self-intro.svc.cluster.local:8080'']
```

---

## 3. cAdvisor — kubelet 프록시 경유 스크랩

cAdvisor는 별도로 배포하는 게 아니라 **kubelet에 이미 내장**되어 있습니다. 문제는 접근 방법입니다. Pod IP로 직접 스크랩할 수 없고, API 서버의 프록시 경로를 거쳐야 합니다.

```yaml
- job_name: ''cadvisor''
  scheme: https
  tls_config:
    insecure_skip_verify: true
  bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  kubernetes_sd_configs:
    - role: node
  relabel_configs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)
    - target_label: __address__
      replacement: kubernetes.default.svc:443
    - source_labels: [__meta_kubernetes_node_name]
      regex: (.+)
      target_label: __metrics_path__
      replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor
```

이 방식이 동작하려면 Prometheus의 ServiceAccount에 `nodes/proxy` 리소스에 대한 `get` 권한이 있어야 합니다. 기존 RBAC엔 `nodes`, `nodes/metrics`만 있었고 `nodes/proxy`가 빠져 있어 추가했습니다.

```yaml
rules:
  - apiGroups: [""]
    resources: [nodes, nodes/metrics, nodes/proxy, services, endpoints, pods]
    verbs: ["get", "list", "watch"]
```

---

## 4. 함정: cgroup 계층 롤업과 실제 컨테이너 지표가 섞여 나온다

cAdvisor는 `id` 라벨에 cgroup 경로를 그대로 노출합니다. 아무 필터 없이 `container_memory_working_set_bytes`를 조회하면 이런 값들이 한꺼번에 나옵니다.

```
{id="/"}                                    ← 노드 전체 cgroup 루트 (모든 컨테이너 합산)
{id="/kubepods.slice"}                      ← Kubernetes가 관리하는 전체 cgroup
{id="/kubepods.slice/kubepods-besteffort.slice"}  ← QoS 클래스별 합산
{pod="grafana-...", container="grafana"}    ← 실제로 원하는 개별 컨테이너 지표
```

앞의 세 개는 **집계용 상위 계층**이고, 원하는 건 마지막처럼 `pod`와 `container` 라벨이 붙은 leaf 지표입니다. `container!=""` 필터만으로는 부족한데, `container="POD"`(pause 컨테이너, 실제 워크로드가 아니라 네트워크 네임스페이스 홀더)까지 섞여 들어오기 때문입니다.

```promql
# 틀린 예: 상위 계층 롤업까지 다 합산되어 실제보다 몇 배 부풀려진 값이 나옴
sum(container_memory_working_set_bytes{namespace="self-intro"})

# 올바른 예: leaf 컨테이너만, pause 컨테이너 제외
sum(container_memory_working_set_bytes{namespace="self-intro", container!="", container!="POD"}) by (pod)
```

이 필터를 빠뜨리면 대시보드 합산값이 실제 사용량의 3~4배로 부풀려져 나오는데, 숫자가 "그럴듯하게 큰" 값이라 한눈에 이상하다고 알아채기 어렵습니다. 라이브 쿼리로 라벨 구조를 직접 확인하고 나서야 원인을 찾았습니다.

---

## 5. Pod Overview 대시보드 해석

| 패널 | 지표 | 해석 |
| :--- | :--- | :--- |
| Pods Running / Pending·Failed | `kube_pod_status_phase` | Pending이 지속되면 스케줄링 실패(리소스 부족, PVC 미바인딩 등) 의심 |
| Total Restarts (1h) | `increase(kube_pod_container_status_restarts_total[1h])` | 0이 정상. 증가하면 CrashLoopBackOff나 OOMKilled 확인 |
| CPU/Memory Usage by Pod | `container_cpu_usage_seconds_total` / `container_memory_working_set_bytes` | 어떤 Pod가 자원을 많이 쓰는지 즉시 식별 |
| Memory: Usage vs Requests vs Limits | 세 지표 비교 | usage가 limits에 근접하면 OOMKilled 위험, requests보다 훨씬 낮으면 과할당(리소스 낭비) |

**실전 팁**: `usage` 선이 `limits` 선에 붙어서 움직이면 곧 OOMKilled가 날 신호입니다. 반대로 `usage`가 `requests`보다 한참 아래에서 안정적으로 유지되면, 그 Pod의 requests를 낮춰 노드 자원을 더 효율적으로 쓸 수 있다는 뜻입니다.

---

## 6. Node Overview vs Pod Overview — 언제 뭘 봐야 하나

| 상황 | 먼저 볼 대시보드 |
| :--- | :--- |
| "서버 전체가 느려요" | Node Overview → CPU/Memory 사용률, Load Average |
| "특정 기능만 느려요" | Pod Overview → 관련 Pod의 CPU/Memory, 재시작 여부 |
| "Pod가 자꾸 죽어요" | Pod Overview → Restarts 패널 → 원인 파악 후 App Logs 대시보드로 전환 |
| "디스크가 꽉 찼어요" | Node Overview → Disk Usage by Mount |

Node Overview에서 이상 신호를 발견하면 Pod Overview로 내려가 "어떤 Pod 때문인지" 좁히고, 다시 App Logs 대시보드로 "왜 그런지" 로그를 확인하는 흐름이 가장 효율적입니다.

---

## 7. 핵심 요약 (Key Takeaways)

- **kube-state-metrics는 "상태", cAdvisor는 "사용량"** — 역할이 다른 두 도구를 함께 써야 Pod 레벨 관측이 완성됩니다.
- **cAdvisor는 kubelet 내장 기능**이라 별도 배포 없이 API 서버 프록시로 접근합니다. 이때 `nodes/proxy` RBAC 권한이 반드시 필요합니다.
- **cgroup 계층 롤업 함정**: `container!="", container!="POD"` 필터 없이 합산하면 상위 계층 집계까지 더해져 값이 부풀려집니다. 라이브 쿼리로 라벨 구조를 직접 확인하는 습관이 중요합니다.
- **Node → Pod → Logs 순으로 좁혀가는 디버깅 흐름**이 "무엇이 문제인지"에서 "왜 문제인지"까지 가장 빠르게 도달하는 경로입니다.
',
  'DRAFT',
  5,
  '2026-08-04',
  NULL,
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Observability', 'Grafana')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Kubernetes', 'Docker', 'Prometheus')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 이전 편과 FOLLOW_UP 관계 설정
INSERT INTO `study_relation` (`source_study_id`, `target_study_id`, `relation_type`, `display_order`)
SELECT @study_id, `id`, 'FOLLOW_UP', 0 FROM `study` WHERE `slug` = 'rabbitmq-mysql-oracle-atp-exporter-setup'
ON DUPLICATE KEY UPDATE `source_study_id` = `source_study_id`;


INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'monitoring-stack-persistent-volume-troubleshooting',
  '모니터링 스택 영속성 확보 3단 삽질 — PVC, attachment-type, fsGroup',
  'Grafana 계정이 배포마다 초기화되던 근본 원인(볼륨 마운트 부재)을 고치는 과정에서 순서대로 만난 세 가지 장애물 — attachment-type 불일치로 인한 attach 실패, GitOps selfHeal이 되돌리는 타이밍 문제, non-root 컨테이너의 fsGroup 권한 문제를 기록합니다.',
  '# 모니터링 스택 영속성 확보 3단 삽질 — PVC, attachment-type, fsGroup

## 1. 문제 발견: "왜 배포할 때마다 Grafana 계정이 초기화되지?"

대시보드 작업을 위해 Grafana Pod를 여러 번 재시작하던 중, 이전에 콘솔에서 직접 바꿔둔 admin 비밀번호가 계속 `admin/admin` 기본값으로 되돌아가는 현상을 발견했습니다. 원인은 단순했습니다 — **Grafana, Prometheus, Loki 세 Deployment 모두 데이터 디렉토리(`/var/lib/grafana`, `/prometheus`, `/loki`)에 볼륨 마운트가 아예 없었습니다.**

Pod가 재시작되면 컨테이너 파일시스템이 초기화되고, Grafana는 `GF_SECURITY_ADMIN_PASSWORD` 환경변수 기본값으로 매번 새로 seed됩니다. Prometheus는 `--storage.tsdb.retention.time=15d`를 설정해뒀지만 애초에 재시작하면 그 15일치 데이터 자체가 사라지는 구조였습니다. Loki도 마찬가지로 과거 로그가 매번 증발했습니다.

이 문제를 고치는 과정에서 세 단계의 서로 다른 장애물을 순서대로 만났습니다.

```mermaid
flowchart LR
    A["PVC 추가"] --> B["1단계: Attach 실패<br/>(in-transit 암호화)"]
    B --> C["attachment-type 수정"]
    C --> D["2단계: 디바이스 슬롯 충돌<br/>(재생성 타이밍)"]
    D --> E["재시도로 자연 해소"]
    E --> F["3단계: 권한 거부<br/>(fsGroup 누락)"]
    F --> G["fsGroup 지정 → 해결"]
```

---

## 2. 1단계: PVC 볼륨이 아예 Attach되지 않음

각 컴포넌트에 PVC를 추가했습니다.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-data
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 2Gi
```

Pod를 재생성하자 `ContainerCreating`에서 멈췄습니다.

```
Warning  FailedAttachVolume  ... node has in transit encryption enabled,
but attachment type is not paravirtualized. invalid input
```

OKE 노드에 in-transit 암호화(전송 중 데이터 암호화)가 켜져 있는데, 클러스터 기본 `oci-bv` StorageClass가 만드는 볼륨은 iSCSI 방식으로 attach를 시도해 호환되지 않았습니다. 해결은 `attachment-type: paravirtualized` 파라미터를 명시한 전용 StorageClass를 새로 만드는 것이었습니다.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: oci-bv-paravirtualized
provisioner: blockvolume.csi.oraclecloud.com
parameters:
  attachment-type: paravirtualized
volumeBindingMode: WaitForFirstConsumer
```

**클러스터 기본 StorageClass를 직접 바꾸지 않고 새 StorageClass를 추가한 이유**: 다른 워크로드가 암묵적으로 기본 StorageClass에 의존하고 있을 수 있어, 영향 범위를 이번에 새로 만드는 PVC 3개로만 한정하기 위함입니다.

---

## 3. 2단계: GitOps 환경 특유의 재생성 타이밍 문제

StorageClass를 고치고 PVC를 재생성했는데, 이번엔 다른 에러가 나왔습니다.

```
Error: 409 Conflict — the specified device attribute /dev/oracleoci/oraclevdb
is already in use.
```

빠르게 PVC를 지웠다 다시 만드는 과정에서 OCI 컴퓨트 서비스 쪽의 디바이스 슬롯 정리가 살짝 지연되며 생긴 충돌이었습니다. 몇십 초 뒤 재시도에서 자연스럽게 해소됐습니다 — 이 단계는 코드 수정이 아니라 **급하게 지웠다 만들지 말고 여유를 두는 것**이 해법이었습니다.

또 한 가지 배운 점: **ArgoCD의 `selfHeal: true`는 git에 없는 수동 변경을 계속 되돌립니다.** PVC를 `kubectl delete`로 지운 직후 ArgoCD 자동 동기화가 (아직 push하지 않은) 예전 git 상태로 먼저 재생성해버려서, 새 StorageClass 커밋을 push하기 전에 PVC가 옛날 설정으로 다시 만들어지는 일이 반복됐습니다. **라이브 클러스터를 손으로 고치기 전에 먼저 git에 커밋·푸시하고, 그 다음 동기화를 강제(hard refresh)하는 순서**를 지켜야 이 되돌림을 피할 수 있습니다.

---

## 4. 3단계: 새 볼륨의 권한 문제

볼륨이 정상 attach된 뒤에도 세 Pod 모두 크래시했습니다.

```
# Grafana
mkdir: can''t create directory ''/var/lib/grafana/plugins'': Permission denied

# Prometheus
panic: Unable to create mmap-ed active query log
err="open data/queries.active: no such file or directory"

# Loki
mkdir /loki/rules: permission denied
```

새로 프로비저닝된 블록 볼륨은 기본적으로 `root:root` 소유입니다. 세 이미지 모두 non-root 유저로 실행되는데(Grafana 472, Prometheus 65534/nobody, Loki 10001), 그 유저들에게 쓰기 권한이 없어 전부 실패한 것입니다. Kubernetes의 `securityContext.fsGroup`을 Pod 레벨에 지정하면, kubelet이 볼륨 attach 시점에 해당 그룹으로 소유권을 맞춰줍니다.

```yaml
spec:
  template:
    spec:
      securityContext:
        fsGroup: 472   # grafana / 65534: prometheus / 10001: loki
```

각 이미지의 공식 문서에 명시된 UID를 그대로 사용했습니다. 세 컴포넌트 모두 `strategy: Recreate`도 함께 추가했는데, `ReadWriteOnce` 볼륨은 새 Pod와 기존 Pod가 동시에 붙을 수 없어 기본 롤링 업데이트 전략(`RollingUpdate`)을 쓰면 배포가 그대로 멈추기 때문입니다.

---

## 5. 검증: 진짜로 고쳐졌는가

fsGroup을 넣은 뒤 Pod가 `1/1 Running`으로 안정화된 것을 확인하고, 마지막으로 Grafana Pod를 강제로 재시작해 실제 지속성을 검증했습니다.

```bash
kubectl delete pod -n self-intro -l app=grafana --force --grace-period=0
kubectl exec ... -- ls -la /var/lib/grafana/grafana.db
# -rw-rw---- 1 grafana 472 1052672 ... grafana.db
```

재시작 후에도 `grafana.db`가 그대로 남아있고, 로그인 세션이 초기화되지 않는 것을 확인했습니다.

---

## 6. 스토리지 비용 고려

PVC를 붙이면서 실제로 얼마나 쓰는지도 확인했습니다. **OCI Block Volume의 최소 크기는 50GB**라 2Gi/10Gi/5Gi를 요청해도 각각 50GB씩 잡힙니다. 부트 볼륨(47GB) + 신규 3개(150GB) = 197GB로, Always Free 한도(200GB) 안에 들어오긴 하지만 여유가 3GB뿐이었습니다.

RWX(ReadWriteMany)로 하나의 볼륨을 세 Pod가 공유하는 방안도 검토했지만, Block Volume은 애초에 RWO(ReadWriteOnce) 전용이라 공유하려면 별도의 File Storage Service(FSS)가 필요하고, 이는 Always Free 대상이 아닙니다. 대신 **OCI Block Volume 자체가 GB당 월 $0.025~0.04 수준으로 저렴**해서, 무료 할당량을 조금 넘기더라도 실질 비용 부담이 크지 않다는 걸 확인하고 지금 구조(컴포넌트별 개별 PVC)를 그대로 유지하기로 했습니다. 굳이 세 컴포넌트를 하나의 Pod로 합쳐 구조를 복잡하게 만들 이유가 없었습니다.

---

## 7. 핵심 요약 (Key Takeaways)

- **데이터 디렉토리에 볼륨을 마운트하지 않으면, "재시작해도 데이터가 남아있다"는 보장이 전혀 없습니다.** Deployment 정의만 보고 영속성을 당연시하면 안 됩니다.
- **클라우드 프로바이더의 스토리지 클래스는 노드 설정(암호화 등)과 attachment 방식이 맞아야 합니다.** 에러 메시지를 그대로 읽고 필요한 파라미터를 StorageClass에 명시하면 해결됩니다.
- **ArgoCD의 selfHeal은 라이브 변경을 계속 되돌립니다.** 테스트도 git 커밋 → push → 동기화 순서로 진행해야 헛수고를 피할 수 있습니다.
- **새 볼륨은 기본적으로 root 소유입니다.** non-root로 도는 컨테이너라면 `fsGroup`을 반드시 지정해야 합니다.
- **RWO 볼륨 + 롤링 업데이트 조합은 배포를 멈추게 합니다.** `strategy: Recreate`로 바꿔야 합니다.
- **클라우드 스토리지는 생각보다 저렴합니다.** 무료 한도에 여유가 없다고 구조를 억지로 복잡하게 만들기보다, 실제 초과 비용을 먼저 계산해보는 것이 합리적입니다.
',
  'DRAFT',
  5,
  '2026-08-04',
  NULL,
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Observability')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Kubernetes', 'Grafana')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 이전 편과 FOLLOW_UP 관계 설정
INSERT INTO `study_relation` (`source_study_id`, `target_study_id`, `relation_type`, `display_order`)
SELECT @study_id, `id`, 'FOLLOW_UP', 0 FROM `study` WHERE `slug` = 'kubernetes-pod-level-monitoring-cadvisor-kube-state-metrics'
ON DUPLICATE KEY UPDATE `source_study_id` = `source_study_id`;


INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'gitops-monitoring-operational-details-log-labeling-argocd-health',
  'GitOps 운영의 디테일 — 로그 라벨 분리, ArgoCD 헬스체크 커스터마이징, 대시보드 코드화',
  '겉보기엔 정상 동작하지만 신뢰할 수 없는 관측 데이터를 만들던 세 가지 문제 — 이름이 겹치는 리소스 때문에 섞여 들어가던 로그 라벨, ArgoCD가 SealedSecret을 오판하던 헬스체크, UI로만 존재해 재시작 한 번에 사라진 대시보드를 코드로 되돌린 기록입니다.',
  '# GitOps 운영의 디테일 — 로그 라벨 분리, ArgoCD 헬스체크 커스터마이징, 대시보드 코드화

## 1. 개요

모니터링 스택을 붙이고 안정화한 뒤, 표면적으로는 잘 돌아가는 것처럼 보이던 세 가지 문제를 추가로 발견했습니다. 셋 다 "당장 장애는 아니지만 방치하면 신뢰할 수 없는 관측 데이터를 만드는" 종류의 문제였습니다.

---

## 2. 로그 라벨링 버그: worker 로그가 api 로그에 섞여 들어가고 있었다

Grafana Alloy(로그 수집 에이전트) 설정에서 로그 파일을 찾는 glob 패턴을 이렇게 정의해뒀습니다.

```alloy
local.file_match "self_intro_backend" {
  path_targets = [
    {
      "__path__" = "/var/log/containers/*self-intro-backend*.log",
      "service"  = "self-intro-backend",
    },
  ]
}
```

문제는 `self-intro-backend-worker` Pod의 로그 파일명도 `self-intro-backend`를 부분 문자열로 포함한다는 점입니다. `*self-intro-backend*.log`라는 glob은 **api든 worker든 가리지 않고 둘 다 매칭**하지만, `service` 라벨은 하드코딩된 `"self-intro-backend"` 하나뿐이라 **worker의 로그가 api와 똑같은 라벨로 Loki에 쌓이고 있었습니다.**

겉보기엔 문제가 없어 보입니다 — 로그는 분명히 들어오고 있으니까요. 하지만 Grafana의 App Logs 대시보드에서 "worker만 필터링해서 보자"는 시도 자체가 불가능한 상태였습니다. 드롭다운엔 `self-intro-backend` 하나만 뜨고, 그 안에 두 서비스의 로그가 뒤섞여 있었습니다.

### 진단 과정

Alloy는 자체 디버그 API(`:12345/api/v0/web/components`)를 제공합니다. 컴포넌트 상태를 조회해보니 `local.file_match`는 두 파일을 **둘 다 정상적으로 discover**하고 있었고, 실제 tail 로그(`Seeked ... offset ...`)도 worker 파일을 읽고 있었습니다. 즉 "수집 자체는 되는데 라벨만 잘못 붙는" 정확한 증상이었습니다.

### 해결: discovery.relabel로 경로 기반 라벨 재작성

```alloy
discovery.relabel "self_intro_backend" {
  targets = local.file_match.self_intro_backend.targets

  rule {
    source_labels = ["__path__"]
    regex         = ".*backend-worker.*"
    target_label  = "service"
    replacement   = "self-intro-backend-worker"
  }
}

loki.source.file "self_intro_backend" {
  targets    = discovery.relabel.self_intro_backend.output
  forward_to = [loki.write.local.receiver]
}
```

경로에 `backend-worker`가 포함된 타겟만 `service` 라벨을 덮어씁니다. 나머지(api)는 기존 라벨을 그대로 유지합니다. 적용 후 Loki에서 두 서비스가 확실히 분리된 것을 확인했습니다.

```
{"service": "self-intro-backend"}
{"service": "self-intro-backend-worker"}
```

**교훈**: 문자열 매칭 기반의 파일 discovery는 이름이 서로를 포함하는 리소스(`backend` ⊂ `backend-worker`)가 있으면 조용히 섞입니다. 매칭은 되지만 의도한 대로 분리되지 않는 상태는, 완전히 실패하는 것보다 알아채기 어렵습니다.

---

## 3. ArgoCD 헬스체크 오탐: SealedSecret이 항상 Degraded로 뜨는 문제

`mysqld-exporter`, `oracledb-exporter` 앱을 ArgoCD에 등록하니 `Synced` 상태인데도 앱 전체가 `Degraded`로 표시됐습니다. 리소스 트리를 열어보니 Deployment/Service는 전부 초록(Healthy)인데 **SealedSecret 리소스만 빨간 하트**였습니다.

원인은 ArgoCD가 `bitnami.com/v1alpha1, Kind=SealedSecret`이라는 커스텀 리소스의 헬스 상태를 판단하는 방법을 모른다는 것이었습니다. SealedSecret은 컨트롤러가 복호화해서 진짜 Secret으로 바꿔주기 전까지는 원래 "정적인 암호화된 값"일 뿐, 애초에 런타임 헬스 개념이 없는 리소스입니다. ArgoCD는 알 수 없는 리소스 타입의 헬스를 기본값(이 경우 Degraded)으로 처리합니다.

### 해결: 커스텀 헬스체크 등록

ArgoCD는 `argocd-cm` ConfigMap에 Lua 스크립트로 특정 리소스 타입의 헬스 판정 로직을 등록할 수 있는 공식 확장점을 제공합니다.

```yaml
resource.customizations.health.bitnami.com_SealedSecret: |
  hs = {}
  hs.status = "Healthy"
  hs.message = "SealedSecret has no runtime health status"
  return hs
```

이 패턴은 SealedSecret을 쓰는 GitOps 저장소에서 흔히 발견되는 표준적인 해법입니다. 라이브 클러스터에 먼저 패치해서 즉시 적용한 뒤, `deploy/argocd/kustomization.yaml`에도 같은 패치를 코드로 반영해 `kubectl apply -k deploy/argocd`를 다시 실행해도 유지되도록 했습니다.

---

## 4. 대시보드를 UI로 만들면 왜 위험한가

이번 작업 중 가장 뼈아팠던 발견: 예전에 Grafana UI에서 수동으로 import했던 "Spring Boot 3.x Statistics" 대시보드가 **PVC 작업 도중 Pod를 여러 번 재시작시키는 사이 통째로 사라졌습니다.** (§모니터링 스택 영속성 확보 3단 삽질 참고) UI로 만든 대시보드는 Grafana의 내부 sqlite(`grafana.db`)에만 저장되고, 그 파일은 볼륨이 없으면 Pod 재시작마다 초기화되는 대상이었습니다.

### 해결: provisioning으로 코드화

Grafana는 파일 기반 프로비저닝을 지원합니다. ConfigMap으로 대시보드 JSON을 마운트하면, Pod가 몇 번을 재시작하든 부팅 시점에 자동으로 다시 로드됩니다.

```yaml
# provider 설정
apiVersion: 1
providers:
  - name: ''Default''
    type: file
    options:
      path: /var/lib/grafana/dashboards
```

사라진 대시보드는 원본이 Grafana.com 커뮤니티 대시보드(ID 12900)였기 때문에 다시 다운로드해 복구할 수 있었습니다. 다만 원본 JSON은 `${DS_PROMETHEUS}` 같은 import 시점 템플릿 변수를 쓰기 때문에, provisioning으로 쓰려면 실제 데이터소스 이름(`Prometheus`)으로 치환해줘야 합니다.

```python
raw = json.dumps(dashboard_json)
raw = raw.replace(''${DS_PROMETHEUS}'', ''Prometheus'')
```

로그 뷰어 대시보드(ID 13639)도 같은 방식으로 추가했는데, 이번엔 원본이 기대하는 라벨(`job`)이 우리 Loki 라벨 스키마(`service_name`, §2의 Alloy 설정과 연동)와 달라서 쿼리를 직접 고쳐야 했습니다.

```diff
- {job="$app"} |= "$search" | logfmt
+ {service_name="$app"} |= "$search"
```

**교훈**: Grafana UI의 "Import" 버튼은 당장 편하지만, 그 결과물은 코드 저장소 어디에도 남지 않는 상태입니다. 조직 규모와 무관하게, 유지하고 싶은 대시보드는 반드시 JSON을 저장소에 커밋하고 provisioning으로 로드해야 합니다.

---

## 5. 핵심 요약 (Key Takeaways)

- **이름이 서로를 부분 문자열로 포함하는 리소스는 glob/substring 기반 매칭에서 조용히 섞입니다.** 완전한 실패보다 훨씬 늦게 발견됩니다 — 정기적으로 라벨 분포를 직접 조회해보는 습관이 필요합니다.
- **모니터링 도구 자체의 디버그 API를 활용하세요.** Alloy의 `:12345/api/v0/web/components`처럼, 대부분의 관측 도구는 스스로를 관측할 수 있는 내부 API를 제공합니다.
- **ArgoCD는 모르는 커스텀 리소스를 기본적으로 Degraded 취급합니다.** `resource.customizations.health`로 명시적인 헬스 판정 로직을 등록하면 해결됩니다.
- **UI로 만든 설정은 코드가 아닙니다.** Grafana 대시보드, Import한 리소스 등 UI에서만 존재하는 상태는 재시작·재배포 한 번에 사라질 수 있다고 가정하고, 처음부터 provisioning/코드로 정의하는 습관이 필요합니다.
',
  'DRAFT',
  5,
  '2026-08-04',
  NULL,
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Observability', 'Grafana')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Kubernetes', 'Loki', 'Grafana')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 이전 편과 FOLLOW_UP 관계 설정
INSERT INTO `study_relation` (`source_study_id`, `target_study_id`, `relation_type`, `display_order`)
SELECT @study_id, `id`, 'FOLLOW_UP', 0 FROM `study` WHERE `slug` = 'monitoring-stack-persistent-volume-troubleshooting'
ON DUPLICATE KEY UPDATE `source_study_id` = `source_study_id`;

