# 2026-08-22 비공개 베타와 정식 서비스 출시 기준

- 기준일: 2026-08-22
- 대상 브랜치: `release/private-beta-20260822`
- 배포 상태: **비공개 베타 배포 후보 검증 완료, 아직 `main` 미병합·운영 미배포**

이 문서는 2026-08-22까지 완료한 작업을 비공개 베타와 정식 유료 서비스 관점으로 분리한 최신 상태
기준이다. 제품 정책은 ADR, 반복 가능한 운영 절차는 운영 가이드, 실제 출시 차단 조건은 출시 전
체크리스트를 함께 따른다.

- 구독·AI point·BYOK 정책: [ADR-007](../adr/ADR-007-workspace-subscription-ai-usage-and-byok.md)
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
| 운영 Secret | `backend-mail-secret` SealedSecret과 Deployment secret 참조 구성 | Git에는 암호문만 저장, 운영 적용 전 |
| 가입·복구 메일 | production manifest에서 가입 확인·계정 복구 메일 flag 활성화 | 배포 후 운영 smoke 필요 |
| 비공개 베타 UI | 실제 가격, 카드, 구독, point pack, 좌석 결제, BYOK 입력을 숨기고 `베타 기간 무료` 표시 | 배포 후보에 반영 |
| 결제·AI 차단 | 결제·갱신·정산·외부 AI 생성·AI point 차감 flag를 비활성화 | 서버와 UI 이중 차단 |
| 정책 | 이용약관·개인정보·마케팅 동의 version을 `2026-08-22`로 일치 | 비공개 베타 기준 확정 |
| 메모리 안정화 | Tempo와 Oracle exporter의 메모리 request/limit 보강 | 배포 후 24시간 관찰 필요 |
| 복구·릴리스 gate | backend, Worker, frontend, manifest, recovery evidence 자동 검사 | PR 필수 검사 통과 |
| 보안 검사 | OCI OCID 공개 형식 문자열의 GitGuardian 오탐을 확인하고 안전한 상수 표현으로 수정 | 최종 검사 통과 |
| 프런트 재현성 | npm 10 기준 lockfile을 동기화하고 CI `npm ci` 실패를 해결 | 최종 빌드 통과 |

구현 또는 정책 문서가 존재한다는 사실만으로 운영 활성화를 의미하지 않는다. 특히 Toss 결제, 외부 AI,
OCI Vault BYOK, Workspace DEK, Argon2id와 WORM 감사는 아래 정식 출시 gate를 통과하기 전에는 운영 기능으로
표현하지 않는다.

## 3. 비공개 베타 출시 기준

### 3.1 제공 범위

- 초대 기반 계정 생성, 이메일 확인과 계정 복구
- 개인 또는 기업·팀 Workspace 작성과 관리
- 명시적으로 발행한 공개 프로필·경력·프로젝트·학습·포트폴리오 페이지
- PDF 등 베타에서 활성화한 비결제 기능
- 이메일 기반 고객지원·개인정보 문의

### 3.2 제공하지 않는 범위

- 카드 등록, 월·연 구독, point pack, 추가 좌석 결제와 자동 갱신
- 실제 금액 노출과 유료 플랜으로의 자동 전환
- 플랫폼 key 또는 BYOK를 이용한 외부 AI 호출
- 자동 환불 또는 운영자 환불 mutation
- 정식 서비스 수준의 SLA 또는 무중단 제공 보장

베타 중 생성한 계정이 정식 출시 때 자동으로 유료 전환되거나 청구되지 않는다. 정식 출시 후 결제를
도입할 때는 가격·결제 주기·해지·환불 조건을 다시 표시하고 사용자의 명시적 승인을 받아야 한다.

### 3.3 현재 릴리스 증거

PR [#3](https://github.com/Yoonsik-Shin/self-intro/pull/3)의 HEAD는
`c48fd88ef817fd1f140e7f3eb3fae02dbe3a5c63`이며 2026-08-22 확인 결과는 다음과 같다.

| 검사 | 결과 |
| --- | --- |
| GitGuardian Security Checks | 성공 |
| Workspace Purge `verify-recovery-evidence` | 성공 |
| Release Readiness `verify-release-candidate` | 성공 |
| GitHub mergeability | `MERGEABLE` |
| GitHub merge state | `CLEAN` |

따라서 **비공개 베타 배포 전 준비도는 100%**다. 이는 병합·배포를 실행할 수 있다는 뜻이며 이미 운영에
배포됐다는 뜻은 아니다. 현재 남은 실행은 사용자의 배포 승인, PR 병합, GitOps rollout 확인과 운영
smoke test다.

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
- BYOK는 FREE, PERSONAL PRO, BUSINESS에 제공하지만 플랫폼 key로 묵시적으로 fallback하지 않는다.
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

#### 코드·인프라에서 완료해야 하는 작업

- OCI Vault와 실제 workload identity를 stage·production에 연결하고 BYOK 저장·회전·폐기 rehearsal
- stage에서 V8~V10 migration과 결제·Webhook 멱등성 전체 smoke test
- 최초 결제, 갱신, 실패, 해지, point pack, 좌석, 취소와 환불 시나리오 검증
- 환불액 산정, point 회수, 운영자 승인과 Provider 취소를 하나의 immutable 감사 원장으로 연결
- 실제 AI token·원가를 2~4주 계측하고 provider price·환율·point 환산 version 확정
- 외부 AI 처리 동의, Provider Router, BYOK와 교차 Workspace 격리를 stage에서 검증
- Workspace DEK, Argon2id 전환과 WORM 감사의 구현·migration·복구 rehearsal
- paid release에서만 backend flag와 `NEXT_PUBLIC_RELEASE_CHANNEL=PAID`를 단계적으로 활성화

정식 유료 서비스 준비도는 현재 **70%**다. 상품·환불·BYOK 정책과 주요 애플리케이션 경계는 마련됐지만,
사업자·PG·법률·외부 AI 계약과 운영 Secret·환불·암호화 검증이 남아 있으므로 **현재 유료 서비스로는 배포
불가**다. 상세 실행 순서와 완료 증거는 [출시 전 체크리스트](pre-launch-checklist.md)에 기록한다.

## 5. 다음 실행과 책임 구분

| 순서 | 작업 | 담당 | 현재 상태 |
| ---: | --- | --- | --- |
| 1 | PR #3 병합 승인 | 사용자 | 승인 대기 |
| 2 | `main` 병합 및 배포 workflow 실행 | Codex 또는 사용자 | 1번 승인 후 가능 |
| 3 | GitOps sync, Pod, health, 실제 route 확인 | Codex | 배포 후 수행 |
| 4 | 운영 가입·복구 메일과 인증 헤더 확인 | 사용자 수신 확인 + Codex 로그 확인 | 배포 후 수행 |
| 5 | 24시간 restart·OOM·trace·scrape 관찰 | Codex | 배포 후 수행 |
| 6 | 비공개 베타 초대와 피드백 운영 | 사용자 | 1~5 완료 후 시작 |
| 7 | 사업자·PG·법률·AI Provider 계약 준비 | 사용자 | 정식 출시 전 필수 |
| 8 | Vault·결제·환불·암호화 production gate 완성 | Codex | 외부 정보·계약 준비와 병행 |

현재 다음 단계는 **사용자의 PR #3 병합 및 비공개 베타 배포 승인**이다. 승인 전에는 Codex가 임의로
`main`에 병합하거나 운영 rollout을 시작하지 않는다.
