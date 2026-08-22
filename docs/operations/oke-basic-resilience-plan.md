# OKE Basic 저비용 복원력·오토스케일링 전환 계획

- 기준일: 2026-08-22
- 적용 환경: production 단일 환경
- 현재 상태: 설계·예제 manifest 및 OCI Budget 경보 적용, **node pool 운영 미적용**
- 비용 원칙: 새 OCI 리소스 생성 전 예상 월 비용을 다시 계산하고 사용자 승인을 받는다.

## 1. 목표와 한계

목표는 OKE Enhanced 없이 월 약 2만원의 인프라 증액 범위에서 단일 노드 장애와 단기 트래픽 상승을
완화하는 것이다. 이 예산은 완전한 N+1, 다중 AD 무중단, 데이터 계층 HA를 제공하지 못한다. 따라서
장애 시 공개 route·인증·API·frontend·Redis·RabbitMQ를 우선 유지하고 Worker와 관측 stack은 중지할 수
있는 축소 운영을 기준으로 한다.

## 2. 노드풀 구조

| 노드풀 | 구성 | 평상시 | Cluster Autoscaler | 용도 |
| --- | --- | ---: | --- | --- |
| fixed-primary | A1 2 OCPU / 8GB | 1 | 제외 | 전체 workload |
| fixed-secondary | A1 1 OCPU / 4GB | 1 | 제외 | 핵심 workload의 축소 운영 |
| burst | A1 1 OCPU / 4GB | 0 | `min=0`, `max=1` | 트래픽·배포 surge |

목표 상시 구성은 합계 3 OCPU/12GB다. 다만 2026-08-22 live primary는 아직 2 OCPU/12GB이므로
secondary를 바로 추가하면 합계 3 OCPU/16GB가 된다. 월 2만원 상한을 지키려면 secondary 생성 전에
primary memory를 12GB에서 8GB로 축소하고 workload 재배치·Ready 확인을 통과해야 한다.

2026-08-22 OCI Usage API에서 8월 1~21일 춘천 리전의
`Standard - A1` CPU(`B93297`)와 메모리(`B93298`) 계산 금액이 모두 `0 SGD`임을 확인했다. 따라서 현재
테넌시는 실제로 A1 무료 공제 2 OCPU/12GB를 받고 있다. Oracle 공개 단가인 A1 OCPU-hour `$0.013106`,
GB-hour `$0.0019659`와 월 730시간을 사용하면 상시 유료 부분은 1 OCPU, 약 `$9.57`/월이다.

기존 계산은 compute만 반영했지만 실제 상한 판단에는 boot/block volume과 Container Image Storage도
포함해야 한다. 현재 boot 47GB와 세 개의 50GB block volume으로 197GB를 사용하고 있어 secondary의
기본 50GB boot volume을 더하면 247GB가 된다. 따라서 200GB를 넘는 약 47GB의 block volume 비용과
2026-08-01~22 누적 약 1.164 SGD의 Container Image Storage도 정상상태 비용에 포함한다.

| 상태 | 계산 | 월 예상 |
| --- | --- | ---: |
| live primary 2/12 + secondary 1/4 | compute·추가 boot·기존 유료 SKU | 상한 초과 가능, 생성 금지 |
| primary 2/8 + secondary 1/4 | 유료 1 OCPU + 추가 boot + 기존 유료 SKU | 약 13.5~16.3 SGD/월 추정 |
| burst 100시간 | 1 OCPU + 4GB x 100시간 | 위 정상상태에 추가, 17 SGD 상한 내에서만 허용 |

2026-08-22 self-intro compartment에 월 `17 SGD` 예산
`self-intro-private-beta-20k-krw-cap`을 생성했다. 예측 70%, 실제 85%, 실제 100% 경보가 모두 ACTIVE이며
수신자는 `support@unbrdn.me`다. Budget 경보는 비용을 통지할 뿐 node pool을 자동 중지하지 않으므로
100% 경보 또는 100시간 한도 중 먼저 도달한 조건에서 burst scale-up을 수동 중지한다. primary 축소 후
첫 24시간 Usage API로 실제 compute·storage 비용을 다시 확인하고, 정상상태가 14 SGD를 넘으면 burst를
활성화하지 않는다.

Budget OCID는
`ocid1.budget.oc1.ap-chuncheon-1.amaaaaaajjd3nqyaquz7j46ifa7sp2v7ofcyyhujw62szlbitqamhybwumqa`다.

Oracle 문서에는 춘천 리전에서 Always Free A1 신규 생성이 제외된다는 문구가 있다. 이는 현재 기존 A1의
실제 무료 공제와 별개다. secondary·burst 생성 시에는 유료 A1 capacity로 생성될 수 있다고 가정하고,
생성 직후 Usage API의 `B93297`, `B93298`을 다시 확인한다. 무료 공제가 사라지거나 fixed 구성의 A1 계산
금액이 0이 아니면 즉시 중단한다. 무료 공제 미적용 시 상시 3 OCPU/12GB만으로 약 7.1만원/월이므로 본
예산안은 성립하지 않는다.

## 3. 트래픽 자동 확장

1. Metrics Server가 API·frontend 사용량을 제공한다.
2. API HPA는 CPU 70% 또는 메모리 75%, frontend HPA는 CPU 70%에서 최대 replica 2까지 확장한다.
3. 새 replica가 고정 노드에 배치되지 못하면 Pending이 된다.
4. Cluster Autoscaler가 Pod request를 기준으로 burst 노드풀을 1대로 확장한다.
5. HPA는 5분 안정화 뒤 축소하고, autoscaler는 15분 불필요 상태 뒤 burst를 0대로 돌린다.

OKE Cluster Autoscaler의 `nodes` 인수에는 `0:1:<BURST_NODE_POOL_OCID>`만 넣는다. fixed-primary와
fixed-secondary는 등록하지 않는다. `max-node-provision-time`은 25분, scale-down-after-add는 10분,
scale-down-unneeded는 15분, 전체 node 상한은 3대로 고정한다.

Worker는 queue backlog가 병목 신호이므로 CPU HPA를 사용하지 않는다. KEDA 또는 Prometheus Adapter를
추가하면 관리 workload와 메모리 비용도 늘어나므로 별도 비용·복잡도 검토 전까지 1 replica로 유지한다.

## 4. 장애 레벨

| 레벨 | 상황 | 자동 대응 | 서비스 수준 |
| --- | --- | --- | --- |
| L0 | 정상 | primary 실행, burst 0 | 전체 기능 |
| L1 | 핵심 Pod 1개 실패 | Deployment가 고정 노드에 재생성 | 짧은 재시작 가능 |
| L2 | primary 노드 실패 | 핵심 Pod를 secondary에 우선 배치, 부족하면 burst 증설 | 축소 운영, 최대 수십 분 영향 가능 |
| L3 | cluster control plane·리전·공유 데이터 장애 | 이 설계 범위 밖, 백업 기반 수동 복구 | 장시간 중단 가능 |

Cluster Autoscaler는 고장 난 노드를 수리하는 도구가 아니다. OKE node lifecycle과 Deployment 재배치가
장애 복구를 담당하고 autoscaler는 자원 부족으로 Pending인 Pod를 수용할 노드만 추가한다. OCI 공식
설정의 `max-node-provision-time` 기본 권고 범위가 25분이므로 즉시 failover를 약속하지 않는다.

## 5. 배치·우선순위

- critical: API, frontend, Redis, RabbitMQ. primary·secondary·burst에 배치할 수 있다.
- supporting: ingress controller, Metrics Server, Cluster Autoscaler. application critical보다 높은 custom
  PriorityClass로 두 고정 노드에 분산한다. CoreDNS 등 Kubernetes 기본 중요 Pod는 system PriorityClass를
  유지한다.
- deferrable: Worker, Tempo, Prometheus, Loki, Grafana, kube-state-metrics, exporter. primary·burst만 사용하며
  L2에서 중지할 수 있다.
- Cluster Autoscaler는 2 replica를 고정 노드에 분산해 primary 장애 중에도 burst를 요청할 수 있어야 한다.
- 각 Deployment는 정확한 `resources.requests`를 유지한다. autoscaler는 limit나 실사용량이 아니라 request로
  노드 필요성을 판단한다.

Redis와 RabbitMQ가 현재 단일 replica·임시 저장이므로 다른 노드에서 재생성되면 session 또는 queue가
유실될 수 있다. 관측 PVC도 RWO이므로 secondary 장애 운영의 핵심 경로로 간주하지 않는다.

## 6. 적용 순서

1. **완료**: 최신 OCI 요금, 현재 테넌시 무료 공제, 상시·burst 최악 비용을 확인한다.
2. **완료**: 월 2만원 상한 사양, fixed-secondary 1/4, burst 1/4 `0..1`, 비용 중단 기준을 승인받았다.
3. **완료**: 17 SGD Budget과 forecast 70%, actual 85%, actual 100% 경보를 생성·검증했다.
4. **별도 변경 승인 필요**: live primary를 2 OCPU/12GB에서 2 OCPU/8GB로 축소하고 Ready·route를 검증한다.
   현재 OKE Basic은 managed node cycling을 지원하지 않으므로 pool 설정만 바꿔서는 기존 node가 축소되지
   않는다. fixed-secondary를 먼저 Ready로 만들고 burst를 일시적으로 1대로 올린 뒤, primary pool의 신규
   node shape config를 2/8로 갱신하고 기존 primary를 cordon·drain·수동 교체한다. 교체 중에는 deferrable
   workload를 중지하고 RWO volume detach/attach 완료를 기다린다. 공개 route가 실패하면 신규 primary를
   유지하지 않고 기존 구성 복구 절차로 전환한다.
5. fixed-secondary, burst node pool을 생성하되 autoscaler는 아직 연결하지 않는다.
6. node label과 taint가 의도대로인지 확인한다.
7. Metrics Server를 설치하고 `kubectl top pods`가 정상인지 확인한다.
8. Cluster Autoscaler를 2 replica로 설치하고 burst pool만 `0..1`로 등록한다.
9. PriorityClass와 scheduling patch를 적용한다.
10. 핵심 Pod가 두 고정 노드에 분산되고 전체 Ready인지 확인한다.
11. HPA를 적용하고 부하 테스트로 `replica 1 -> 2`, burst `0 -> 1 -> 0`을 확인한다.
12. primary cordon/drain rehearsal로 L2 축소 운영과 rollback을 확인한다.
13. Argo CD, 외부 health·공개 route, restart, Pending, 비용 경보를 확인한 뒤 완료로 기록한다.

## 7. Rollback

1. HPA를 제거하고 API·frontend replica를 1로 고정한다.
2. scheduling patch를 production overlay에서 제거한다.
3. 모든 핵심 Pod가 primary에서 Ready인지 확인한다.
4. Cluster Autoscaler add-on에서 burst pool 등록을 제거한다.
5. burst node pool을 0으로 확인한 뒤에만 비용 자원을 삭제한다.
6. 고정 secondary 삭제는 별도 비용·복원력 결정으로 취급하며 자동 rollback에 포함하지 않는다.

autoscaler가 관리하는 burst pool 크기를 OCI Console이나 Terraform에서 동시에 수정하지 않는다. Terraform을
사용하면 autoscaler 관리 pool의 size drift를 무시하도록 별도 lifecycle을 구성한다.

## 8. 활성화 Gate

- [x] 최신 공식 단가·무료 공제·Usage API 실청구 재검증
- [x] 월 2만원 상한 사양과 비용 중단 기준 사용자 승인
- [x] 17 SGD Budget·forecast 70%·actual 85%·actual 100% 경보 ACTIVE
- [ ] primary 2 OCPU/12GB -> 2 OCPU/8GB 축소 승인·적용·Ready 확인
- [ ] 두 고정 노드 Ready, node-role label 확인
- [ ] Metrics API 정상
- [ ] Cluster Autoscaler 2/2 Ready, burst pool만 min0/max1
- [ ] API·frontend HPA 정상, worker HPA 없음
- [ ] scale-up 1회와 scale-down 1회 증적
- [ ] primary drain 중 핵심 공개 route 확인
- [x] OCI 비용 예산·사용량 경보
- [ ] burst 장기 실행·월 누적 자동 운영 경보
- [ ] rollback rehearsal

## 9. 감시·경보 Gate

- Node condition: `Ready != True`, `MemoryPressure=True`, `DiskPressure=True`, `PIDPressure=True`를 OCI
  Monitoring과 Prometheus에서 관찰한다. node condition은 HPA·Cluster Autoscaler의 대체 신호가 아니다.
- Pod capacity: critical Pod가 5분 이상 Pending이거나 API·frontend HPA가 10분 이상 max replica이면
  scale-out 실패 또는 실제 용량 한계로 경보한다.
- Autoscaler: Cluster Autoscaler replica가 2 미만이거나 scale-up 실패 event가 발생하면 L2로 분류한다.
- 비용: burst node가 60분 이상 유지되면 확인 알림, 6시간 이상이면 수동 축소·원인 분석 대상으로 삼는다.
  노드를 강제로 줄이기 전에 Pending·PDB·local storage·배포 진행 여부를 확인한다.
- 월 누적: burst 80시간에서 비용 확인, 100시간에서 신규 scale-up을 중지한다. OCI Usage API에서 A1 CPU·
  메모리 계산 금액과 Container Image Storage를 함께 확인한다.
- 외부 서비스: `/actuator/health/readiness`, 공개 route, 로그인 route를 1분 간격으로 확인해 node metric과
  사용자 영향도를 함께 판단한다.

이 체크리스트가 완료되기 전에는 `deploy/k8s/examples/oke-basic-resilience/`를 production Kustomization에
연결하지 않는다.
