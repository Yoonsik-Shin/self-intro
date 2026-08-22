# Self-Intro 베타 및 정식 출시 전 체크리스트

기준일: 2026-08-22

이 문서는 코드로 자동화할 수 없는 외부 계약·클라우드·법률 설정과 최종 검증 순서를 정리한다.
정식 서비스의 전역 운영 flag는 아래 단계가 끝날 때까지 `false`로 유지한다. 비공개 베타에서는
`PLATFORM_OWNER`와 명시적 Workspace allowlist가 모두 일치하는 운영 검증 요청만 별도 preview policy로
허용한다.

최신 상태와 비공개 베타·정식 유료 출시의 범위 차이는
[2026-08-22 비공개 베타와 정식 서비스 출시 기준](release-status-2026-08-22.md)을 먼저 본다.

## 0. 현재 출시 판단

| 출시 유형 | 준비도 | 판단 |
| --- | ---: | --- |
| 초대형 무료 비공개 베타 | 100% | 운영 배포·1차 안정화·지정 Workspace preview 검증 완료 |
| 오늘 변경 사항 문서 일관성 | 100% | 정책·구현·배포 증거·비용·책임 구분을 최신 상태로 반영 |
| 정식 유료 서비스 코드·인프라 | 75% | 결제·AI·Vault 경계와 Argon2id·Pod 기본 강화 완료, Workspace DEK·mTLS·WORM·egress 후속 필요 |
| 정식 유료 서비스 공개 활성화 | 외부 준비 대기 | 사업자·PG 라이브 계약·법률/세무 검토·Provider 처리 조건 확정 전에는 불가 |

비공개 베타에서는 결제와 외부 AI를 서버·UI에서 차단하므로 아래 사업자·PG·환불 항목은 베타 배포의
차단 조건이 아니다. 그러나 정식 유료 전환 전에는 하나도 생략할 수 없다.

## 1. 먼저 확정해서 코드에 전달할 운영 정보

다음 값을 한 번에 정리한다. 주민등록번호, 카드번호, API secret은 문서나 Git에 기록하지 않는다.

- 상호 또는 서비스 운영자명
- 대표자명
- 사업장 주소와 고객 문의 이메일·전화번호
- 사업자등록번호
- 통신판매업 신고번호 또는 신고 면제 여부를 확인한 근거
- 개인정보 보호책임자명과 문의처
- 결제·환불 문의 처리시간과 답변 목표시간
- 실제 SMTP 사업자, 발신 주소와 데이터 처리 지역
- 실제 OCI region, 외부 AI Provider별 처리 국가·region·보유기간

위 정보가 정해지면 다음 두 파일의 `-draft`, `비공개 베타`, `운영 전 확정 필요` 문구를 실제 운영
내용으로 교체한다.

- `frontend-next/lib/registrationPolicies.ts`
- `frontend-next/app/policies/[policy]/page.tsx`

정책 version도 실제 시행일 형식으로 함께 바꾸고 backend의
`REGISTRATION_TERMS_VERSION`, `REGISTRATION_PRIVACY_VERSION`, `REGISTRATION_MARKETING_VERSION`을 같은
값으로 맞춘다. 기존 동의 이력의 version은 소급 수정하지 않는다.

온라인 판매 신고 필요 여부는 업종·규모에 따라 예외가 있을 수 있으므로 세무사 또는 관할 기관에
확인한다. 신고가 필요하다고 확인되면 정부24 `통신판매업신고`에서 신청한다.

- https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=11300000006&HighCtgCD=A09006&tp_seq=01

## 2. 토스페이먼츠 운영 계약

테스트 키는 개발용일 뿐 실제 매출을 받을 수 없다. 자동결제는 일반 전자결제 계약 외에 리스크 검토와
추가 계약이 필요하다.

1. 사업자등록을 완료한다.
2. 토스페이먼츠 상점관리자에서 전자계약을 시작하고 홈페이지 URL, 상품 설명, 가격, 이용약관,
   개인정보 처리방침, 환불 정책과 고객센터 정보를 제출한다.
3. `자동결제(빌링)` 사용을 별도로 문의한다. 월·연 구독과 최초 카드 등록 후 정기 승인 구조임을
   설명한다.
4. 계약이 끝나면 자동결제 MID를 선택하고 API 개별 연동 키의 `live_*` client/secret key를 확인한다.
5. 테스트 MID와 라이브 MID·키를 절대 섞지 않는다.
6. 토스 개발자센터에서 webhook URL을
   `https://api.unbrdn.me/api/billing/webhooks/toss`로 등록한다.
7. `결제 상태 변경`을 포함해 실제 계약 화면에서 제공되는 필요한 이벤트만 선택한다.

공식 안내:

- https://docs.tosspayments.com/guides/v2/billing/integration-api
- https://docs.tosspayments.com/guides/v2/billing
- https://docs.tosspayments.com/reference

운영 키는 새 `backend-billing-secret` SealedSecret에
`TOSS_PAYMENTS_CLIENT_KEY`, `TOSS_PAYMENTS_SECRET_KEY`로 넣는다. 평문 Secret YAML을 Git에 먼저 만들지
말고, 클러스터의 Sealed Secrets 공개키로 바로 암호화한다. API Deployment에만 `envFrom`으로 연결하고
Worker에는 주입하지 않는다.

## 3. OCI Vault와 OKE Basic 저비용 bootstrap

### 3.1 기존 OCI 리소스 확인과 정적 Secret 이전 승인

PLATFORM_OWNER preview의 사용자 제공 AI API key용 virtual Vault와 AES key는 이미 연결되어 있다. 먼저
해당 Vault/key가 software-protected인지, 현재 청구가 없는지 확인한다. 없는 리소스를 새로 만들거나 정적
운영 Secret을 이동하지 말고 `oci-vault-static-secret-migration.md`의 비용·장애 gate 승인을 먼저 받는다.

1. 기존 compartment, Vault, AES key, region과 OKE cluster OCID를 기록한다.
2. API 전용·공용·Worker 전용 Secret read 경계를 검토한다. 별도 stage가 없으므로 IAM 권한은 CLI로
   직접 bundle read를 검증하고 production에서는 한 Secret 그룹씩 기존 Ready Pod를 유지하며 전환한다.
3. 기존 리소스를 재사용할 수 없을 때에만 승인 후 software-protected Vault/key/Secret을 만든다.
4. OCID들은 secret
   원문은 아니지만 운영 구성값이므로 운영 가이드에서만 관리한다.
5. 정적 Secret 전체 인벤토리와 회전·복구 순서는
   `docs/operations/oci-vault-static-secret-migration.md`를 따른다.

### 3.2 Basic cluster와 bootstrap 경계 확인

OKE Console의 cluster 상세에서 `BASIC_CLUSTER`를 유지한다. 정적 Secret 이전을 위해 Enhanced
cluster로 전환하거나 Secrets Store CSI Driver를 설치하지 않는다. API·Worker에 각각 전용 OCI IAM
서비스 사용자와 API signing key를 배정하고, init container가 OCI config-file 인증으로 필요한
Secret bundle만 읽어 memory-backed volume에 쓴다.

- node instance principal은 정적 Secret 전체 읽기에 사용하지 않는다.
- API signing private key는 최소 부트스트랩 SealedSecret으로만 배포하고 일반 환경변수로 주입하지 않는다.
- main container는 Secret volume을 read-only로 mount하고 OCI 인증 파일은 mount하지 않는다.
- OCI metadata 차단은 CNI의 외부 FQDN 허용 경로를 함께 검증한 뒤 적용한다. 그 전에는 signing credential을
  init container에만 mount하고 workload별 read policy를 최소화한다.

코드에는 다음 ServiceAccount가 이미 반영되어 있다.

- namespace: `self-intro`
- API: `self-intro-api`
- Worker: `self-intro-worker`

### 3.3 IAM 사용자·그룹·policy

인간 계정을 재사용하지 말고 `self-intro-api-static-reader`, `self-intro-worker-static-reader`,
`self-intro-byok-manager`, `self-intro-secret-rotator`를 분리한다. API·Worker static reader에는 각자의
Secret bundle read만 주고, 생성·새 version·예약 삭제는 BYOK manager와 rotation operator에만 준다.
`<secret-compartment>`와 secret 이름을 실제 구성에 맞게 바꾼다.

```text
Allow group 'Default'/'self-intro-api-static-readers' to read secret-bundles in compartment <secret-compartment>
Allow group 'Default'/'self-intro-worker-static-readers' to read secret-bundles in compartment <secret-compartment>
Allow group 'Default'/'self-intro-byok-managers' to manage secrets in compartment <secret-compartment>
Allow group 'Default'/'self-intro-byok-managers' to use vaults in compartment <secret-compartment>
Allow group 'Default'/'self-intro-byok-managers' to use keys in compartment <secret-compartment>
```

실제 policy는 `deploy/k8s/examples/oci-vault-static-secrets/iam-user-policy.example.txt`를 기준으로 secret
이름 조건을 더 좁힌다. 서비스 사용자 생성, public API key upload, private key 회전은 추가 서비스
요금이 없을 것으로 예상하지만 실제 생성 전에 사용자 승인을 받는다.

### 3.4 운영 구성값 반영

현재 production의 사용자 제공 AI API key preview는 정확한 OKE node instance를 dynamic group으로
제한한 `instance-principal`을 사용한다. 이 방식은 정적 Secret 전체 이전에 사용하지 않고,
정적 Secret은 별도 config-file 인증 init container로 전환한다. 현재 `backend-config`의 preview용
non-secret 값은 다음과 같다.

```text
SECRET_PROVIDER_OCI_REGION=ap-chuncheon-1
SECRET_PROVIDER_OCI_AUTH_MODE=instance-principal
SECRET_PROVIDER_OCI_COMPARTMENT_ID=<compartment-ocid>
SECRET_PROVIDER_OCI_VAULT_ID=<vault-ocid>
SECRET_PROVIDER_OCI_KEY_ID=<key-ocid>
SECRET_PROVIDER_OCI_RECOVERY_DAYS=7
```

2026-08-22 지정 Workspace preview를 위해 API는 `SECRET_PROVIDER=oci-vault`를 사용한다. dynamic group은
현재 API가 실행되는 정확한 node instance OCID만 포함하며, 해당 node 교체 전후에 membership을 갱신한다.
Worker에는 Toss secret을 주입하지 않는다.

## 4. production 데이터베이스와 결제 통제 smoke test

별도 stage가 없으므로 운영 DB 변경은 백업·preflight·한 번의 통제된 migration 순서를 지킨다.

1. 운영 백업과 복구 가능 상태를 확인한다.
2. migration SQL과 현재 `flyway_schema_history` 충돌을 read-only로 검사한다.
3. production API rollout 전에 maintenance/rollback 기준을 기록하고 V8~V10을 적용한다.
4. `flyway_schema_history`의 V8, V9, V10 `success=1`을 확인한다.
5. 기존 Workspace마다 FREE subscription이 한 개만 생성됐는지 확인한다.
6. 서로 다른 Workspace OWNER로 교차 조회·mutation이 404인지 확인한다.
7. 토스 테스트 키로 아래 시나리오를 순서대로 실행한다.

- 카드 등록·교체
- Pro 월간 최초 결제와 중복 클릭
- Pro 연간 최초 결제
- Business 월·연 결제
- AI point pack 1회 결제와 자동충전 없음
- 좌석 추가 일할 계산
- 같은 idempotency key 재시도
- Provider timeout 뒤 orderId reconciliation
- 갱신 성공·실패 3회·7일 grace·FREE downgrade
- 기간 말 해지와 해지 취소
- 전액 취소와 부분 취소 Provider 응답
- webhook 중복·역순 수신

환불은 현재 Toss 취소 API 경계까지만 구현되어 있다. 환불액 산정, point 회수, 운영자 승인과 immutable
원장이 한 트랜잭션 경계로 구현되기 전에는 운영 환불 버튼과 자동 환불을 열지 않는다.

## 5. GitHub 배포 보호

코드는 세 배포 job에 `environment: production`을 지정했다. GitHub 저장소에서 다음을 직접 설정한다.

1. `Settings → Environments → production`을 연다.
2. Required reviewers에 본인 또는 별도 승인자를 지정한다.
3. 가능하면 main branch만 배포하도록 Deployment branches를 제한한다.
4. live 결제키·OCI Registry token은 repository 공용 secret보다 production environment secret으로
   옮긴다.
5. `Settings → Branches` 또는 Rulesets에서 main 직접 push를 막고 PR을 요구한다.
6. PR에서 실행되는 `Release Readiness / verify-release-candidate`를 required check로 지정한다. 이 한
   job이 API, Worker, Frontend quality gate를 모두 포함한다. 정책 초안이 남아 있는 동안에는 의도적으로
   실패해 main 병합을 막는다.

`Actions → Release Readiness → Run workflow`가 전부 성공한 commit만 production 승인한다.

## 6. flag 활성화 순서

한 번에 모두 켜지 않는다.

비공개 베타에서는 프런트 이미지를 `NEXT_PUBLIC_RELEASE_CHANNEL=PRIVATE_BETA`로 빌드하고 전역 결제·AI
flag를 모두 `false`로 유지한다. 단, `PLATFORM_OWNER_PREVIEW_ENABLED=true`와 정확한
`PLATFORM_OWNER_PREVIEW_WORKSPACE_SLUGS`가 일치하면 해당 Workspace에서만 Toss 샌드박스와 사용자 제공 AI API 키를
허용한다. `PAID` 전환은 약관·PG·환불 준비를 마친 정식 유료 출시 작업에서만 수행한다.

1. 지정 `PLATFORM_OWNER` preview Workspace에서 `SECRET_PROVIDER=oci-vault` 카드 등록/사용자 제공 AI API 키
   저장·조회·폐기를 확인한다.
2. `BILLING_ENABLED=true`로 최초 결제만 연다. 갱신 scheduler는 계속 끈다.
3. webhook과 reconciliation을 충분히 관찰한 뒤 `BILLING_RECONCILIATION_ENABLED=true`를 켠다.
4. 갱신·실패·grace 검증 뒤 `BILLING_RENEWAL_ENABLED=true`를 켠다.
5. 2~4주 token/원가 계측과 point 환산식 확정 뒤에만 `AI_USAGE_ENFORCEMENT_ENABLED=true`를 켠다.

각 단계마다 API/Worker readiness, 재시작 수, 5xx, billing webhook retry, reconciliation backlog,
중복 point grant를 확인한다. 이상이 있으면 해당 flag를 먼저 `false`로 되돌리고 image rollback은 그다음에
판단한다.

## 7. 비공개 베타 배포 전 운영 확인

- 가입은 운영자가 발급한 초대 코드가 있어야만 가능하도록 유지한다. 공개 가입 링크를 별도로 배포하지
  않고, 초기 테스터는 지정 이메일·1회용 초대를 우선 사용한다. 초대 없는 가입, 다른 이메일의 개인
  초대 사용, 사용·만료·폐기된 초대의 재사용이 모두 거부되는지 확인한다.
- 프런트는 `NEXT_PUBLIC_RELEASE_CHANNEL=PRIVATE_BETA`로 빌드한다. 이 모드에서는 구체적인 가격을 흐림
  처리하지 않고 `베타 기간 무료`, `정식 출시 예정`으로 표시하며 결제·카드·좌석·AI point 구매 버튼과
  사용자 제공 AI API 키 입력란을 노출하지 않는다.
- API의 `SECRET_PROVIDER=oci-vault`, API·Worker의 `BILLING_ENABLED=false`,
  `BILLING_RECONCILIATION_ENABLED=false`, `BILLING_RENEWAL_ENABLED=false`,
  `AI_GENERATION_ENABLED=false`, `AI_USAGE_ENFORCEMENT_ENABLED=false`를 유지한다. preview policy는
  `PLATFORM_OWNER`와 지정 Workspace에만 이 전역 차단의 제한적 예외를 적용하고, AI usage 예약·정산은
  preview 요청에서도 항상 강제한다.
- OCI Email Delivery의 SMTP username/password는 OCI Vault에서 init container의 memory file로 전달되고
  main API에 환경변수나 OCI credential이 노출되지 않는지 확인한다. `backend-mail-secret`은 rollback용으로만
  유지한다. `REGISTRATION_EMAIL_ENABLED=true`, `ACCOUNT_RECOVERY_EMAIL_ENABLED=true`인 렌더링 결과도
  함께 검증한다.
- 2026-08-21 운영 확인에서 Tempo가 51회 재시작 후 최근에도 `OOMKilled`됐고 Oracle exporter도
  3회 재시작 후 `OOMKilled`된 이력이 확인됐다. 베타 배포 manifest에는 Tempo `384Mi/1Gi`, Oracle
  exporter `96Mi/256Mi`의 메모리 request/limit를 사용하고, 배포 뒤 최소 24시간 재시작 수와 메모리를
  관찰한다.
- 비공개 베타라도 실제 개인정보 처리방침·이용약관·운영자 문의처는 초안 상태로 두지 않는다. 유료 결제
  계약·사업자 정보·환불 자동화는 결제 기능이 닫힌 베타의 차단 조건에서는 제외할 수 있지만, 유료 전환
  전에 반드시 1~4절을 완료한다.
- 일반 비공개 베타에서는 `AI_GENERATION_ENABLED=false`로 외부 AI 호출 자체를 차단한다. 지정 운영자
  preview에서만 사용자 제공 AI API 키 경로를 사용한다. AI를 일반 사용자에게 제공한다면 실제 Provider별 처리 항목, 목적,
  처리 국가·region, 국외 이전 시점과 방법, 보유·삭제 기간, 동의 거부 시 영향을 확인해 정책과 호출 직전
  동의 화면에 반영한다. 현재 운영 구성 후보인 NVIDIA NIM의 정확한 처리 지역·보유기간을 계약·공식
  문서에서 확인하지 못했다면 AI 기능을 열지 않는다.
- `AI_USAGE_ENFORCEMENT_ENABLED=false`인 베타는 유료 point 차감 정책으로 사용량을 통제하지 않는다.
  플랫폼 AI를 연다면 초대 인원과 운영 한도를 작게 시작하고 Provider 사용량·실패율·예상 비용을 매일
  확인한다. 베타 무료 제공을 월 포함 point 또는 구매 point로 표시하거나 유료 전환 때 승계한다고
  약속하지 않는다.

### OKE Basic 복원력 활성화 전 확인

- 현재 비공개 베타 배포는 가능하지만 단일 노드 장애 내성은 별도 개선 항목이다. 적용 전 예제는
  `deploy/k8s/examples/oke-basic-resilience/`에 있으며 production overlay에는 연결하지 않는다.
- fixed-primary와 fixed-secondary는 autoscaler 대상에서 제외하고 burst pool만 `min=0`, `max=1`로
  관리한다. Cluster Autoscaler가 Pod를 만들거나 트래픽을 감지한다고 간주하지 않는다.
- Metrics Server, API·frontend HPA, 2 replica Cluster Autoscaler를 먼저 검증한다. Worker는 queue 기반
  adapter 없이 CPU HPA를 적용하지 않는다.
- 2026-08-22 월 2만원 상한, fixed-secondary A1 1/4, burst A1 1/4 `0..1` 구성을 승인받았다.
  self-intro compartment에 17 SGD Budget과 forecast 70%, actual 85%, actual 100% 경보를 생성해 모두
  ACTIVE임을 확인했다. Budget은 자동 차단이 아니므로 운영 중단 절차를 별도로 유지한다.
- live primary를 2 OCPU/8GB로 교체하고 Ready·route·workload 재배치를 검증했다. fixed-secondary는
  1 OCPU/4GB로 상시 유지하고 burst는 1 OCPU/4GB `0..1`로 전환한다.
- primary drain 중 핵심 route의 축소 운영, burst `0 -> 1 -> 0`, rollback rehearsal가 모두 끝나기 전에는
  무중단 또는 자동 복구 완료로 표시하지 않는다.
