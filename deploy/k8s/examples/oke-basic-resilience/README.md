# OKE Basic 저비용 복원력 예제

이 디렉터리는 OKE Basic 저비용 복원력 설계의 참고 예제다. 실제 production 구현은
`deploy/k8s/infrastructure/cluster-autoscaler/`와 `deploy/k8s/overlays/prod/`를 기준으로 하며, 적용 전에
node pool OCID, label, taint와 사용 가능한 metric을 반드시 live 값으로 확인한다.

## 목표 구조

| 노드풀 | 평상시 크기 | 자동 확장 | 역할 |
| --- | ---: | --- | --- |
| `fixed-primary` | 1 | 사용 안 함 | 전체 workload의 평상시 실행 |
| `fixed-secondary` | 1 | 사용 안 함 | 핵심 기능의 장애 시 축소 운영 |
| `burst` | 0 | `0..1` | HPA가 만든 Pending Pod와 배포 surge 수용 |

고정 노드풀은 Cluster Autoscaler가 관리하지 않는다. 따라서 autoscaler 오작동이나 트래픽 감소가 핵심
노드를 제거할 수 없다. burst 노드풀만 `0..1`로 제한하며, 월간 상시 실행 비용을 방지하기 위해 불필요한
노드는 15분 뒤 축소 대상으로 삼는다.

## 자동 확장 흐름

1. Metrics Server가 Pod CPU·메모리를 수집한다.
2. `hpa.yaml`의 HPA가 API 또는 frontend replica를 최대 2개로 늘린다.
3. 고정 노드에 자리가 없으면 새 Pod가 `Pending`이 된다.
4. OKE Cluster Autoscaler가 Pending Pod의 `resources.requests`를 보고 burst 노드풀을 `0 -> 1`로 늘린다.
5. 부하가 내려가면 HPA가 5분 안정화 후 replica를 줄이고, autoscaler가 15분 뒤 빈 burst 노드를 제거한다.

Cluster Autoscaler는 CPU 사용률을 직접 보고 Pod를 만들지 않는다. HPA 없이 Cluster Autoscaler만 켜면
트래픽 증가에 반응하지 않는다. 반대로 Metrics Server 없이 HPA는 동작하지 않는다.

`autoscaler-values.example.yaml`의 `nodes`에는 `0:1:<BURST_NODE_POOL_OCID>`만 등록한다. 고정 pool을 이
인수에 넣으면 autoscaler가 장애 대비용 노드까지 축소할 수 있으므로 금지한다. 새 노드 준비가 늦어지는
정상 구간을 실패로 오판하지 않도록 `maxNodeProvisionTime=25m`를 사용한다.

## 파일

- `priority-classes.yaml`: 핵심·지원·지연 가능 workload 우선순위
- `hpa.yaml`: API·frontend의 보수적 수평 확장 예제
- `autoscaler-values.example.yaml`: OKE Cluster Autoscaler add-on 입력값 설계
- `patches/`: 노드 역할별 배치 patch. 핵심 서비스는 secondary를 사용할 수 있고, Worker·관측 스택은
  primary·burst로 제한한다. 현재 production에는 연결하지 않는다.

## 활성화 전제

1. 비용 승인 후 OCI에서 세 노드풀을 구성한다.
2. 각 노드에 `self-intro.io/node-role=primary|secondary|burst` label을 부여한다.
3. Metrics Server가 정상이고 Cluster Autoscaler 1개가 fixed-secondary에 배치됐는지 확인한다. 이 소규모
   구성에서는 두 replica가 동시에 같은 node pool을 변경할 수 있으므로 사용하지 않는다.
4. burst 노드풀에만 autoscaler `min=0`, `max=1`을 연결한다.
5. `priority-classes.yaml`, scheduling patch, HPA 순서로 적용한다.
6. primary drain, burst scale-up·scale-down, rollback rehearsal를 통과한 뒤 production overlay에 편입한다.

supporting PriorityClass는 application critical보다 높고 Cluster Autoscaler·Metrics Server에만 사용한다.
따라서 장애 중에도 scale-out 경로가 사라지지 않는다. `kube-state-metrics`를 포함한 관측 workload는
deferrable로 유지하며, CoreDNS 같은 Kubernetes 기본 중요 Pod는 기존 system PriorityClass를 유지한다.

`patches/`를 label보다 먼저 production에 연결하면 현재 단일 노드에서 Pod가 모두 Pending이 될 수 있다.
운영 적용 순서는 `docs/operations/oke-basic-resilience-plan.md`를 따른다.

## 의도적으로 제외한 항목

- Worker queue 기반 자동 확장: CPU HPA로는 queue backlog를 제대로 표현할 수 없다. KEDA 또는
  Prometheus Adapter를 별도 검토하기 전까지 worker는 1개로 유지한다.
- 단일 replica PDB: `minAvailable: 1`은 drain을 막고 `maxUnavailable: 1`은 가용성을 높이지 못한다.
  최소 2 replica를 항상 수용할 비용과 배치가 마련되기 전에는 활성화하지 않는다.
- 무중단 보장: burst 노드 생성에는 시간이 필요하므로 이 구조는 저비용 축소 운영이지 N+1 HA가 아니다.
