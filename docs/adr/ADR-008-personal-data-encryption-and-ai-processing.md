# ADR-008: 개인정보 암호화와 AI 처리 보안 경계

- 상태: Accepted (정책 확정, 단계적 구현 중)
- 기준일: 2026-08-21
- 승인일: 2026-08-21
- 적용 범위: 개인정보 분류, 애플리케이션 암호화, AI 처리·동의, 관리자 접근, 비공개 파일,
  Secret IAM, 감사, 보존·삭제와 내부 통신
- 관련 문서: [ADR-001](./ADR-001-saas-security-multitenancy.md),
  [ADR-006](./ADR-006-private-data-plane-and-public-projection.md),
  [ADR-007](./ADR-007-workspace-subscription-ai-usage-and-customer-api-key.md)
- 구현 상태: Workspace 격리, 제한된 Support Access, AI 처리 동의, usage 원장, Provider Router,
  OCI Vault 기반 사용자 제공 AI API 키 보관과 purge 기반은 구현됐다. 비공개 베타의 사용자 제공 AI API 키는 플랫폼 운영자와
  지정 테스트 Workspace에만 열며 OCI BASIC_CLUSTER의 정확한 노드 instance principal에 한정한다.
  신규 Argon2id 저장·기존 BCrypt 성공 인증 시 점진 재해시와 Pod seccomp·non-root·capability 제거,
  ingress NetworkPolicy도 구현됐다. 필드별 Workspace DEK, 내부 mTLS, WORM 감사와 외부 목적지 egress
  통제는 이 ADR의 후속 강화 항목으로 남아 있고 완료된 것으로 간주하지 않는다.

## 배경

Self-Intro는 이메일·전화번호·주소 같은 직접 식별자뿐 아니라 경력, 학습, 역량, 자기소개서,
지원 기록과 AI 생성 결과를 저장한다. 경력과 경험은 이름을 제거해도 회사, 기간, 역할, 프로젝트,
성과와 결합하면 개인을 식별할 수 있으므로 개인정보로 다룬다.

플랫폼 관리자에게 운영 역할이 있다는 이유로 다른 Workspace의 원문을 열어 주거나, AI가 경력 DB를
직접 조회하게 하면 최소 권한·목적 제한·사용자 통제가 깨진다. 외부 AI Provider를 기업용 API로
바꾸거나 사용자 제공 AI API 키를 사용하더라도 플랫폼이 어떤 정보를 선택해 전송했고 누가 동의했는지에 대한 책임은
남는다.

암호화는 데이터 유출의 영향을 줄이는 방어 수단이지 권한 검증, 최소 수집, 로그 비노출, 삭제와
감사를 대체하지 않는다. 반대로 모든 컬럼을 동일한 방식으로 암호화하면 검색·유일성·정합성과 키 회전이
깨질 수 있으므로 데이터 유형별로 저장·검색·파생·공개 계약을 나눈다.

## 결정

### 승인된 운영 기본값

다음 값은 제품·보안 기준선으로 승인한다. 법률·세무·PG 검토 결과 더 긴 법정 보존기간이나 더 강한
통제가 필요한 경우에는 그 기준을 우선하고, 변경 근거와 적용일을 data retention schedule과 운영
가이드에 기록한다.

| 항목 | 승인 기준 |
| --- | --- |
| AI 임시 원문 | Prompt, Evidence Packet과 Provider raw response는 영속 저장하지 않는다. 장애 복구에 임시 저장이 불가피하면 암호화하고 완료 시 즉시 삭제하며 최대 TTL은 24시간이다. |
| 법정·운영 보존 | 결제·계약·유료 point 최소 원장은 5년, 소비자 불만·분쟁 기록은 3년, 표시·광고 기록은 6개월을 기준으로 분리 보존한다. 개인정보처리시스템의 개인정보취급자 접속기록은 최소 1년, 법정 가중 조건에 해당하면 최소 2년 보존한다. Workspace 원문과 backup은 ADR-001의 폐쇄 후 30일 유예·purge 계약을 따른다. |
| Argon2id | 신규 hash의 최소 기준은 `m=19 MiB`, `t=2`, `p=1`이다. 운영 배포 전 목표 응답시간과 동시 로그인 메모리를 부하 시험해 가능한 경우 상향한다. 기존 BCrypt는 성공 로그인 시 점진적으로 재해시한다. |
| Workspace DEK | Workspace마다 활성 DEK 1개와 version 이력을 둔다. 평문 DEK cache는 메모리 전용·Workspace scope·최대 TTL 5분으로 제한한다. 정기 회전 주기는 최대 1년이며 침해 의심, key 노출 또는 암호 정책 변경 시 즉시 회전한다. 폐쇄 30일 뒤 purge와 함께 wrapped key reference를 폐기한다. |
| WORM 감사 | cloud-neutral append-only/WORM sink를 사용하고 현재 OCI adapter에서는 사용자 콘텐츠와 분리된 전용 Object Storage bucket을 사용한다. 개인정보 원문, Prompt와 Evidence Packet은 넣지 않는다. 기본 보존은 1년이며 법정 가중 조건이면 2년 이상으로 설정한다. OCI retention lock은 별도 bucket에서 14일 이상 검증한 뒤 적용한다. |
| OWNER MFA | 일반 사용 전체에 일괄 강제하지 않고 사용자 제공 AI API 키 등록·교체·폐기, 결제수단 변경, 소유권 이전, 멤버 권한 변경, 전체 내보내기와 Workspace 삭제에 step-up MFA를 의무화한다. 조직·Business Workspace OWNER는 해당 기능을 활성화하기 전에 MFA를 등록해야 한다. |

이 승인은 암호화·AI 처리의 목표 정책을 확정한 것이며 구현·migration·OCI 설정·법률 검토가 완료됐다는
뜻은 아니다. 각 기능은 아래 출시 게이트를 통과한 뒤 운영 flag를 연다.

### 1. 개인정보를 목적과 영향도에 따라 분류한다

ADR-001의 `PUBLIC`, `INTERNAL`, `SENSITIVE_PII`, `SECRET` 분류를 다음 처리 기준으로 구체화한다.
사용자가 공개한 정보도 개인정보 성격을 잃지 않으며, 공개 projection에서만 제한적으로 제공한다.

| 등급 | 예시 | 기본 처리 |
| --- | --- | --- |
| `PUBLIC` | 사용자가 발행한 표시 이름, 공개 경력 snapshot | Public projection에서만 제공, 공개 중지·삭제 전파 |
| `INTERNAL` | Workspace ID, 기능 설정, 제한된 사용량 메타데이터 | Workspace 격리, 최소 로그, 전송 목적 제한 |
| `SENSITIVE_PII` | 이메일, 전화번호, 주소, 위치, 비공개 경력·학습·지원·자소서·AI 결과 | 애플리케이션 암호화 대상, 원문 접근 제한, AI 최소 전송 |
| `SECRET` | 비밀번호 검증값, MFA secret, 복구 코드, 세션·초대 token, PG·Provider·사용자 제공 AI API 키 | 단방향 검증 또는 Secret Manager, 원문 조회 API 금지 |

새 필드와 파일 유형은 저장 전에 다음 정보를 data inventory에 등록한다.

- 소유 범위: Account, Workspace, Platform Shared, Platform Operations
- 분류와 처리 목적
- 원문이 필요한 주체와 API
- 검색·유일성 요구
- AI·외부 사업자 전송 가능 여부
- 보존기간, 삭제 trigger와 파생 데이터
- 공개 projection 허용 여부

분류되지 않은 필드는 외부 전송·공개·운영자 조회를 기본 거부한다.

### 2. 암호화는 전송·저장·필드 계층을 함께 적용한다

모든 외부·내부 연결은 TLS를 사용하고, 저장소의 provider-managed encryption at rest를 활성화한다.
고영향 개인정보에는 애플리케이션 계층 암호화를 추가한다.

#### 애플리케이션 암호문 형식

- 알고리즘: `AES-256-GCM`
- nonce/IV: 암호화마다 CSPRNG로 새 96-bit 값을 생성하며 재사용하지 않는다.
- 인증 tag를 반드시 검증하고 실패를 평문·빈 값으로 대체하지 않는다.
- 암호문과 함께 `algorithm`, `keyVersion`, `iv`, `ciphertext`를 versioned envelope로 저장한다.
- AAD에는 최소 `workspace/account scope`, 테이블·aggregate, record ID, field name과 schema version을
  포함해 다른 행·필드로 암호문을 옮겨도 복호화되지 않게 한다.
- 암호화 key와 검색용 HMAC key는 분리한다.

#### 데이터 유형별 정책

| 데이터 | 저장·검증 정책 |
| --- | --- |
| 이메일 | AES-256-GCM 암호문 + 정규화 값의 HMAC-SHA256 blind index. 검색·유일성은 blind index로 처리 |
| 전화번호·주소·좌표 | AES-256-GCM. 꼭 필요한 정규화·검색 파생값만 별도 목적과 보존기간을 갖고 저장 |
| 경력·학습·역량·자소서·지원 문서·AI 결과 | 목표 구조에서 Workspace별 DEK로 envelope encryption. 공개본은 별도 최소 projection |
| MFA TOTP secret | 기존 AES-GCM 계약을 key version·AAD·회전 가능 형식으로 유지 |
| 비밀번호 | 복호화 불가능한 password hash. 목표 알고리즘은 Argon2id이며 기존 BCrypt는 성공 로그인 시 점진적 재해시 |
| 복구 코드·이메일 확인·초대·비밀번호 재설정 token | 원문 저장 금지. 충분한 entropy의 token을 hash/HMAC으로 검증하고 1회 사용·만료 적용 |
| PG·플랫폼 Provider·사용자 제공 AI API 키 | 애플리케이션 컬럼에 평문·복호화 가능 암호문으로 보관하지 않고 Secret Manager reference만 저장 |

전체 Workspace 콘텐츠 암호화는 검색, 정렬, Hibernate dirty checking, migration, backup 복구와 공개
projection에 영향을 주므로 한 번에 적용하지 않는다. data inventory와 dual-read/backfill 검증을 거쳐
도메인별로 전환하며, 적용되지 않은 필드를 암호화 완료로 표시하지 않는다.

### 3. Workspace별 envelope encryption과 키 수명주기를 사용한다

민감한 Workspace 원문용 목표 구조는 다음과 같다.

```text
KMS/Vault KEK
  → Workspace DEK를 wrap/unwrap
  → Workspace SENSITIVE_PII 필드 암호화
```

- Workspace마다 독립 DEK 또는 동일한 격리 효과를 제공하는 versioned data key scope를 사용한다.
- DB에는 wrapped DEK reference와 key version만 저장하고 KEK·평문 DEK를 저장하지 않는다.
- unwrap은 승인된 Private API/Worker가 요청 처리 중 메모리에서만 수행한다.
- API·DB 운영 권한과 KMS decrypt 권한을 분리한다.
- key cache가 필요하면 짧은 TTL, 크기 상한, Workspace scope를 적용하고 로그·heap dump·tracing에
  key material을 남기지 않는다.
- 회전은 새 쓰기 key 전환, bounded 재암호화, 진행률·실패 reconciliation, 구 key 폐기 gate 순으로 한다.
- Workspace 폐쇄 시 즉시 key 사용을 중지하고, 유예기간 뒤 원본·파생 데이터 purge와 함께 wrapped
  key reference를 폐기한다. 결제·법정 원장은 별도 최소 데이터로 보존한다.

KMS 장애 시 평문 fallback을 허용하지 않는다. 민감 데이터 쓰기·읽기는 fail closed하고 기존 공개
projection처럼 KMS가 필요 없는 별도 경계만 제공한다.

### 4. AI는 DB를 직접 읽지 않고 일회성 Evidence Packet만 받는다

AI Provider와 모델에는 DB credential, repository, 임의 SQL·검색 tool을 제공하지 않는다. 서버가
Workspace 권한, 작업 목적과 사용자가 선택한 source를 검증한 뒤 allowlist 기반 Evidence Packet을
만든다.

Evidence Packet은 식별정보를 무조건 줄이는 요약본이 아니라, 식별자는 최소화하면서 결과 정확도에
필요한 근거를 구조화한 파생본이다.

```text
원본 Workspace 데이터
  → Membership·artifact 소유권 확인
  → 목적별 field allowlist
  → 직접 식별자 제거·가명화
  → 문제·제약·행동·트레이드오프·성과·근거 ID 유지
  → 전송 전 PII 검사
  → Provider 호출
  → 출력 사실·PII 검사
  → 필요한 식별자는 서버가 로컬에서 결정적으로 재삽입
```

Evidence Packet에는 다음을 적용한다.

- `workspaceId`, 내부 PK, 이메일, 전화번호, 주소, 인증정보, Secret과 내부 URL은 Provider에 보내지 않는다.
- 회사·고객·사람 이름, 정확한 날짜와 희소한 수치는 목적에 필요하지 않으면 placeholder 또는 범위로
  변환한다.
- 문제, 제약, 선택지, 기술적 행동, 트레이드오프, 검증된 결과와 evidence ID는 정확도를 위해 유지한다.
- source ID는 Provider가 원본을 역조회할 수 없는 요청 범위 opaque ID로 치환한다.
- Packet schema·정책 version, 포함된 데이터 범주, source snapshot hash와 생성 시각을 기록한다.
- 원문 Packet은 기본적으로 영속 저장하지 않는다. 재현에는 원문 대신 version·hash·허용 범주와
  evidence 연결을 사용한다.
- 정보가 부족하면 모델은 임의 조회 대신 제한된 `NEED_MORE_EVIDENCE` 응답을 반환하고 서버가 같은
  권한·allowlist 검사를 거쳐 추가 Packet을 만든다.

시스템 prompt나 긴 대화 history도 Provider에 전달되는 입력이므로 동일한 개인정보 정책을 적용한다.

### 5. OWNER 정책 확인과 실행 사용자 동의를 분리한다

Workspace `OWNER`는 허용 Provider, 모델 등급, 처리 region, 사용자 제공 AI API 키 사용, 멤버별 예산과 데이터 전송
범주 상한을 정한다. 이 설정은 조직 정책이지 개별 AI 작업에 포함된 개인정보 주체의 동의를 대신하지
않는다.

AI 실행 사용자는 Provider 호출 전에 다음을 확인할 수 있어야 한다.

- 작업 목적과 결과물
- 플랫폼 관리 key, Workspace 사용자 제공 AI API 키 또는 local/self-hosted 중 실제 처리 경로
- Provider, 모델, 처리 region·국가와 공개된 보존 정책
- 전달할 데이터 범주와 제외되는 데이터
- 예상 point 범위와 사용자 제공 AI API 키의 고객 직접 청구 여부
- 적용되는 AI 처리·Evidence Packet 정책 version

다른 사람의 경력·프로필을 처리하는 경우 해당 사용자가 처리 권한을 갖는지 별도 확인한다. 주소,
연락처, 인증정보와 Secret처럼 작업에 불필요하거나 금지된 데이터는 사용자가 동의해도 전송하지 않는다.

Provider, region, 플랫폼/사용자 제공 AI API 키 경로, 전송 범주 또는 정책의 중요한 내용이 바뀌면 OWNER 정책 확인과
실행 사용자 고지 version을 갱신한다. 단순한 버튼 클릭 기록이 아니라 actor, Workspace, 목적,
Provider·region, 데이터 범주, 정책 version과 시각을 감사 가능한 형태로 남긴다. 동의 기록에도 원문
경력이나 Prompt를 저장하지 않는다.

### 6. AI 보안 검사와 point 정산은 하나의 실행 경계를 사용한다

ADR-007의 구독·point 정책과 이 문서의 개인정보 정책은 다음 순서로 한 번만 구현한다.

```text
Workspace 권한·artifact 검증
  → 실행 사용자 고지·동의 검증
  → Evidence Packet 생성·입력 PII 검사
  → 예상 point/무료 session 예약
  → AiProviderRouter 정책 결정
  → Provider 호출
  → 출력 사실·PII 검사
  → 성공 결과 저장과 실제 point 확정
```

- Provider 호출 전에 권한·동의·PII 정책으로 차단되면 point와 무료 session을 차감하지 않는다.
- Provider·플랫폼 장애 시 사용자 point 예약을 반환한다.
- Provider 비용은 발생했지만 플랫폼 출력 검증 실패로 안전한 결과를 제공하지 못하면 사용자 point는
  반환하고 실제 원가는 `ai_usage`에 플랫폼 부담으로 기록한다.
- 사용자 취소가 Provider 호출 완료 뒤 발생한 경우 ADR-007의 고지된 실제 사용량 정산 정책을 따른다.
- 검증 실패를 이유로 무제한 자동 재호출하지 않는다. 기능별 retry·token·원가 상한을 서버가 소유한다.
- 마지막 작업의 잔액 초과 완료도 기능별 최대 token·원가 상한 안에서만 허용한다.

`ai_usage`에는 Provider, model, region, 사용자 제공 AI API 키 사용 여부, token, retry, 원가 snapshot, 제한된 결과 코드,
Evidence Packet·동의 version만 기록한다. Prompt·응답·Packet 원문, 이메일, Workspace 이름, Provider
오류 본문 전체와 key는 저장하지 않는다.

### 7. Provider 호출은 중앙 라우터와 명시적 정책을 통과한다

모든 생성·embedding 호출은 개별 서비스에서 Provider client를 직접 호출하지 않고 공통
`AiProviderRouter` 경계를 통과한다.

```text
AiProviderRouter
├─ PLATFORM_MANAGED
│  ├─ OCI Generative AI
│  ├─ NVIDIA
│  ├─ Local Self-hosted
│  └─ Platform OpenAI·Anthropic·Gemini
└─ 사용자 제공 AI API 키
   ├─ OpenAI
   ├─ Anthropic
   └─ Gemini
```

- Workspace 정책, Provider·region allowlist, model capability, 데이터 민감도, 동의 version, point와
  rate limit을 확인한 뒤 route를 결정한다.
- 요청이 model name이나 base URL을 직접 신뢰하게 하지 않는다.
- 사용자 제공 AI API 키 실패·quota 초과·embedding 장애 시 플랫폼 key나 다른 Provider로 자동 fallback하지 않는다.
- 처리 경로 변경은 사용자가 새 요청에서 명시적으로 승인한다.
- 계약·공개 정책상 고객 입력 학습 금지, 필요한 보존 통제, DPA와 처리 region을 확인한 Provider·제품만
  민감한 Evidence Packet allowlist에 등록한다.
- Provider 브랜드가 아니라 제품, endpoint, 기능과 계약 단위로 보존·학습·region 정책을 versioning한다.
- 로컬/self-hosted 모델도 같은 Evidence Packet·권한·감사·출력 검증을 적용한다. 외부 이전이 없다는
  이유로 DB 직접 접근이나 로그 원문 저장을 허용하지 않는다.

ADR-007에서 초기 자체 GPU 상시 운영은 비용상 보류한다. Local Self-hosted route는 향후 실제 사용량과
보안 요구가 손익분기점을 넘은 뒤 별도 운영 gate를 통과할 때 활성화한다.

### 8. 사용자 제공 AI API 키와 결제 Secret은 서비스별 IAM으로 분리한다

Secret은 cloud-neutral `SecretProvider` port 뒤에 두며 OCI Vault, AWS Secrets Manager, Azure Key
Vault 같은 adapter로 교체할 수 있게 한다.

| 주체 | 허용 | 금지 |
| --- | --- | --- |
| API 서버 | Secret reference·상태 저장, 사용자 권한 검증 | Provider·PG key 원문 복호화 |
| AI Worker | 승인된 요청의 AI Provider/사용자 제공 AI API 키를 호출 시점에 사용 | PG secret·billing key 접근 |
| Billing Worker | PG secret·billing key를 결제 작업에 사용 | AI Provider/사용자 제공 AI API 키 접근 |
| 플랫폼 관리자 | Provider, 상태, masked fingerprint, 마지막 검증 시각 확인 | key 원문 조회·복사·다운로드 |

- 브라우저에 key 재조회 API를 제공하지 않는다.
- key를 평문 DB 컬럼, 환경변수 dump, cache, queue/event payload, DLQ, tracing attribute와 로그에
  저장하지 않는다.
- key 등록·교체·폐기는 OWNER의 최근 재인증과 보안 감사를 요구한다.
- 복호화한 key는 요청 메모리에서만 사용하고 장기 cache하지 않는다.
- 소유권 이전 시 결제수단과 사용자 제공 AI API 키를 중지하고 새 OWNER의 재확인 전 자동 승계하지 않는다.
- Workspace 폐쇄, key 삭제와 사고 대응 시 Secret version과 reference를 폐기하고 결과를 감사한다.

플랫폼 공용 Provider key와 PG secret을 Kubernetes Secret로 주입하는 현재 경로가 남아 있다면 이는
전환 대상이다. Vault adapter와 workload identity가 검증되기 전까지 Secret Manager 완료로 표현하지
않는다.

### 9. 파일은 비공개 원본과 공개 projection을 분리한다

- 업로드와 AI 생성 초안 파일은 private-by-default다.
- object key는 검증된 `workspaces/{workspaceId}/...` namespace와 목적 scope를 포함한다.
- 브라우저에는 짧은 만료시간의 목적 제한 signed URL만 제공하고 URL을 로그·감사 payload에 남기지 않는다.
- MIME header만 신뢰하지 않고 크기, magic bytes, 실제 decoding과 허용 포맷을 검사한다.
- 악성 파일 검사가 필요한 유형은 격리 bucket/prefix에서 검사 완료 뒤 private 원본으로 승격한다.
- 공개 발행은 원본 bucket ACL을 변경하지 않고, allowlist와 source version을 검증한 projection만 공개
  bucket으로 복사한다.
- 공개 중지는 공개 pointer, projection object와 CDN/cache를 무효화한다.
- object version, delete marker, multipart upload와 파생 PDF·thumbnail도 Workspace purge inventory에
  포함한다.

### 10. 관리자와 지원 인력은 원문을 기본적으로 볼 수 없다

플랫폼 역할은 다른 Workspace의 개인정보 열람 권한이 아니다. 현재 구현된 Support Access의 사용자
요청·승인·범위·15~60분 만료·읽기 전용·감사 경계를 유지한다.

- 일반 운영 화면에는 상태, 건수, 제한된 reason code와 비식별 집계만 표시한다.
- Support Access도 승인된 진단 목적에 필요한 최소 필드만 제공하고 일괄 다운로드·검색을 허용하지 않는다.
- 원문 접근이 정말 필요한 미래 기능은 필드 범위, 사유, ticket/incident ID, 짧은 만료와 사용자 통지를
  별도 승인해야 하며 기존 Support Access에 묵시적으로 추가하지 않는다.
- break-glass는 일반 Support Access와 분리하고 최소 2인 승인, 사건번호, 기본 15분 만료, 명령·필드
  감사와 사후 사용자 통지를 요구한다. 구현 전에는 break-glass 경로를 제공하지 않는다.
- 감사 로그는 애플리케이션 운영자가 수정·삭제할 수 없는 append-only/WORM 저장소로 외부 전송하는 것을
  목표로 한다. 해당 sink가 검증되기 전에는 DB 감사 테이블만으로 WORM 완료를 주장하지 않는다.

### 11. 로그·관측·Queue에는 원문 개인정보를 남기지 않는다

- 애플리케이션 log, metric label, tracing span, audit payload, event, Queue와 DLQ에 Prompt·응답·Packet,
  이메일, 전화번호, 주소, Secret, signed URL과 Provider 오류 본문을 넣지 않는다.
- 식별이 필요한 경우 내부 불투명 ID 또는 회전·분리된 HMAC fingerprint를 사용한다.
- metric label에는 user/workspace처럼 cardinality가 높은 식별자를 사용하지 않는다.
- 오류는 code-owned 제한 reason code로 정규화하고 원문은 사용자 화면에도 그대로 반사하지 않는다.
- 운영 디버깅을 위한 원문 logging flag를 제공하지 않는다.
- 민감 event payload가 불가피한 기존 경로는 암호화보다 먼저 payload 최소화와 TTL·DLQ 삭제 계약을
  적용한다.

### 12. Vector와 파생 데이터도 개인정보 수명주기를 따른다

Embedding은 원문이 아니어도 개인 경력에서 파생되고 재식별·추론 가능성이 있으므로 Workspace
개인정보로 취급한다.

- Workspace vector는 `(workspaceId, sourceId, modelVersion)`으로 격리한다.
- 원문 chunk, 이메일, 전화번호, 사람 이름과 인증 식별자를 vector metadata에 저장하지 않는다.
- 서로 다른 embedding model의 vector를 같은 검색 공간에 혼합하지 않는다.
- Provider/model 변경은 새 namespace 재색인, shadow 검증, read 전환, 구 namespace 삭제 순으로 한다.
- 사용자 제공 AI API 키 기반 embedding 실패 시 플랫폼 embedding으로 자동 전환하지 않는다.
- 원본 삭제·Workspace purge 시 vector, cache와 검색 파생 결과 삭제를 재검증한다.

### 13. 삭제 가능한 원문과 보존해야 하는 최소 원장을 분리한다

AI 작업 완료 후 일회성 Evidence Packet과 Provider raw response는 영속 보존하지 않는다. 사용자가
저장한 AI 결과는 Workspace artifact로 분류해 암호화·revision·삭제 정책을 적용한다.

Workspace 폐쇄 시 즉시 접근과 Provider key 사용을 중지하고 ADR-001의 30일 유예·purge checkpoint
계약을 따른다. 다음 데이터는 object, vector, cache, queue와 backup까지 inventory에 포함한다.

- 사용자 제공 AI API 키 비밀값과 참조 정보
- Evidence Packet·Prompt·Provider raw response의 임시 데이터
- 비공개 AI 결과·문서·파일과 파생 PDF·thumbnail
- Workspace vector·검색 snapshot과 cache
- 공개 projection·CDN cache

다음 데이터는 환불, 회계, 분쟁, 보안과 법적 의무에 필요한 최소 형태로 별도 보존할 수 있다.

- 결제 승인·취소·환불과 세금·영수증 자료
- AI point grant·reserve·commit·release·expire·refund 원장
- Provider·model·region·token·원가 snapshot과 제한된 결과 code
- 동의·정책 version, 보안 사건과 purge 완료 증적

보존 원장에는 Prompt·응답·경력 원문, 이메일, Workspace 이름, object key와 Secret을 넣지 않는다.
Workspace·사용자 FK를 영구 유지할 필요가 없으면 purge 과정에서 불투명 보존 key로 치환하거나 nullable
처리한다. 정확한 법정 보존기간은 출시 전 법률·세무·PG 검토를 거쳐 data retention schedule과 운영
가이드에 기록한다.

Backup은 운영 key와 분리된 key·권한을 사용하고 보존 상한을 purge 정책과 조정한다. 복원은 폐쇄·삭제
상태와 Secret 폐기를 되살리지 않도록 maintenance 환경에서 reconciliation한 뒤 공개한다.

### 14. 내부 서비스와 배포 환경도 최소 권한을 적용한다

목표 운영 경계는 다음과 같다.

- API↔AI Worker, API↔Billing Worker, gRPC, Redis와 RabbitMQ 연결에 TLS를 적용하고 고위험 내부 호출은
  workload identity 기반 mTLS를 사용한다.
- Kubernetes NetworkPolicy로 Public API, Private API, AI Worker, Billing Worker, DB, Queue와 Secret
  provider의 통신 방향을 allowlist한다.
- Pod는 non-root, read-only root filesystem, privilege escalation 금지, 최소 Linux capability와
  seccomp profile을 사용한다.
- Public API 배포에는 Private DB, Vector DB, AI Provider, 사용자 제공 AI API 키와 PG Secret을 주입하지 않는다.
- AI Worker에는 결제 DB mutation과 PG Secret 권한을, Billing Worker에는 Workspace 콘텐츠와 AI key
  권한을 주지 않는다.
- egress는 승인된 Provider endpoint·region과 필수 인프라만 허용한다.

현재 내부 plaintext 경로나 broad egress가 남아 있으면 배포 manifest·인증서 회전·장애 복구를 함께
검증한 뒤 단계적으로 전환한다. 문서 선언만으로 mTLS·NetworkPolicy 완료로 표시하지 않는다.

## 정확도와 최소화의 균형

최소 전송은 가장 짧은 입력을 뜻하지 않는다. 식별과 목적에 불필요한 정보는 줄이되, AI가 사실에
근거한 결과를 만들기 위한 문제·제약·행동·트레이드오프·성과·근거는 유지한다.

출시 전 대표 경력·학습·포트폴리오 사례로 다음 세 입력을 같은 모델·설정에서 비교한다.

1. 기존 원문 입력
2. Evidence Packet 입력
3. 가명화 수준을 높인 Evidence Packet 입력

평가 항목은 필수 사실 포함률, 입력에 없는 주장 수, 수치·고유명사 오류, 개인정보 노출, 사용자 수정량과
비용이다. Evidence Packet이 기준 품질을 충족하지 못하면 DB 직접 접근으로 되돌리지 않고 field
allowlist와 구조를 보강한다.

## 구현 순서

1. ADR-007과 이 문서를 함께 검토해 상태·책임과 미확정 법률 항목을 승인한다.
2. 현재 branch/worktree, 최신 Flyway 번호와 운영 DB 적용 상태를 다시 확인한다.
3. 개인정보 data inventory, 로그·Queue·파일·vector flow와 기존 key 저장 위치를 작성한다.
4. 실제 token·원가와 현재 전송 payload를 2~4주 shadow 계측하되 원문은 기록하지 않는다.
5. 공통 AI 실행 경계, Evidence Packet, 동의 version, 입력·출력 검증과 `AiProviderRouter`를 구현한다.
6. `ai_usage`, point reserve/commit/release, Provider price snapshot과 실패 reconciliation을 ADR-007과
   하나의 migration·상태 전이로 구현한다.
7. SecretProvider port, AI/Billing Worker IAM 분리와 사용자 제공 AI API 키 등록·회전·폐기를 구현한다.
8. 이메일·연락처부터 field encryption과 blind index를 도입하고 dual-read/backfill·rollback을 검증한다.
9. Workspace 콘텐츠 envelope encryption을 도메인별로 확대하고 공개 projection·검색을 검증한다.
10. 파일 격리·악성 검사·공개 복사·삭제, vector 재색인·purge와 backup 복구를 검증한다.
11. 내부 TLS/mTLS, NetworkPolicy, Pod hardening과 egress allowlist를 단계적으로 활성화한다.
12. 운영 가이드, 사용자 AI 처리 안내, 개인정보 처리방침, 보존표와 사고 대응 runbook을 갱신한다.

마이그레이션 번호는 이 ADR에서 고정하지 않는다. 포트폴리오 브랜치와 진행 중인 변경을 통합하고 현재
Flyway·DB 상태를 확인한 뒤 다음 번호를 선택한다.

## 출시 게이트

다음 조건을 모두 통과하기 전에는 사용자 제공 AI API 키, 유료 AI point와 강화된 개인정보 처리를 운영 flag로 열지 않는다.

- 두 사용자·두 Workspace의 AI source, Packet, 결과, usage, point, key와 vector 교차 접근 404 테스트
- Provider 호출 전에 권한·동의·필드 allowlist와 point 예약 순서 검증
- 입력·출력 PII 검사 실패 시 미전송·미노출과 point 반환 검증
- 사용자 제공 AI API 키 실패·quota 초과·embedding 장애의 no-fallback 검증
- Prompt·응답·Packet·Secret·signed URL의 log, trace, metric, event, Queue·DLQ 비노출 검사
- 암호문 AAD 변조, key version, rotation, KMS 장애와 fail-closed 테스트
- OWNER 외 key mutation 차단, 최근 재인증, 소유권 이전 시 중지·재확인 테스트
- AI Worker/ Billing Worker/ API의 Secret·DB 권한 분리와 egress 정책 검증
- private upload·signed URL·악성 파일·public projection·공개 중지와 CDN 삭제 E2E
- Workspace 폐쇄 뒤 Secret, object, vector, cache, 공개본 purge와 최소 원장 비식별 보존 검증
- backup 복원 뒤 key·폐쇄·purge reconciliation rehearsal
- Provider별 DPA, 학습 사용, 보존, region, endpoint와 model allowlist 승인
- Evidence Packet 정확도·환각·개인정보 노출 회귀 평가
- 비용 hard limit, retry/circuit breaker, emergency stop과 point reconciliation 검증
- 운영 문서·사용자 고지·개인정보 처리방침·법정 보존기간 승인

## 결과와 트레이드오프

### 장점

- 관리자, 애플리케이션 계정 또는 외부 Provider 한 곳이 침해돼도 전체 개인정보 원문 노출 범위를 줄인다.
- AI 정확도에 필요한 근거는 유지하면서 직접 식별자와 목적 외 데이터를 최소화한다.
- 플랫폼 key, 사용자 제공 AI API 키와 local model이 동일한 권한·동의·감사·삭제 계약을 사용한다.
- 사용자 point와 실제 Provider 비용을 분리해 보안 실패를 사용자에게 부당하게 과금하지 않는다.
- 공개 projection, 비공개 원본, vector와 결제 원장의 수명주기를 명확히 분리한다.

### 비용과 복잡도

- 필드·Workspace별 암호화는 검색, 정렬, migration, backup, key rotation과 장애 복구를 복잡하게 한다.
- Secret Manager, KMS, WORM 감사, 악성 파일 검사와 mTLS 운영 비용이 추가된다.
- Evidence Packet과 출력 검증은 latency와 token을 늘릴 수 있고 품질 회귀 평가가 필요하다.
- 사용자 제공 AI API 키는 Provider별 오류·region·model·embedding 계약과 사용자 지원 범위를 늘린다.
- 원문을 로그에 남기지 않으므로 재현 가능한 제한 메타데이터와 deterministic test fixture가 중요해진다.

## 보류·금지한 대안

- AI의 경력 DB 직접 조회: 권한·목적·전송 범위를 모델에 위임하므로 금지한다.
- 관리자 상시 원문 조회: 운영 편의가 tenant 경계를 우회하므로 금지한다.
- 사용자 제공 AI API 키의 평문 또는 애플리케이션 DB 저장: 유출 반경과 원문 조회 가능성을 키우므로 금지한다.
- 사용자 제공 AI API 키 실패 시 플랫폼 key 자동 fallback: 예상하지 않은 비용·데이터 처리 경로를 만들므로 금지한다.
- 사용자 지정 base URL: SSRF·자격 증명 탈취 위험 때문에 MVP에서 금지한다.
- 모든 개인정보의 단일 전역 key 암호화: Workspace별 침해·폐기 경계를 제공하지 못하므로 채택하지 않는다.
- 암호화를 위해 검색 가능한 평문 shadow 컬럼 유지: 암호화 목적을 무력화하므로 금지한다.
- 디버그를 위한 Prompt·응답 원문 logging: 운영자·로그 시스템으로 노출 범위를 확장하므로 금지한다.
- 초기 자체 GPU 상시 운영: 현재 예상 사용량에서는 고정비가 커 ADR-007의 조건부 보류를 따른다.

## 구현 전 확정·검증할 항목

- 국내외 Provider 전송에 필요한 개인정보 처리·국외 이전 고지와 법적 근거
- Account, 세무·동의 증적 등 승인된 기본표에 포함되지 않은 데이터의 정확한 보존기간
- Argon2id 운영 부하 시험과 재해시 rollout 중단·복구 기준
- blind index 정규화, key rotation 중 unique·검색 호환 계약
- Workspace DEK rotation·backfill·crypto-shredding 리허설과 장애 복구 기준
- WORM 감사 저장소 IAM, 14일 이상 검증, retention lock과 법적 보존 예외 승인
- 사용자 원문 접근이 필요한 Support/break-glass의 실제 필요성과 승인 절차
- OWNER step-up MFA 대상 API 목록과 복구 절차 검증
- Provider·model·region별 민감도 allowlist와 계약 증적
- Local/self-hosted 모델의 목표 품질, GPU 손익분기점과 운영 격리
