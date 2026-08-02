-- Node Exporter 기반 쿠버네티스 노드 모니터링 및 Grafana 대시보드(1860 vs 11074) 사용법 스터디 노트 추가.

INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'kubernetes-node-exporter-grafana-dashboard-deep-dive',
  'Node Exporter × Grafana 쿠버네티스 인프라 노드 모니터링 심층 가이드 (1860 vs 11074)',
  '쿠버네티스 노드 레벨의 OS 물리 자원(CPU, RAM, Disk I/O, Network)을 수집하는 Node Exporter DaemonSet 아키텍처 구축 과정과, 대표적인 Grafana 대시보드 1860(Node Exporter Full) 및 11074(Node Exporter Modern) 패널별 분석과 실전 가이드를 다룹니다.',
  '# Node Exporter × Grafana 쿠버네티스 인프라 노드 모니터링 심층 가이드 (1860 vs 11074)

## 1. 개요: 앱 레벨 vs 노드 레벨 모니터링

관측 가능성(Observability) 체계는 크게 애플리케이션 레벨과 노드(인프라) 레벨로 나뉩니다.

| 구분 | 애플리케이션 레벨 (Actuator) | 노드 레벨 (Node Exporter) |
| :--- | :--- | :--- |
| **수집 주체** | Spring Boot Actuator + Micrometer | **Node Exporter DaemonSet** |
| **관측 대상** | JVM Heap, GC Pause, HTTP TPS, HikariCP | **OS CPU, RAM, Disk I/O, Network B/W** |
| **Grafana 대시보드** | `19004` (Spring Boot 3.x) | **`1860`** (Full) / **`11074`** (Modern) |
| **목적** | 자바 앱 내부 병목 및 메모리 누수 감지 | **가상 서버(Host Node) 자원 고갈 및 OS 장애 감지** |

---

## 2. Node Exporter K8s DaemonSet 아키텍처

Node Exporter는 쿠버네티스 클러스터의 각 워커 노드마다 1개씩 자동 배포되는 **DaemonSet** 형태로 구동됩니다.

```
Worker Node (Host OS)
  ├─ /proc, /sys, / (호스트 파일시스템)
  │
  └─ Node Exporter Pod (DaemonSet)
       │ hostNetwork: true (포트 9100)
       ▼
   Prometheus (Pod) ──[PromQL]──► Grafana (대시보드 1860 / 11074)
```

### 핵심 K8s 설정 요소

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
spec:
  template:
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: node-exporter
          image: docker.io/prom/node-exporter:v1.8.1
          args:
            - "--path.procfs=/host/proc"
            - "--path.sysfs=/host/sys"
            - "--path.rootfs=/host/root"
          ports:
            - containerPort: 9100
```

1. **`hostNetwork: true`**: Pod 가상 네트워크 격리를 우회하여 호스트 노드의 네트워크 인터페이스 메트릭을 직접 측정합니다.
2. **`hostPID: true`**: 호스트 OS의 프로세스 커널 상태 정보에 접근합니다.
3. **Volume Mount (`/proc`, `/sys`, `/`)**: 노드 호스트의 시스템 정보를 Pod 내부 `/host/*` 경로로 마운트하여 OS 메트릭을 정확히 수집합니다.

---

## 3. 대시보드 비교: 1860 vs 11074

| 비교 항목 | Dashboard 1860 (Node Exporter Full) | Dashboard 11074 (Node Exporter Modern) |
| :--- | :--- | :--- |
| **특징** | Grafana 커뮤니티 **전 세계 1위 표준 대시보드** | 직관적인 **게이지(Gauge) 중심의 모던 대시보드** |
| **정보 밀도** | 매우 높음 (모든 OS 하드웨어 항목 포함) | 핵심 요약 위주 (시각적 깔끔함) |
| **주요 시각화** | 빽빽한 시계열 차트 및 상세 스펙 테이블 | 직관적인 circular 게이지 바 & 스택 차트 |
| **적합한 용도** | **깊은 인프라 디버깅 및 디스크 I/O 분석** | **일상적인 노드 자원 모니터링 및 한눈 확인** |

---

## 4. 대시보드 1860 (Node Exporter Full) 핵심 패널 해석

### 1) CPU Busy / Load Average
- **CPU Utilization (%)**: `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
  - 전체 CPU 코어 중 일(Task)을 하고 있는 시간의 비율입니다.
- **System Load 1m/5m/15m**: 실행 대기 중인 프로세스 수입니다.
  - **정상 기준**: `Load Average < CPU 코어 수`. 예를 들어 2코어 서버에서 Load가 2.0 미만이면 정상입니다.

### 2) Memory Basic / Advanced
- **RAM Used**: `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes`
  - 단순히 `MemFree`가 아닌 **`MemAvailable`**을 기준으로 차감 계산해야 정확합니다. (리눅스는 남는 메모리를 버퍼/캐시로 쓰기 때문)
- **Swap Usage**: 리눅스 스왑 메모리 사용량.
  - **주의**: 스왑 메모리가 사용되기 시작하면 디스크 스와핑으로 인해 IOPS 성능이 급격히 저하되므로 **0% 유지**가 권장됩니다.

### 3) Disk R/W & IOPS
- **Disk Read/Write Bytes**: 초당 디스크 읽기/쓰기 대역폭 (MB/s).
- **Disk IOPS**: `rate(node_disk_reads_completed_total[1m]) + rate(node_disk_writes_completed_total[1m])`
- **Disk I/O Util (%)**: `rate(node_disk_io_time_seconds_total[1m]) * 100`
  - 80% 이상 지속 시 디스크 병목 발생.

### 4) Network Traffic
- **Network Receive / Transmit**: 초당 네트워크 수신/발신 트래픽 (Kbps/Mbps).
- **Network Errors / Drops**: 네트워크 패킷 유실 및 에러 건수. **0이 정상**.

---

## 5. 대시보드 11074 (Node Exporter Modern) 핵심 패널 해석

1. **System Quick View (Gauge Bar)**
   - CPU 사용률, RAM 사용률, Disk 사용률을 상단 게이지 바 형태로 보여주어 1초 만에 노드 건강 상태를 파악할 수 있습니다.
2. **CPU & Load Trends**
   - 코어별 CPU 사용 추이 및 1분/5분/15분 평균 로드를 깔끔한 스택 그래프로 시각화합니다.
3. **Memory Distribution**
   - Total, Used, Cached, Buffers, Free 구성을 한눈에 보여줍니다.
4. **Network & Storage Summary**
   - 인터페이스별 트래픽과 루트 파일시스템(`/`) 점유율을 시각화합니다.

---

## 6. 노드 인프라 장애 판단 경보(Alert) 기준

| 메트릭 항목 | 경보 조건 | 심각도 | 조치 방법 |
| :--- | :--- | :--- | :--- |
| **CPU 사용률** | > 85% (10분 지속) | Warning | 스케일 아웃(노드 증설) 또는 Pod CPU Limit 조정 |
| **Memory Available** | < 10% (5분 지속) | Critical | OOM Killer 동작 방지를 위한 노드 메모리 확장 |
| **Disk 점유율 (`/`)** | > 85% | Warning | 불필요 도커 이미지/컨테이너 로그 수거 (`docker image prune`) |
| **Disk 점유율 (`/`)** | > 95% | Critical | 디스크 볼륨 크기 확장 |
| **Disk I/O Util** | > 90% (5분 지속) | Warning | 디스크 IOPS 스펙 업그레이드 또는 DB 슬로우 쿼리 점검 |
| **Network Drops** | > 10/sec | Warning | K8s CNI 네트워크 플러그인 및 물리 랜 카드 점검 |

---

## 7. 핵심 요약 (Key Takeaways)

- **DaemonSet 활용**: Node Exporter는 K8s 노드당 1개씩 자동 배포되는 DaemonSet 구조.
- **`hostNetwork` & Mount**: OS 자원 수집을 위해 `hostNetwork: true` 및 `/proc`, `/sys`, `/` 마운트 필수.
- **대시보드 선택**: 
  - 일상 모니터링은 디자인이 깔끔한 **`11074`**
  - 상세 디버깅 및 I/O 분석은 **`1860`**
- **메모리 계산 주의**: 리눅스 메모리는 `MemFree`가 아닌 **`MemAvailable`** 기준으로 측정해야 정확합니다.',
  'PUBLISHED',
  5,
  '2026-08-02',
  NOW(),
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

-- 관련 태그 연결 (Observability, Kubernetes, Docker, Grafana, DevOps)
INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Observability', 'Kubernetes', 'Docker', 'Grafana', 'DevOps')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 관련 스킬 연결 (Grafana, Prometheus, Kubernetes, Docker)
INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Grafana', 'Prometheus', 'Kubernetes', 'Docker')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 이전 모니터링 스터디(V143)와 연관 관계 설정
INSERT INTO `study_related` (`study_id`, `related_study_id`, `relation_type`)
SELECT @study_id, `id`, 'RELATED' FROM `study` WHERE `slug` = 'grafana-prometheus-spring-boot-dashboard-deep-dive'
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;
