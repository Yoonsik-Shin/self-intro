# Self-Intro 베타 및 정식 출시 전 체크리스트

기준일: 2026-08-22

이 문서는 코드로 자동화할 수 없는 외부 계약·클라우드·법률 설정과 최종 검증 순서를 정리한다.
운영 flag는 아래 단계가 끝날 때까지 `false`로 유지한다.

최신 상태와 비공개 베타·정식 유료 출시의 범위 차이는
[2026-08-22 비공개 베타와 정식 서비스 출시 기준](release-status-2026-08-22.md)을 먼저 본다.

## 0. 현재 출시 판단

| 출시 유형 | 준비도 | 판단 |
| --- | ---: | --- |
| 초대형 무료 비공개 베타 | 100% | PR #3 필수 검사 통과, 병합·배포 승인 대기 |
| 정식 유료 서비스 | 70% | 사업자·PG·법률·Vault·환불·AI·암호화 운영 gate 미완료로 배포 불가 |

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

## 3. OCI Vault와 OKE workload identity

### 3.1 OCI 리소스 만들기

OCI Console에서 다음 순서로 만든다.

1. `Identity & Security → Compartments`에서 결제·BYOK secret 전용 compartment를 만든다.
2. `Identity & Security → Vault`에서 Vault를 만든다.
3. 같은 Vault 안에 AES 대칭키를 만든다. 비대칭키는 secret 암호화에 사용할 수 없다.
4. compartment OCID, Vault OCID, Key OCID, region, OKE cluster OCID를 기록한다. 이 OCID들은 secret
   원문은 아니지만 운영 구성값이므로 운영 가이드에서만 관리한다.

### 3.2 enhanced cluster 확인

OKE Console의 cluster 상세에서 enhanced cluster인지 확인한다. OKE workload identity는 enhanced
cluster에서만 지원된다. 표준 basic cluster라면 먼저 enhanced 전환 가능 여부를 확인하고, 전환 전에는
`instance-principal`을 임시 사용하되 node 전체가 과도한 권한을 갖지 않도록 dynamic group 범위를
제한한다.

코드에는 다음 ServiceAccount가 이미 반영되어 있다.

- namespace: `self-intro`
- API: `self-intro-api`
- Worker: `self-intro-worker`

### 3.3 IAM policy

`<cluster-ocid>`와 `<secret-compartment>`를 실제 값으로 바꾼다. API는 생성·조회·예약 삭제가 필요하고,
Worker는 BYOK 조회만 필요하다.

```text
Allow any-user to manage secrets in compartment <secret-compartment> where all {
  request.principal.type = 'workload',
  request.principal.namespace = 'self-intro',
  request.principal.service_account = 'self-intro-api',
  request.principal.cluster_id = '<cluster-ocid>'
}
Allow any-user to use vaults in compartment <secret-compartment> where all {
  request.principal.type = 'workload',
  request.principal.namespace = 'self-intro',
  request.principal.service_account = 'self-intro-api',
  request.principal.cluster_id = '<cluster-ocid>'
}
Allow any-user to use keys in compartment <secret-compartment> where all {
  request.principal.type = 'workload',
  request.principal.namespace = 'self-intro',
  request.principal.service_account = 'self-intro-api',
  request.principal.cluster_id = '<cluster-ocid>'
}
Allow any-user to read secret-bundles in compartment <secret-compartment> where all {
  request.principal.type = 'workload',
  request.principal.namespace = 'self-intro',
  request.principal.service_account = 'self-intro-api',
  request.principal.cluster_id = '<cluster-ocid>'
}
Allow any-user to read secret-bundles in compartment <secret-compartment> where all {
  request.principal.type = 'workload',
  request.principal.namespace = 'self-intro',
  request.principal.service_account = 'self-intro-worker',
  request.principal.cluster_id = '<cluster-ocid>'
}
```

다른 compartment에 있는 OKE workload가 Vault를 사용하면 OCI 문서의 workload mapping 절차도 추가한다.

- https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contenggrantingworkloadaccesstoresources.htm
- https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/keypolicyreference.htm

### 3.4 운영 구성값 반영

`deploy/k8s/overlays/prod/backend/kustomization.yaml`의 `backend-config`에 다음 non-secret 값을 추가한다.

```text
SECRET_PROVIDER_OCI_REGION=ap-chuncheon-1
SECRET_PROVIDER_OCI_AUTH_MODE=oke-workload-identity
SECRET_PROVIDER_OCI_COMPARTMENT_ID=<compartment-ocid>
SECRET_PROVIDER_OCI_VAULT_ID=<vault-ocid>
SECRET_PROVIDER_OCI_KEY_ID=<key-ocid>
SECRET_PROVIDER_OCI_RECOVERY_DAYS=7
```

이 단계에서는 `SECRET_PROVIDER=none`을 유지한다. stage smoke test 직전에만 `oci-vault`로 바꾼다.

## 4. stage 데이터베이스와 결제 smoke test

운영 DB에 바로 migration을 적용하지 않는다.

1. 운영 백업을 만든다.
2. 개인정보를 마스킹한 stage clone을 만든다.
3. stage API에 V8~V10을 적용한다.
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

비공개 베타에서는 프런트 이미지를 `NEXT_PUBLIC_RELEASE_CHANNEL=PRIVATE_BETA`로 빌드하고 아래 결제
flag를 모두 `false`로 유지한다. `PAID` 전환은 약관·PG·환불 준비를 마친 정식 유료 출시 작업에서만
수행하며, 환경값만 바꾸지 말고 새 프런트 이미지와 release-readiness 결과를 함께 검증한다.

1. stage에서 `SECRET_PROVIDER=oci-vault`만 켜고 카드 등록/BYOK 저장·조회·폐기를 확인한다.
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
  BYOK 입력란을 노출하지 않는다.
- API·Worker의 `SECRET_PROVIDER=none`, `BILLING_ENABLED=false`,
  `BILLING_RECONCILIATION_ENABLED=false`, `BILLING_RENEWAL_ENABLED=false`,
  `AI_GENERATION_ENABLED=false`, `AI_USAGE_ENFORCEMENT_ENABLED=false`를 유지한다.
- OCI Email Delivery용 `backend-mail-secret` SealedSecret과 배포 참조를 확인하고
  `REGISTRATION_EMAIL_ENABLED=true`, `ACCOUNT_RECOVERY_EMAIL_ENABLED=true`인 렌더링 결과를 검증한다.
- 2026-08-21 운영 확인에서 Tempo가 51회 재시작 후 최근에도 `OOMKilled`됐고 Oracle exporter도
  3회 재시작 후 `OOMKilled`된 이력이 확인됐다. 베타 배포 manifest에는 Tempo `384Mi/1Gi`, Oracle
  exporter `96Mi/256Mi`의 메모리 request/limit를 사용하고, 배포 뒤 최소 24시간 재시작 수와 메모리를
  관찰한다.
- 비공개 베타라도 실제 개인정보 처리방침·이용약관·운영자 문의처는 초안 상태로 두지 않는다. 유료 결제
  계약·사업자 정보·환불 자동화는 결제 기능이 닫힌 베타의 차단 조건에서는 제외할 수 있지만, 유료 전환
  전에 반드시 1~4절을 완료한다.
- 비공개 베타에서는 `AI_GENERATION_ENABLED=false`로 외부 AI 호출 자체를 차단한다. AI를 제공한다면 실제 Provider별 처리 항목, 목적,
  처리 국가·region, 국외 이전 시점과 방법, 보유·삭제 기간, 동의 거부 시 영향을 확인해 정책과 호출 직전
  동의 화면에 반영한다. 현재 운영 구성 후보인 NVIDIA NIM의 정확한 처리 지역·보유기간을 계약·공식
  문서에서 확인하지 못했다면 AI 기능을 열지 않는다.
- `AI_USAGE_ENFORCEMENT_ENABLED=false`인 베타는 유료 point 차감 정책으로 사용량을 통제하지 않는다.
  플랫폼 AI를 연다면 초대 인원과 운영 한도를 작게 시작하고 Provider 사용량·실패율·예상 비용을 매일
  확인한다. 베타 무료 제공을 월 포함 point 또는 구매 point로 표시하거나 유료 전환 때 승계한다고
  약속하지 않는다.
