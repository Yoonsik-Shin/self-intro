# ADR-007: Workspace 구독·AI 사용량 과금과 BYOK 경계

- 상태: Accepted (정책 확정, 구현 전)
- 기준일: 2026-08-20
- 적용 범위: Workspace 유형, 구독·결제, AI 사용량, Provider key 관리
- 관련 문서: [ADR-001](./ADR-001-saas-security-multitenancy.md),
  [ADR-002](./ADR-002-registration-and-workspace-onboarding.md),
  [ADR-004](./ADR-004-output-composition-and-revisions.md),
  [ADR-006](./ADR-006-private-data-plane-and-public-projection.md)
- 구현 상태: 이 ADR의 제품 정책은 확정했지만 Subscription, Billing, AI point, BYOK 기능은 아직
  구현·배포하지 않았다.

## 배경

현재 Workspace는 가입 시 개인 포트폴리오를 만들도록 구현되어 있지만, 보안·데이터 소유권 경계는
개인뿐 아니라 팀·기업·커뮤니티처럼 하나의 공개 주체가 콘텐츠를 소유하고 여러 사용자가 관리하는
구조에도 적용할 수 있다. 따라서 Workspace를 개인 데이터 묶음으로 고정하면 향후 기업 소개, 조직
구성원 관리, 회사 소개서와 같은 확장에서 도메인과 결제 모델을 다시 분리해야 한다.

동시에 경력·학습·역량·포트폴리오·지원 문서와 PDF 초안 생성은 단일 API 호출이 아니다. 현재 주요
흐름은 사실·근거 추출과 최종 글쓰기의 두 단계 LLM 호출을 사용하고, 문서 보정·재생성·벡터 검색·실패
재시도도 추가 원가를 만든다. Provider, 모델, 환율과 보안 처리 방식에 따라 원가가 달라지므로
`유료 플랜 = AI 무제한`으로 약속할 수 없다. 반대로 사용자가 결과물을 다듬는 매 호출마다 고정 횟수를
차감하면 초안을 완성하기 전에 사용량을 걱정하게 되어 제품 경험이 나빠진다.

사용자가 직접 Provider API key를 연결하는 BYOK(Bring Your Own Key)는 플랫폼의 변동 LLM 원가를
줄이고 조직별 Provider 계약을 활용하게 할 수 있다. 그러나 key 유출, 묵시적 Provider 전환, 임의
endpoint를 통한 SSRF, Workspace 멤버 간 권한 혼동과 개인정보 국외 이전 고지 누락 같은 새로운
위험을 만든다. BYOK는 단순 문자열 설정이 아니라 별도 Secret·동의·감사 경계로 설계해야 한다.

## 결정

### 1. Workspace를 공개 주체이자 tenant 경계로 정의한다

Workspace는 `개인`, `팀`, `기업` 중 하나를 요금제에 의해 구분하는 개념이 아니다. 다음 네 축을
독립적으로 관리한다.

| 축 | 책임 | 예시 |
| --- | --- | --- |
| Workspace 유형 | 어떤 공개 주체와 콘텐츠 구성을 표현하는가 | `PERSONAL`, `ORGANIZATION` |
| Membership | 누가 어떤 권한으로 관리하는가 | `OWNER`, `ADMIN`, `EDITOR`, `VIEWER` |
| Subscription | 어떤 제품 기능과 사용량을 제공하는가 | `FREE`, `PERSONAL_PRO`, `BUSINESS` |
| Billing Customer | 누가 결제하고 증빙을 받는가 | 개인, 개인사업자, 법인 |

`PERSONAL`도 여러 편집자를 가질 수 있고 `ORGANIZATION`도 한 명이 관리할 수 있으므로 협업 여부를
Workspace 유형으로 표현하지 않는다. 현재 `WorkspaceType.TEAM`은 실제 저장값과 사용 경로를 확인한
뒤 `ORGANIZATION`으로 이관한다. 기존 값을 확인하지 않은 enum rename을 먼저 배포하지 않는다.

개인과 조직 콘텐츠는 공통 Workspace·Membership·발행 revision 경계를 공유하되 원본 aggregate를
억지로 재사용하지 않는다.

```text
Workspace
├─ WorkspaceProfile
├─ PublicationRevision
├─ PERSONAL
│  ├─ Experience
│  ├─ Study
│  └─ Competency
└─ ORGANIZATION
   ├─ OrganizationProfile
   ├─ ProductOrService
   ├─ OrganizationMember
   └─ OrganizationCaseStudy
```

Workspace 유형은 구독 플랜과 독립적이다. 조직 Workspace도 FREE를 사용할 수 있고 개인 Workspace도
BUSINESS를 선택할 수 있다.

### 2. 구독과 AI 권리는 Workspace에 귀속한다

결제 mutation을 수행하는 사람은 사용자지만, Subscription과 포함 AI 사용량은 Workspace에 귀속한다.
한 계정이 여러 Workspace에 참여하면 각 Workspace는 서로 다른 플랜·결제수단·AI 잔액을 가질 수 있다.

- 모든 플랜·결제·AI 사용량 조회는 URL의 Workspace Membership을 다시 검증한다.
- 결제수단 등록·변경, 구독 시작·해지·복구와 BYOK 설정은 우선 `OWNER`만 수행한다.
- 결제수단·BYOK mutation은 최근 재인증을 요구하고 보안 감사 이벤트를 남긴다.
- 플랫폼 역할만으로 다른 Workspace의 결제수단, API key, AI 입력·결과 원문을 열람하지 못한다.
- 소유권 이전 시 결제수단과 BYOK key를 자동 승계하지 않는다. 기존 자동 갱신과 BYOK를 일시 중지하고
  새 `OWNER`가 각각 재확인한다.

Workspace와 활성 멤버 기본 한도는 다음과 같이 확정한다.

| 플랜 | 계정이 소유할 수 있는 Workspace | Workspace별 포함 활성 멤버 |
| --- | ---: | ---: |
| FREE | 1개 | 1명 |
| PERSONAL_PRO | 5개 | 5명 |
| BUSINESS | 10개 | 10명 |

PRO와 BUSINESS는 포함 좌석을 넘으면 좌석당 월 3,000원 또는 연 30,000원에 추가할 수 있다. 추가
좌석은 구독과 같은 갱신일을 사용하고 추가 시 남은 기간을 일 단위로 계산해 결제한다. 좌석 제거는
이미 결제한 기간 중 즉시 환불하지 않고 다음 갱신일부터 적용한다. 추가 Workspace 상품과 가격은
초기 출시 범위에 포함하지 않으며, 기본 한도 초과가 실제로 필요해질 때 별도 entitlement로 추가한다.

### 3. 초기 플랜은 세 종류로 검증한다

다음 가격과 포함량을 출시 정책으로 확정한다. 소비자 화면에는 부가세 포함 가격을 표시한다. 쿠폰과
무료 체험 후 자동 유료전환은 MVP 범위에서 제외한다.

| 플랜 | 월 가격 | 연 가격 | AI 정책 | 포함 활성 멤버 |
| --- | ---: | ---: | --- | ---: |
| FREE | 0원 | 해당 없음 | eligible AI 기능별 월 1개 무료 세션 | 1명 |
| PERSONAL_PRO | 9,900원 | 99,000원 | 월 5,000 AI point | 5명 |
| BUSINESS | 39,000원 | 390,000원 | 월 25,000 AI point | 10명 |
| 추가 AI point pack | 9,900원 | 해당 없음 | 10,000 AI point | 해당 없음 |
| 추가 좌석 | 3,000원 | 30,000원 | 해당 없음 | 1명 |

연간 가격은 월간 10개월분에 해당하며 12개월을 제공한다. 가격 인상은 versioned plan으로 새 가입자에게
먼저 적용하고 기존 구독자는 기존 가격을 유지한다. 기존 구독자에게 인상 가격을 적용해야 하는 경우
법정 고지·명시적 동의 절차를 거친다.

`100 point`는 표준 전체 초안 약 1건의 초기 비교 단위로 사용하되 Provider 단가 자체를 사용자 계약으로
고정하지 않는다. 기능별 실제 token·재시도·P95 원가를 계측해 point 가중치를 운영할 수 있지만, 이미
구매·부여된 point의 수량과 유효성은 소급 변경하지 않는다.

### 4. 무료와 유료의 AI 사용 정책을 구분한다

#### FREE

FREE는 결제 잔액이 없어 남용 방지를 위해 사용자가 이해하기 쉬운 기능별 횟수 제한을 사용한다.

- 매월 eligible AI 기능마다 최초 AI 작업 세션 1개를 제공한다.
- 각 세션은 최초 전체 초안과 같은 결과물에 대한 보정 최대 3회를 포함한다.
- 보정 가능 기간은 최초 생성 후 7일이다.
- Provider·서버 실패는 세션이나 보정 횟수로 확정 차감하지 않는다.
- 사용자가 작성한 기존 내용을 AI 없이 PDF로 렌더링·다운로드하는 작업은 제한하지 않는다.
- 고급 모델 선택은 제공하지 않는다.

초기 eligible AI 기능은 다음 여섯 범주로 고정한다.

1. 경력 초안
2. 학습 초안
3. 역량 초안
4. 포트폴리오 사례 초안
5. 지원 분석·자기소개서 초안
6. AI PDF·출력 구성

따라서 FREE 계정은 매월 각 범주를 1회씩 체험할 수 있다. 신규 AI 기능을 추가했다고 자동으로 무료
세션을 부여하지 않고, `featureCode`를 무료 allowlist에 명시적으로 추가한다. 무료 혜택은 계정이 소유한
FREE Workspace 1개에만 적용하고 여러 계정·Workspace를 이용한 반복 혜택 생성은 별도 남용 정책으로
제한한다. 무료 제공량을 모두 사용한 뒤에는 추가 point pack을 명시적으로 구매해야 하며 자동 충전하지
않는다.

같은 source·artifact·revision을 바탕으로 문체, 길이, 강조점과 배치를 조정하는 것은 보정이다. 다른
지원 대상, 다른 원본 구성, 다른 문서 목적 또는 전체 source snapshot 변경은 새 AI 작업 세션이다.

#### 유료 플랜

유료 플랜에는 보정 횟수 상한을 두지 않는다. 사용자는 point 잔액이 있는 동안 같은 결과물을 원하는
만큼 보정할 수 있다.

- 최초 생성, 부분 보정, 전체 재생성, 고급 모델 선택은 실제 예상 원가에 비례한 point를 사용한다.
- 짧은 부분 보정은 전체 초안보다 적은 point를 사용한다.
- 실행 전에 최대 예상 point를 예약하고, 성공 후 실제 토큰·모델 가격을 기준으로 확정 정산한다.
- 실패하면 예약 point를 반환한다. 사용자의 취소가 Provider 호출 완료 뒤 발생한 경우의 정산 기준은
  별도 사용자 정책으로 고지한다.
- 사용자에게 raw token 단가를 과금 단위로 노출하지 않고 작업 전 예상 point 범위를 보여준다.
- 완료 후 실제 차감 point와 남은 잔액을 사용자에게 보여준다.
- 잔액 부족 외에는 제품상의 보정 횟수 제한을 두지 않는다. 분당 요청, 동시 실행, 비정상 반복과
  Provider 한도는 기술·보안 rate limit으로 별도 적용한다.

월 플랜으로 부여된 point는 매월 초기화하고 이월하지 않는다. 별도 구매 point는 만료 없이 이월한다.
만료가 있는 월 포함 point를 먼저 사용하고, 구독 해지 후에도 구매 point는 보존한다. Account 탈퇴나
Workspace 폐쇄 시 point 처리·환불은 개인정보 purge와 분리해 사용자 환불 정책에 따른다.

새 작업을 시작할 때는 예상 최대 point를 예약한다. 실제 사용량이 예상을 초과해 잔액이 부족해져도
이미 시작한 마지막 작업은 중간에 잘라 실패시키지 않고 정상 완료한다. 완료 후 실제 사용량을 확정해
잔액이 일시적으로 음수가 될 수 있으며, 추가 결제나 다음 월 grant로 잔액이 복구되기 전에는 새 작업을
시작할 수 없다. 자동 충전은 하지 않는다. 단일 작업의 음수 허용 범위는 해당 기능의 서버 소유 최대
token·원가 상한을 넘지 못한다.

### 5. AI 사용량과 가격을 원장으로 계측한다

가격 확정 전 최소 2~4주 동안 shadow cost를 계측한다. 기능별 평균만으로 가격을 정하지 않고 P95 원가,
재시도, 환율과 Provider 가격 변경 여유를 포함한다.

AI 실행은 다음 상태 전이를 따른다.

```text
point 예약
  → Provider 호출
  → 성공: 실제 usage로 확정 차감 + 나머지 예약 반환
  → 실패: 예약 반환
  → 응답 불명: Provider 조회·reconciliation 전까지 확정 보류
```

최소 계측 필드는 다음과 같다.

- `workspaceId`, `userId`, `featureCode`, `artifactId`, `sessionId`, `requestId`
- Provider, model, region, BYOK 여부와 가격 version
- input, cached input, output, reasoning token과 재시도 횟수
- 예약 point, 확정 point, 달러·원화 원가 snapshot
- 성공·실패·취소 상태와 제한된 reason code
- Evidence Packet·AI 처리 동의 version

프롬프트·응답 원문, API key, 이메일, Workspace 이름과 Provider 오류 본문 전체는 usage·결제 로그에
저장하지 않는다.

`provider_price`는 입력·cache·출력 단가, 통화, region 할증, 적용 기간과 version을 보존한다. 과거
사용량을 현재 단가로 다시 계산하지 않고 요청 시점의 가격 snapshot을 사용한다.

### 6. BYOK는 모든 플랜의 별도 Secret 경계로 제공한다

BYOK는 FREE, PERSONAL_PRO, BUSINESS 모두에 제공한다. 첫 지원 Provider는 OpenAI, Anthropic, Gemini로
확정하고 각 Provider의 생성형 LLM과 embedding 호출을 모두 BYOK 범위에 포함한다. 지원 시 다음 계약을
지킨다.

#### 권한과 사용자 경험

- `OWNER`만 Provider key를 등록·교체·폐기하고 최근 재인증을 요구한다.
- `ADMIN`은 사용 가능 여부, Provider, 허용 모델과 마지막 검증 시각만 볼 수 있고 key 원문은 보지
  못한다. 그 밖의 멤버는 조직 정책상 허용된 AI 기능만 사용한다.
- 등록 화면은 Provider, 처리 region, 개인정보 처리·국외 이전 안내, Workspace 멤버가 이 key로 AI를
  사용할 수 있다는 사실을 명확히 표시한다.
- Provider, 처리 region 또는 전송 범위가 바뀌면 `OWNER`가 변경된 정책을 다시 확인한다.
- key 검증은 최소 비용의 전용 검증 요청 또는 Provider가 제공하는 안전한 인증 확인 방법으로 수행한다.
- 사용자는 언제든 key를 폐기하고 BYOK 사용을 중지할 수 있다.

#### 저장과 전달

- 브라우저가 key를 다시 조회하는 API를 제공하지 않는다. 등록 성공 뒤에는 마스킹된 식별 정보만
  반환한다.
- key는 애플리케이션 평문 컬럼, 환경변수, 캐시, event payload, tracing attribute와 로그에 저장하지
  않는다.
- Provider key 원문은 Secret Manager에 저장하고 Private data plane에는 Workspace·Provider에 연결된
  Secret reference와 상태만 저장한다. Secret Manager 자체 암호화와 접근 정책에 더해 reference의
  무결성, key version과 회전 이력을 보존한다.
- 복호화는 승인된 AI Worker의 요청 시점 메모리에서만 수행하고 사용 직후 참조를 폐기한다.
- API·DB 운영 역할과 KMS 복호화 역할을 분리한다.
- Workspace 폐쇄, 사용자의 key 삭제와 보안 사고 시 Secret과 key reference를 삭제·폐기하고 감사한다.

#### 호출·과금 계약

- BYOK 호출의 Provider token 비용은 사용자의 Provider 계정에서 발생하므로 플랫폼 AI point를 차감하지
  않는다.
- Subscription은 Workspace 기능, 보안 처리, Evidence Packet, 출력 검증, 저장·협업·운영 기능의
  사용료로 유지한다. BYOK가 구독료를 면제하지 않는다.
- 플랫폼은 BYOK에서도 분당 요청, 동시 실행, 최대 입력·출력, 허용 모델과 월간 안전 상한을 적용할 수
  있다. 이는 Provider 비용 대신 가용성·보안·오류 폭주를 통제하기 위한 제한이다.
- BYOK usage에도 token·모델·기능·상태를 기록하되 Provider 청구 원가는 `customer billed`로 구분한다.
- BYOK key가 실패하거나 quota를 초과해도 플랫폼 key로 묵시적으로 fallback하지 않는다. 사용자에게
  실패와 선택지를 알리고, 명시적으로 플랫폼 point 사용을 승인한 새 요청만 플랫폼 key로 실행한다.
- 임의 base URL과 사설 IP endpoint는 MVP에서 허용하지 않는다. 지원 Provider의 고정 HTTPS endpoint와
  검증된 region allowlist만 사용해 SSRF와 자격 증명 탈취를 막는다.
- Workspace 멤버가 임의 모델명을 전달하지 못하도록 Provider별 model allowlist와 capability를 서버가
  소유한다.
- 생성과 embedding Provider·model을 Workspace AI 정책에 함께 고정한다. embedding model을 변경하면
  기존 vector와 차원이 같더라도 의미 공간이 호환된다고 간주하지 않고 해당 Workspace namespace를
  새 model version으로 재색인한다. 재색인 완료 전에는 서로 다른 embedding model의 vector를 한 검색에
  혼합하지 않는다.
- BYOK embedding 장애 시 플랫폼 embedding으로 자동 전환하지 않는다. 검색·RAG 기능을 degraded
  처리하고 사용자가 key·quota를 복구하거나 플랫폼 point 사용을 명시적으로 승인하게 한다.

BYOK는 데이터가 플랫폼을 거치지 않는다는 뜻이 아니다. 서버는 계속 Workspace 권한을 확인하고
Evidence Packet을 만들며 결과를 검증·저장한다. 사용자의 Provider 계약을 사용하더라도 플랫폼의
개인정보 최소화, 동의, 삭제와 감사 책임은 유지한다.

### 7. 구독 결제와 point pack 결제를 분리하되 같은 결제 경계를 사용한다

초기 국내 PG는 토스페이먼츠 자동결제를 우선 계약·심사 대상으로 사용하고 domain은
`BillingProviderPort` 뒤에 둔다. 계약·심사를 통과하지 못하면 동일한 port 계약을 만족하는 다른 PG를
선정한다. 특정 PG의 billing key, payment key와 SDK 타입을 domain/application 계층에 노출하지 않는다.

- 월·연 플랜은 각각 1개월·12개월 주기의 자동결제 Subscription charge다.
- 추가 point pack은 일회성 charge다.
- 카드 등록을 요구하는 무료 체험과 무료 종료 뒤 자동 유료전환은 제공하지 않는다.
- 브라우저 success URL만으로 구독·point를 지급하지 않는다. 서버 승인 응답 또는 검증된 Provider 상태가
  source of truth다.
- charge, cancel, refund에는 Provider와 내부 idempotency key를 사용한다.
- Webhook은 event ID를 unique하게 저장하고 중복·역순 이벤트에도 같은 최종 상태로 수렴한다.
- 여러 scheduler Pod가 같은 갱신을 중복 승인하지 않도록 기간별 charge unique key와 DB lease/lock을
  사용한다.
- 사용자가 구독을 해지하면 이미 결제한 기간 종료까지 entitlement를 유지하고 다음 갱신일부터 FREE로
  전환한다.
- 결제 실패는 최대 3회 재시도하고 최초 실패부터 7일의 grace period를 둔다. 유예기간 종료 뒤 FREE로
  전환하되 데이터·멤버·문서를 삭제하지 않는다.
- 월간 구독은 결제 후 7일 이내이고 유료 AI point와 유료 기능을 사용하지 않았으면 전액 환불한다.
  사용했거나 7일이 지났으면 남은 기간과 사용 혜택을 기준으로 운영자가 부분 환불을 심사한다.
  `환불 불가`를 기본 정책으로 두지 않으며 법정 청약철회·PG 기준이 더 유리하면 그 기준을 우선한다.
- 연간 구독 중도 환불은 사용한 개월을 해당 플랜의 월 정가로 계산하고, 최초 결제금액에서 그 금액을
  뺀 잔액을 환불한다. 계산 결과가 0원 이하이면 추가 청구하지 않고 환불액을 0원으로 제한한다.
- point pack은 해당 구매 원장에서 아직 남아 있는 구매 point의 비율만큼 결제금액을 환불한다. 이미
  사용한 구매 point와 월 포함 point는 환불 대상이 아니며, 환불 전에 대상 구매 point를 회수한다.
  일부 사용 주문의 환불 계산, point 회수와 Provider 취소 증빙은 immutable ledger에 남긴다.
- 자동 point 충전과 다음 달 point 선사용은 제공하지 않는다.

구독 상태는 `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `CANCEL_AT_PERIOD_END`, `CANCELED`로 관리한다.

### 8. 다운그레이드는 권한을 줄이되 데이터를 삭제하지 않는다

- 유료 한도를 넘는 기존 데이터·멤버·문서를 자동 삭제하지 않는다.
- 기존 데이터 조회와 AI를 사용하지 않는 PDF 다운로드는 허용한다.
- 신규 생성, 초과 멤버 초대, AI 실행과 파일 업로드처럼 원가·한도를 늘리는 mutation을 제한한다.
- 공개 페이지 유지 범위는 플랜 entitlement로 별도 결정하되 예고 없이 기존 공개본을 제거하지 않는다.
- 재구독하면 보존된 데이터와 권한을 복구한다.
- Workspace 폐쇄·Account 탈퇴에 따른 개인정보 삭제는 결제 해지와 분리하고 기존 purge 계약을 따른다.

### 9. 비용 폭주를 point 잔액만으로 통제하지 않는다

다음 방어를 함께 적용한다.

- Workspace·사용자별 분·일·월 사용량 한도
- 세션별 누적 token·원가 상한
- 동시 실행 제한과 동일 요청 deduplication
- Provider별 timeout, 제한된 retry와 circuit breaker
- 고가 모델 별도 allowlist와 Workspace OWNER 정책
- 플랫폼 일간·월간 비용 hard limit와 emergency stop
- 결제·point reserve와 AI job의 reconciliation
- 비정상 다중 계정·다중 Workspace 무료 사용 탐지

Workspace 사용량이 예산의 70%·90%·100%에 도달하면 알림을 제공한다. BUSINESS의 멤버별 AI 예산과
허용 모델은 `OWNER`만 설정한다. BUSINESS는 OWNER에게 Workspace 전체·멤버별 사용량, 예산, 허용 모델과
BYOK 사용 상태를 제공한다. 운영자는 프롬프트·응답 원문 없이 집계·상태·reason code로 장애와 비용을
진단한다.

## 개념 데이터 모델

구현 시 책임을 다음 aggregate와 원장으로 분리한다. 실제 migration 이름과 컬럼은 구현 착수 시 현재
Flyway 기준선과 충돌 여부를 다시 확인한다.

| 모델 | 책임 |
| --- | --- |
| `billing_plan` | versioned 플랜·가격·주기 catalog |
| `plan_entitlement` | 기능, 좌석, 저장량, AI point 등 권리 |
| `workspace_subscription` | Workspace의 플랜·기간·상태·해지 예약·가격 snapshot |
| `billing_customer` | Workspace와 Provider customer 연결 |
| `billing_payment_method` | 암호화된 billing key·마스킹 메타데이터 |
| `billing_charge` | 갱신·point pack 주문과 멱등 상태 |
| `billing_payment` | 승인·취소·환불 Provider 거래 |
| `billing_webhook_event` | Webhook inbox·중복 방지·재처리 |
| `subscription_seat_addon` | 추가 좌석 수·일할 결제·다음 갱신 제거 예약 |
| `ai_usage` | 기능·모델·token·원가·BYOK 여부·결과 상태 |
| `ai_point_ledger` | grant·reserve·commit·release·expire·refund 원장 |
| `provider_price` | 시점별 모델 가격·환율·region 할증 version |
| `workspace_ai_provider_credential` | BYOK Provider·Secret reference·상태·회전 이력 |
| `workspace_ai_policy` | 허용 모델·멤버 한도·예산·fallback 정책 |

잔액과 구독 상태는 임의 update가 아니라 원장·상태 전이를 통해 변경한다. 운영자 조정도 사유, actor,
대상 Workspace, 이전·이후 값과 감사 이벤트를 남긴다.

## 출시 순서와 게이트

1. Workspace 유형을 `PERSONAL`과 `ORGANIZATION` 축으로 확정하고 기존 `TEAM` 값을 조사한다.
2. Provider 응답의 실제 token usage와 기능별 shadow cost를 2~4주 계측한다.
3. 결제 없이 plan, entitlement, AI point reserve/commit/release와 downgrade를 검증한다.
4. FREE 기능별 월 1개 세션·보정 3회와 유료 point 기반 무제한 보정 UX를 검증한다.
5. PG sandbox에서 최초 결제, 갱신, 실패, 해지, 환불, point pack과 Webhook 멱등성을 검증한다.
6. 서로 다른 두 Workspace의 구독·결제·AI 잔액·BYOK key 교차 접근을 404로 차단한다.
7. 다중 Pod 갱신, Provider timeout, 응답 불명, 중복 Webhook과 reconciliation을 검증한다.
8. OpenAI·Anthropic·Gemini BYOK를 모든 플랜에 flag로 도입하고 생성·embedding key 등록·회전·폐기,
   no-fallback, 재색인, endpoint allowlist와 로그 비노출을 검증한다.
9. 실제 P95 원가, 사용률, PG 수수료, 부가세, 인프라와 지원 비용으로 확정 가격·point의 지속 가능성을
   검증한다. 정책 변경이 필요하면 이 ADR을 명시적으로 개정하고 기존 구독 가격을 소급 변경하지 않는다.
10. 사용자 약관·환불·정기결제·AI 처리·BYOK 책임 안내와 운영 runbook을 확정한 뒤에만 운영 flag를
    활성화한다.

다음 항목을 통과하기 전에는 운영 결제를 열지 않는다.

- OWNER 외 결제·BYOK mutation 차단과 최근 재인증
- 구독·point·결제·BYOK의 교차 Workspace 격리
- 중복 결제·중복 point 지급 방지
- 실패 AI point 반환과 응답 불명 reconciliation
- 해지·downgrade 뒤 데이터 보존과 신규 원가 mutation 제한
- Secret·billing key·BYOK key·프롬프트·응답의 로그 비노출
- Provider key 폐기와 Workspace purge 전파
- 운영 비용 hard limit와 emergency stop
- sandbox 전체 E2E와 승인된 소액 실결제·취소·환불 smoke test

## 결과와 트레이드오프

### 장점

- 개인·기업·팀 소개를 같은 tenant·발행 기반에서 지원하면서 요금제와 콘텐츠 유형을 결합하지 않는다.
- 무료 사용자는 결과물을 충분히 보정해 제품 가치를 확인하고 유료 사용자는 인위적인 보정 횟수 제한을
  받지 않는다.
- 실제 LLM 원가와 point를 연결해 모델·환율 변경과 고급 모델 선택을 흡수할 수 있다.
- BYOK 조직은 기존 Provider 계약을 활용하면서도 플랫폼의 Workspace 격리·Evidence Packet·감사 경계를
  유지한다.
- 플랫폼 key fallback을 명시적으로 통제해 사용자가 예상하지 않은 비용·데이터 이전을 막는다.

### 비용과 복잡도

- 횟수 정액제보다 usage 계측, 가격 version, reserve/commit 원장과 reconciliation 구현이 복잡하다.
- 유료 보정에 횟수 제한이 없어 세션·Workspace·플랫폼 비용 hard limit가 필수다.
- BYOK는 Secret 암호화, Provider별 capability, 사용자 지원과 개인정보 고지 범위를 늘린다.
- Workspace 유형 확장은 개인용 도메인을 기업용으로 재사용하지 않는 추가 콘텐츠 모델이 필요하다.

## 보류한 대안

- `유료 플랜 AI 무제한`: 변동 원가와 자동화 남용을 통제할 수 없어 보류한다.
- `모든 요청 1회 차감`: 짧은 보정과 전체 생성의 원가 차이를 반영하지 못해 보류한다.
- `유료 보정 최대 N회`: point 잔액이 있는데도 결과물 완성을 막으므로 채택하지 않는다.
- `Workspace 유형별 플랜 강제`: 작은 조직과 고급 개인 사용자를 수용하지 못해 채택하지 않는다.
- `BYOK 실패 시 플랫폼 key 자동 전환`: 예상하지 않은 플랫폼 비용과 데이터 처리 경로 변경을 만들므로
  금지한다.
- `사용자 지정 base URL`: SSRF·자격 증명 탈취·Provider 검증 우회 위험 때문에 MVP에서 금지한다.
- `초기 자체 GPU 상시 운영`: 현재 예상 트래픽에서는 온디맨드 API보다 고정비와 운영 부담이 커서
  보류한다. 실제 월간 작업량과 보안 요구가 손익분기점을 넘을 때 다시 평가한다.

## 확정 정책을 구현하기 전에 확인할 외부·기술 항목

아래 항목은 제품 정책 선택이 아니라 확정 정책을 안전하게 구현하기 위한 조사·검증 사항이다.

- 기존 `WorkspaceType.TEAM` 저장 행과 참조 코드를 조사하고 `ORGANIZATION` 이관 migration을 작성한다.
- 기능별 실제 token·P95 원가를 계측해 point 가중치, 최소 예약 단위와 기능별 최대 음수 허용량을
  산출한다.
- 토스페이먼츠 자동결제·연 결제·좌석 일할 결제 계약 가능 여부와 Webhook·환불 API를 확인한다.
- 법정 청약철회, 일부 사용 구독·point pack 환불, 세금계산서·현금영수증 절차를 법률·세무·PG 기준에
  맞춰 사용자 약관과 운영 runbook으로 구체화한다.
- OpenAI·Anthropic·Gemini의 지원 region·생성 모델·embedding 모델 allowlist와 usage 응답 계약을
  확인한다.
- 운영 Secret Manager adapter, BYOK reference 무결성, key 회전·폐기와 embedding 재색인 rehearsal을
  검증한다.
