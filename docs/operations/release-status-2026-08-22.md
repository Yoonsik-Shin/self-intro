# 2026-08-22 비공개 베타와 정식 서비스 출시 기준

- 기준일: 2026-08-22
- 대상 브랜치: `main`
- 배포 상태: **비공개 베타 운영 배포 및 1차 안정화 검증 완료**

이 문서는 2026-08-22까지 완료한 작업을 비공개 베타와 정식 유료 서비스 관점으로 분리한 최신 상태
기준이다. 제품 정책은 ADR, 반복 가능한 운영 절차는 운영 가이드, 실제 출시 차단 조건은 출시 전
체크리스트를 함께 따른다.

- 구독·AI point·사용자 제공 AI API 키 정책: [ADR-007](../adr/ADR-007-workspace-subscription-ai-usage-and-customer-api-key.md)
- 개인정보 암호화·AI 처리 정책: [ADR-008](../adr/ADR-008-personal-data-encryption-and-ai-processing.md)
- 운영 절차와 검증 이력: [SaaS 운영 가이드](saas-operations-guide.md)
- 정식 출시 전 외부 작업: [베타 및 정식 출시 전 체크리스트](pre-launch-checklist.md)
- 테스터에게 공개할 범위: [비공개 베타테스터 가이드](../beta/private-beta-tester-guide.md)

## 1. 공통 운영 기준

| 항목 | 확정 내용 |
| --- | --- |
| 브랜드명 | `unbrdn` |
| 서비스명 | `Self-Intro` |
| 운영자·대표자·개인정보 보호책임자 | 신윤식 |
| 고객지원 | `support@unbrdn.me` |
| 개인정보 문의 | `privacy@unbrdn.me` |
| 결제 문의 | `billing@unbrdn.me` |
| 문의 운영시간 | 평일 09:00~18:00 |
| 최초 답변 목표 | 영업일 기준 1일 이내 |
| 자동 발신 주소 | `no-reply@unbrdn.me` |

비공개 베타는 초대받은 테스터에게 무료로 제공한다. 결제와 불특정 다수 대상 영업을 하지 않으므로 공개
전화번호, 사업장 주소, 사업자등록번호, 통신판매업 신고번호는 베타 화면에 싣지 않는다. 이 정보가
불필요하다는 뜻은 아니며, 정식 유료 서비스 개시 전에는 실제 사업자·전자상거래 운영 기준에 맞춰 약관과
정책 화면에 추가해야 한다.

## 2. 오늘 완료한 작업

| 영역 | 완료 내용 | 현재 효력 |
| --- | --- | --- |
| Email 수신 | Cloudflare Email Routing으로 `support`, `privacy`, `billing` 문의를 운영자 수신함에 전달 | 사용 가능 |
| Email 발신 | OCI Email Delivery 도메인, SPF, DKIM, DMARC, 승인 발신자와 SMTP 자격증명 구성 | 로컬 실제 발송 검증 완료 |
| Email 인증 | Gmail 원본에서 SPF `PASS`, DKIM `PASS`, DMARC `PASS` 확인 | DNS·SMTP 경로 검증 완료 |
| 운영 Secret | `backend-mail-secret` SealedSecret과 Deployment secret 참조 구성 | 운영 적용 완료, Git에는 암호문만 저장 |
| 가입·복구 메일 | production manifest에서 가입 확인·계정 복구 메일 flag 활성화 | 운영 적용 완료, 실제 수신 smoke 필요 |
| 비공개 베타 UI | 일반 사용자는 실제 가격·결제·사용자 제공 AI API 키를 숨기고 `베타 기간 무료` 표시 | 운영 적용 완료 |
| 운영자 preview | `PLATFORM_OWNER`와 지정 Workspace가 모두 일치할 때만 Toss 샌드박스·사용자 제공 AI API 키 노출 | 운영 배포·검증 완료 |
| 결제·AI 차단 | 전역 flag는 비활성화하고 preview 요청만 서버·UI에서 정확히 예외 처리 | 일반 사용자 fail closed |
| 정책 | 이용약관·개인정보·마케팅 동의 version을 `2026-08-22`로 일치 | 비공개 베타 기준 확정 |
| 메모리 안정화 | Tempo와 Oracle exporter의 메모리 request/limit 보강 | 운영 적용 완료, 24시간 관찰 중 |
| 복구·릴리스 gate | backend, Worker, frontend, manifest, recovery evidence 자동 검사 | PR 필수 검사 통과 |
| 보안 검사 | OCI OCID 공개 형식 문자열의 GitGuardian 오탐을 확인하고 안전한 상수 표현으로 수정 | 최종 검사 통과 |
| 프런트 재현성 | npm 10 기준 lockfile을 동기화하고 CI `npm ci` 실패를 해결 | 최종 빌드 통과 |
| 비밀번호 해시 | 신규 비밀번호는 Argon2id(`m=19 MiB`, `t=2`, `p=1`)로 저장하고 기존 BCrypt는 성공 인증 시 점진 재해시 | 운영 배포·회귀 테스트 완료 |
| Pod·네트워크 경계 | API·Worker에 숫자 UID/GID 기반 non-root, RuntimeDefault seccomp, capability 전체 제거와 ingress NetworkPolicy 적용 | 운영 배포·readiness 검증 완료 |

구현 또는 정책 문서가 존재한다는 사실만으로 정식 운영 활성화를 의미하지 않는다. Toss 테스트 결제와
OCI Vault 사용자 제공 AI API 키는 지정 운영자 preview에만 사용한다. Workspace DEK, 내부 mTLS와 WORM 감사는 후속 보안
강화 항목이며 완료된 것으로 표현하지 않는다.

## 3. 비공개 베타 출시 기준

### 3.1 제공 범위

- 초대 기반 계정 생성, 이메일 확인과 계정 복구
- 개인 또는 기업·팀 Workspace 작성과 관리
- 명시적으로 발행한 공개 프로필·경력·프로젝트·학습·포트폴리오 페이지
- PDF 등 베타에서 활성화한 비결제 기능
- 이메일 기반 고객지원·개인정보 문의

### 3.2 제공하지 않는 범위

- 일반 테스터의 카드 등록, 월·연 구독, point pack, 추가 좌석 결제와 자동 갱신
- 실제 금액 노출과 유료 플랜으로의 자동 전환
- 일반 테스터의 플랫폼 key 또는 사용자 제공 AI API 키 외부 AI 호출
- 자동 환불 또는 운영자 환불 mutation
- 정식 서비스 수준의 SLA 또는 무중단 제공 보장

베타 중 생성한 계정이 정식 출시 때 자동으로 유료 전환되거나 청구되지 않는다. 정식 출시 후 결제를
도입할 때는 가격·결제 주기·해지·환불 조건을 다시 표시하고 사용자의 명시적 승인을 받아야 한다.

운영자는 지정 테스트 Workspace에서만 Toss 샌드박스와 사용자 제공 AI API 키를 검증할 수 있다. Toss 테스트 거래는 실제
매출이 아니며, allowlist에 없는 Workspace 또는 `PLATFORM_OWNER`가 아닌 계정은 같은 API를 호출해도
fail closed된다.

### 3.3 현재 릴리스 증거

PR [#3](https://github.com/Yoonsik-Shin/self-intro/pull/3)은
`b7280f7245877e9d6b7e1ee72736708699266ed5`로 `main`에 병합됐으며 2026-08-22 배포 결과는 다음과 같다.

| 검사 | 결과 |
| --- | --- |
| GitGuardian Security Checks | 성공 |
| Workspace Purge `verify-recovery-evidence` | 성공 |
| Release Readiness `verify-release-candidate` | 성공 |
| GitHub mergeability | `MERGEABLE` |
| GitHub merge state | `CLEAN` |
| Workspace Purge Release Gate `32510747867` | 성공 |
| Deploy API `32510747862` | 성공 |
| Deploy Worker `32510747861` | 성공 |
| Frontend CI/CD Pipeline `32510747863` | 성공 |
| Backend·Frontend Argo CD | `Synced/Healthy` |
| API·Worker·Frontend 이미지 | 모두 `b7280f7` |
| Pod 상태 | 모두 Ready, 재시작 0 |
| 외부 health·readiness·공개 Workspace route | 모두 HTTP 200 |

이후 `PLATFORM_OWNER`와 지정 Workspace에만 결제·AI·사용자 제공 AI API 키 preview를 허용하는 `9660ae70`을 배포했다.
release gate의 billing Secret 소비자 검증은 `a60fc315`에서 API Deployment만 허용하도록 보정했다.

| owner preview 검사 | 결과 |
| --- | --- |
| Workspace Purge Release Gate `32518296197` | 성공 |
| Deploy API `32518296138` | 성공, `backend:9660ae7` |
| Frontend CI/CD `32518296146` | 성공, `frontend:9660ae7` |
| Release Readiness `32519188500` | 성공 |
| GitOps revision | `3876b283`, Backend·Frontend `Synced/Healthy` |
| 전역 결제·AI flag | 모두 `false` |
| owner preview | `true`, `w-199d6de326de71385a98`만 허용 |
| Toss Secret | SealedSecret 동기화, API에만 주입 |
| API·Frontend Pod | Ready, 재시작 0 |
| 외부 smoke | API readiness `UP`, 서비스 홈 HTTP 200 |

따라서 **비공개 베타 배포 준비도와 운영 배포 완료도는 100%**다. 운영 가입 확인·계정 복구 메일의 실제
수신 및 링크 host 검증과 24시간 인프라 관찰은 배포 후 운영 확인으로 계속 수행한다. 이 두 항목은 현재
앱 rollout, health와 공개 route가 정상임을 뒤집는 배포 차단 조건은 아니다.

Argon2id와 Pod·NetworkPolicy 강화는 PR #5와 숫자 container user 보정 PR #6으로 추가 배포했다. 최초
manifest는 image의 문자열 사용자 `spring`을 `runAsNonRoot`에서 검증할 수 없어 API·Worker가
`CreateContainerConfigError`가 됐고, Docker image와 Pod security context를 `10001:10001`로 통일해
복구했다. 최종 배포 증거는 다음과 같다.

| 보안 강화 배포 검사 | 결과 |
| --- | --- |
| PR #5 merge | `1736f3eb` |
| PR #6 numeric user 보정 merge | `152a0af7` |
| Deploy API `32551167550` | 성공 |
| Deploy Worker `32551167555` | 성공 |
| GitOps revision | `f317f816`, `Synced/Healthy` |
| API·Worker 이미지 | 모두 `152a0af` |
| Pod 상태 | 모두 Ready, 재시작 0 |
| API 외부 readiness | HTTP 200, `{"status":"UP"}` |
| 서비스 홈 | HTTP 200 |
| OKE node condition | Ready, Memory/Disk/PIDPressure 모두 `False` |

이 작업으로 오늘 변경 사항의 정책·구현·배포·비용 문서화 상태는 **100%**다. 이는 아래에 명시한
Workspace DEK·mTLS·WORM·egress 후속 구현이나 정식 유료 서비스의 외부 계약까지 완료됐다는 뜻은
아니다.

### 3.4 배포 직후 필수 확인

1. API·Worker·Frontend 이미지와 GitOps sync 상태가 새 commit을 가리키는지 확인한다.
2. 모든 Pod의 Ready, restart, `OOMKilled`, readiness와 실제 공개 route를 확인한다.
3. 운영 도메인에서 가입 확인과 계정 복구 메일을 각각 1건 발송한다.
4. 메일 링크가 `https://unbrdn.me`를 사용하고 SPF·DKIM·DMARC가 모두 `PASS`인지 확인한다.
5. 공개 화면에 실제 가격·결제 입력·외부 AI 실행 진입점이 없는지 확인한다.
6. 24시간 동안 Tempo·Oracle exporter restart, trace와 scrape 상태를 관찰한다.

## 4. 정식 유료 서비스 출시 기준

### 4.1 확정된 상품 정책

아래 금액은 부가세를 포함한 최종 결제금액 기준이다. 정책은 확정됐지만 운영 결제를 활성화한 상태는
아니다.

| 상품 | 월 결제 | 연 결제 | 포함량 |
| --- | ---: | ---: | --- |
| PERSONAL PRO | 9,900원 | 99,000원 | 월 5,000 AI point, Workspace 멤버 5명 |
| BUSINESS | 39,000원 | 390,000원 | 월 25,000 AI point, Workspace 멤버 10명 |
| 추가 AI point pack | 9,900원 | 해당 없음 | 구매 point 10,000 |
| 추가 좌석 | 3,000원 | 30,000원 | 1명 |

- 월 포함 point는 월말에 만료하고 구매 point는 무제한 이월한다.
- 자동 충전은 제공하지 않는다.
- 작업 시작 전에 예상 상한을 예약하고, 시작한 작업은 서버 소유 최대 범위 안에서 완료한 뒤 정산한다.
- 사용자 제공 AI API 키는 FREE, PERSONAL PRO, BUSINESS에 제공하지만 플랫폼 key로 묵시적으로 fallback하지 않는다.
- 월 구독은 결제 후 7일 이내이고 유료 AI point와 유료 기능을 사용하지 않았으면 전액 환불한다.
- 연 구독 중도 환불은 사용한 개월을 월 정가로 계산한 뒤 남은 결제금액을 환불한다.
- point pack은 구매 원장에 남은 구매 point 비율만큼만 환불한다.

### 4.2 정식 출시 차단 조건

#### 사용자가 완료해야 하는 외부·사업 작업

- 사업자등록, 실제 상호·대표자·사업장 주소와 공개 고객 문의 전화번호 확정
- 통신판매업 신고 또는 신고 면제 근거 확인
- 토스페이먼츠 전자계약, 자동결제 심사, live MID·키와 webhook 설정
- 약관·개인정보 처리방침·정기결제·환불 정책의 법률·세무·PG 검토
- 외부 AI Provider별 처리 국가·region·보유기간과 계약 근거 확정
- 운영 비용·요율·부가세·증빙 발급 절차 확정

#### 계약 없이 완료한 코드·인프라

- OCI Vault, AES key, exact-node instance principal, 사용자 제공 AI API 키 저장·조회·회전·폐기 경계
- Subscription·Billing·AI point 원장, Toss webhook 멱등성, 갱신·정합성·취소 adapter와 테스트
- 외부 AI 처리 동의, Provider Router, 사용자 제공 AI API 키 사용 시 플랫폼 키로 대체하지 않는 정책과 교차 Workspace 격리
- `PLATFORM_OWNER`와 정확한 Workspace allowlist의 서버·UI 이중 preview gate
- API 전용 Toss SealedSecret과 Worker secret 비주입

Argon2id 점진 전환과 Pod·NetworkPolicy 기본 강화는 구현·검증을 마쳤다. Workspace DEK, 내부 mTLS,
WORM 감사와 외부 목적지 egress 통제는 ADR-008의 후속 보안 강화 항목이며 실제 도입 시
migration·복구 rehearsal과 비용 승인을 거쳐야 한다.

계약 없이 준비 가능한 정식 유료 서비스 코드·인프라는 현재 **75%**다. 이미 구현된 구독·결제·AI 원장과
Vault·샌드박스 경계는 유지되지만 위 보안 항목을 마치기 전에는 100%로 표시하지 않는다. 사업자등록, PG 라이브 계약·심사,
법률·세무 검토, 외부 AI 처리 조건과 운영 요율 확정은 코드로 대체할 수 없으므로 **현재 일반 사용자 대상
유료 서비스 활성화는 불가**하다. 상세 실행 순서와 완료 증거는 [출시 전 체크리스트](pre-launch-checklist.md)에
기록한다.

## 5. 다음 실행과 책임 구분

| 순서 | 작업 | 담당 | 현재 상태 |
| ---: | --- | --- | --- |
| 1 | PR #3 병합 승인 | 사용자 | 완료 |
| 2 | `main` 병합 및 배포 workflow 실행 | Codex | 완료 |
| 3 | GitOps sync, Pod, health, 실제 route 확인 | Codex | 완료 |
| 4 | 운영 가입·복구 메일과 인증 헤더 확인 | 사용자 수신 확인 + Codex 로그 확인 | 후속 운영 smoke |
| 5 | 24시간 restart·OOM·trace·scrape 관찰 | Codex | 관찰 시작 |
| 6 | 비공개 베타 초대와 피드백 운영 | 사용자 | 시작 가능 |
| 7 | 사업자·PG·법률·AI Provider 계약 준비 | 사용자 | 정식 출시 전 필수 |
| 8 | Vault·샌드박스·사용자 제공 AI API 키 지정 Workspace preview | Codex | 구현·검증·배포 완료 |
| 9 | Argon2id 점진 재해시와 Pod·NetworkPolicy 강화 | Codex | 구현·검증·운영 배포 완료 |
| 10 | Workspace DEK·내부 mTLS·WORM·egress 강화 | Codex 구현 + 사용자 비용·보존 잠금 승인 | 비용 승인 전 대기 |

## 6. OKE 복원력 후속 준비 상태

비공개 베타 애플리케이션 배포 완료도는 기존과 같이 100%다. 다만 단일 노드 장애와 트래픽 증가를
자동으로 흡수하는 인프라 복원력은 별도 작업이며 현재 **설계·적용 전 manifest 준비 완료, 운영 미적용**이다.
`deploy/k8s/examples/oke-basic-resilience/`는 production Kustomization에 연결되지 않으므로 현재 운영
동작과 비용을 바꾸지 않는다.

최신 OCI 공식 단가와 이 테넌시의 A1 무료 공제 실청구 확인, 월 2만원 상한 구성의 사용자 승인은
완료했다. self-intro compartment에는 17 SGD Budget과 forecast 70%, actual 85%, actual 100% 경보가
ACTIVE다. 그러나 live primary가 목표 2/8이 아닌 2 OCPU/12GB이고, secondary boot volume과 기존 Registry
비용까지 합산하면 즉시 node를 추가할 때 상한을 넘길 가능성이 있다. 따라서 node pool은 생성하지 않았다.
다음 단계는 primary 2/8 축소의 별도 변경 승인과 Ready·route 검증이다. 그 뒤 fixed-secondary, burst,
Metrics Server, Cluster Autoscaler, scheduling policy, HPA 순으로 적용하고 primary drain과
`burst 0 -> 1 -> 0` rehearsal를 통과해야 복원력 완료로 표시한다.

현재 비공개 베타와 지정 owner preview는 **배포 가능하며 운영 배포와 1차 안정화 검증까지 완료**했다.
필수 사용자 작업은 없다. 다음 단계는 실제 베타 초대 운영이며, 가입 확인·계정 복구 메일의 링크 host와
인증 헤더 확인 및 24시간 restart·OOM·trace·scrape 확인은 배포 후 관찰 항목으로 계속 추적한다.
