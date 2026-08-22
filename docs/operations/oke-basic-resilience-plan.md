# OKE Basic 저비용 복원력·오토스케일링 운영 계획

- 기준일: 2026-08-22
- 적용 환경: production 단일 환경
- 서비스 상태: 외부 route와 핵심 workload 정상 운영
- 인프라 전환 상태: primary 교체와 Metrics Server·HPA·Cluster Autoscaler 운영 배포 완료, burst `0..1` 전환 중
- 비용 원칙: 월 2만원 상한과 OCI Budget 경보를 유지하고, 새 유료 리소스는 생성 전에 다시 승인받는다.

## 1. 현재 실제 상태

| 역할 | 실제 사양 | 실제 상태 | 비고 |
| --- | --- | --- | --- |
| primary | A1 2 OCPU / 8GB | Ready | IP `10.0.20.254` |
| fixed-secondary | A1 1 OCPU / 4GB | Ready | IP `10.0.20.235` |
| burst | A1 1 OCPU / 4GB | Ready | IP `10.0.20.101`, `0..1` 전환 전 마지막 검증 node |
| 이전 primary | A1 1 OCPU / 4GB | Deleted | IP `10.0.20.5`, 안전 drain 후 pool 크기 차감 |
| 최초 primary | A1 2 OCPU / 12GB | Terminated | 재사용·재시작할 수 없음 |

현재 실행 합계는 burst 포함 4 OCPU/16GB이고, burst가 0으로 축소되면 상시 합계는 3 OCPU/12GB다.
새 primary `10.0.20.254`는 Ready와 시스템 DaemonSet을 확인한 뒤 이전 primary `10.0.20.5`를
cordon·drain하고 OKE node pool 크기를 1로 차감했다. API·frontend는 교체 중에도 Ready를 유지했고,
RWO volume을 사용하는 Tempo의 일시적 Multi-Attach도 detach/attach 완료 후 자동 복구됐다.

## 2. 최종 목표와 한계

| 노드풀 | 목표 사양 | 정상 크기 | Autoscaler | 용도 |
| --- | --- | ---: | --- | --- |
| fixed-primary | A1 2 OCPU / 8GB | 1 | 제외 | 전체 workload |
| fixed-secondary | A1 1 OCPU / 4GB | 1 | 제외 | 장애 시 핵심 workload |
| burst | A1 1 OCPU / 4GB | 0 | `0..1` | 트래픽·배포 surge |

2/8 primary 확보와 workload·route 검증을 완료했으므로 burst를 `0..1`로 전환한다. 이 구성은
OKE Enhanced, 다중 AD 무중단, 데이터 계층 HA가 아니다. primary 장애 시 API·frontend·Redis·RabbitMQ를
우선 유지하고 Worker와 관측 stack은 중단할 수 있는 축소 운영을 목표로 한다.

## 3. 비용 통제

- self-intro compartment에 `self-intro-private-beta-20k-krw-cap` 17 SGD Budget이 있다.
- forecast 70%, actual 85%, actual 100% 경보가 ACTIVE이고 수신자는 `support@unbrdn.me`다.
- Budget은 통지만 하며 node pool을 자동 중지하지 않는다.
- 상시 compute 합계는 3 OCPU/12GB이고 burst 활성 중에는 4 OCPU/16GB다. 무료 공제 적용 여부와
  boot/block volume, Container Image Storage를 OCI Usage API에서 함께 확인해야 한다.
- burst는 Pending Pod가 있을 때만 최대 1대까지 실행한다. actual 85% 경보가 오면 신규 scale-out을
  중지하고 Usage API로 원인을 확인한다.

무료 한도와 가격 정책은 변경될 수 있으므로 문서의 과거 수치를 청구 근거로 사용하지 않는다. 현재 비용은
OCI Cost Analysis·Usage API·Budget 경보의 실제 계정 데이터로 판단한다.

## 4. 트래픽 자동 확장

1. Metrics Server가 API·frontend Pod 사용량을 제공한다.
2. API HPA는 CPU 70% 또는 메모리 75%, frontend HPA는 CPU 70%에서 replica를 1~2로 조절한다.
3. 고정 노드에 자리가 없으면 새 Pod가 Pending이 된다.
4. Cluster Autoscaler가 Pod request를 보고 burst pool을 확장한다.
5. HPA는 scale-down 600초, autoscaler는 불필요 상태 15분 뒤 축소를 시도한다.

burst node에는 모든 node에서 실행되는 OKE·관측 DaemonSet이 있어 기본 utilization 계산만 사용하면
실제 이동 대상이 아닌 request 때문에 축소가 막힌다. 운영 manifest는 DaemonSet utilization을 유휴
판정에서 제외하고 일반 Pod request 80% 미만을 후보로 삼는다. 이후에도 scheduler simulation과 Pod
제약 검사를 통과해야만 node를 삭제한다.

GitOps manifest는 primary 교체 검증 후 burst pool을 `0:1`로 전환했다. scale-up·scale-down rehearsal를
통과해야 최종 완료로 판정한다.

```text
--nodes=0:1:ocid1.nodepool.oc1.ap-chuncheon-1.aaaaaaaa5v62pdcfrbw6u3ajp7xb73d357wvsowm6rxyfucatn4ec276223a
--ignore-daemonsets-utilization=true
--scale-down-utilization-threshold=0.8
```

Worker는 queue backlog가 병목 신호이므로 CPU HPA를 적용하지 않는다. KEDA 또는 Prometheus Adapter는
별도 비용·복잡도 검토 전까지 추가하지 않는다.

## 5. 장애 레벨

| 레벨 | 상황 | 대응 | 서비스 수준 |
| --- | --- | --- | --- |
| L0 | 정상 | primary 2/8 + secondary 1/4 유지 | 전체 기능 |
| L1 | Pod 1개 실패 | Deployment 재생성 | 짧은 재시작 가능 |
| L2 | primary node 실패 | secondary·burst에 핵심 Pod 재배치 | 축소 운영, 영향 가능 |
| L3 | control plane·리전·공유 데이터 장애 | 백업 기반 수동 복구 | 장시간 중단 가능 |

Cluster Autoscaler는 고장 난 node를 수리하지 않는다. Pending Pod가 요구하는 capacity만 추가하며 새 node
준비에는 수십 분이 걸릴 수 있어 즉시 failover를 보장하지 않는다.

## 6. 배치·우선순위

- `self-intro-critical` 300000: API, frontend, Redis, RabbitMQ
- `self-intro-supporting` 200000: Metrics Server, Cluster Autoscaler 등 운영 경로
- `self-intro-deferrable` 10000: Worker, Tempo, Prometheus, Loki, Grafana, exporter
- application Pod는 primary·secondary·burst 어디서든 실행 가능하되 primary, secondary 순으로 선호한다.
- Cluster Autoscaler는 저비용을 위해 1 replica만 secondary에 고정한다. 이는 자체 HA 구성이 아니다.
- autoscaler는 limit나 실사용량이 아니라 `resources.requests`를 기준으로 판단한다.

Redis와 RabbitMQ는 단일 replica이므로 node 재생성 시 session 또는 queue 유실 가능성이 남는다. 관측 PVC도
RWO이므로 node 이동 시 detach/attach 지연이 있을 수 있다.

## 7. OCI 권한과 비용

instance principal 방식의 Cluster Autoscaler를 위해 다음 dynamic group을 생성했다.

- 이름: `self-intro-oke-autoscaler-secondary`
- OCID: `ocid1.dynamicgroup.oc1..aaaaaaaaxedciabhxphjezvappxcxylmfzifboyf47sbfc2hqgsto64o33oa`
- 대상: 현재 fixed-secondary instance 한 대의 OCID exact match
- 추가 고정비: 없음

사용자의 명시적 승인 후 다음 OCI IAM policy를 생성했고 `ACTIVE` 상태를 확인했다.

- 이름: `self-intro-oke-autoscaler-policy`
- OCID: `ocid1.policy.oc1..aaaaaaaaljnpj5nz5hxipcldlztsk363xr3n6v2m4uummjf2whrkmwq2hcfa`
- 범위: `self-intro` compartment의 node pool·instance-family 관리, subnet·VNIC 사용,
  virtual-network-family·compartment 조회
- 추가 고정비: 없음. 단, autoscaler가 실제로 생성한 worker node의 Compute 사용량은 과금 대상이다.

이 policy는 secondary node의 exact-match dynamic group에만 적용한다. autoscaler Pod를 다른 node로
옮기려면 dynamic group 조건을 먼저 검토해야 하며, 범위를 tenancy 전체로 확대하지 않는다.

Vault reader용 기존 dynamic group은 과거 instance exact match일 수 있으므로 node 교체 완료 후 별도
인벤토리에서 실제 member와 policy를 재검증한다. 이 작업에서 Vault 권한을 확대하지 않는다.

## 8. GitOps 구현 위치

- Metrics Server: `deploy/k8s/infrastructure/metrics-server/`
- Cluster Autoscaler: `deploy/k8s/infrastructure/cluster-autoscaler/`
- production 연결: `deploy/k8s/overlays/prod/monitoring/kustomization.yaml`
- API·frontend HPA: 각 production overlay의 `hpa.yaml`
- 배치·우선순위: production overlay의 `patch-scheduling.yaml`, `priority-classes.yaml`
- RabbitMQ 배치: `deploy/k8s/overlays/prod/rabbitmq/`
- Tempo 메트릭: `deploy/k8s/base/monitoring/prometheus.yaml`의 `tempo:3200/metrics` scrape

운영 클러스터는 Kubernetes `1.36.1`이다. 2026-08-22 OCI 지원표 기준으로 Cluster Autoscaler는
`1.34.3-323`, Metrics Server는 `0.7.2`를 사용한다. 버전 번호가 Kubernetes minor와 일치하지 않더라도
Oracle이 Kubernetes 1.36에 대해 명시한 지원 조합을 따른다.

## 9. 적용 순서와 rollback

1. production overlay 전체를 render하고 Git diff를 검증한다.
2. 승인된 OCI IAM policy가 `ACTIVE`인지 확인한다. (완료)
3. GitOps commit을 main에 push하고 Argo CD sync를 확인한다.
4. Metrics API, HPA, Cluster Autoscaler Ready와 OCI 권한 오류 부재를 확인한다.
5. Tempo scrape target, API·frontend·RabbitMQ 배치, 외부 route를 확인한다.
6. 이전 terminated node에 묶인 stale system Pod 두 개를 확인한 뒤 삭제하고 재생성 상태를 검증한다.
7. 2/8 primary workload 교체와 공개 route 검증 후 burst를 `1..1`에서 `0..1`로 전환한다. (완료)

Rollback은 HPA와 autoscaler production 연결을 제거하고 API·frontend replica를 1로 유지한다. primary
2/8에 문제가 생기면 burst 최소 크기를 1로 되돌려 용량을 확보한다. autoscaler 관리 중에는 OCI Console과
GitOps가 동시에 같은 pool 크기를 수정하지 않는다.

## 10. 활성화 Gate

- [x] 월 2만원 상한과 17 SGD Budget 경보
- [x] primary 2 OCPU/8GB, secondary·burst 각 1 OCPU/4GB Ready
- [x] 이전 primary 안전 drain·삭제와 최초 2 OCPU/12GB primary 종료 확인
- [x] production Metrics Server·HPA·scheduling·priority·Tempo manifest 작성
- [x] production Cluster Autoscaler manifest 작성, burst `0..1`
- [x] autoscaler용 exact-match dynamic group 생성
- [x] autoscaler OCI IAM policy 명시적 승인·생성 및 `ACTIVE` 확인
- [x] production Kustomize render 및 Git diff 검증
- [x] GitHub Actions·Argo CD `Synced/Healthy` (`0..1` 전환 배포는 재확인 중)
- [x] Metrics API, HPA, Autoscaler Ready
- [x] Tempo scrape target 정상
- [x] stale system Pod 정리 후 전체 Pod Ready/Pending/restart 확인
- [x] 외부 health/readiness/home smoke (`0..1` 전환 후 재확인 중)
- [x] 2/8 primary 확보·Ready와 이전 primary 삭제
- [ ] burst `0..1` 전환과 scale-up·scale-down rehearsal

현재 서비스는 배포 가능한 상태지만 이 저비용 오토스케일링 전환은 위 Gate가 끝나기 전까지 완료로
판정하지 않는다.
