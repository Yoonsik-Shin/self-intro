# Identity·Access 안정화 계획

- 기준일: 2026-08-11
- 상위 변경 세트: `03-identity-access`
- 원칙: 프런트 메뉴가 아니라 백엔드 인가와 데이터 상태를 보안 경계로 사용한다.

## 1. 하위 경계

`scripts/inventory-identity-access-changes.sh`가 상위 inventory의 Identity 경로를 다시 분류한다.

현재 108개는 Identity kernel 12, Auth·Session 14, MFA 6, 가입 초대 34, Workspace routing 17,
Membership·Ownership 15, Workspace lifecycle 5, Security audit 5로 분류되며 수동 미분류는 0이다.

| 순서 | 하위 경계 | 책임 | 핵심 검증 |
| ---: | --- | --- | --- |
| 0 | Identity kernel | Account·Workspace·role·status·repository 공통 모델 | 상태 전이·repository 계약 |
| 1 | Auth·Session | 로그인, `/me`, 재인증, 전체 로그아웃, fingerprint 이상 탐지 | stale account 거부, deny-by-default, 세션 무효화 |
| 2 | MFA | TOTP secret 암호화, 등록·확인, 운영 역할 로그인 challenge | 신규 로그인마다 TOTP, 원문 secret 비노출 |
| 3 | 가입 초대 | 운영자 초대, 이메일 확인, 동의, retention | 이메일 귀속, 폐기·만료, bounded cleanup |
| 4 | Workspace routing | 첫 Workspace, 현재 Workspace, 공개 slug·alias | 불투명 기본 slug, canonical redirect, 최근 재인증 |
| 5 | Membership | 참여 초대, 역할 변경, 제거, 소유권 이전 | OWNER 불변식, 타 Workspace 은닉, 이메일/token 비노출 |
| 6 | Lifecycle | 이름 변경, 자발적 탈퇴, Workspace 폐쇄 | OWNER 탈퇴 차단, 즉시 접근 차단, purge schedule 원자성 |
| 7 | Security audit | 성공·거부·이상 인증 감사 | 원문 이메일·IP·token 금지, 실패도 감사 |

## 2. 교차 파일

다음 파일은 단일 하위 경계로 기계적으로 나누면 안 된다.

- `AuthController`: 로그인·MFA·재인증·전체 로그아웃 endpoint가 한 controller에 있다. hunk를 나누더라도
  SecurityConfig와 통합 테스트를 같은 검증 단위로 둔다.
- `AuthService`: 로그인 성공 처리, session fixation 방어, MFA challenge가 연결된다.
- `SecurityConfig`: 공개 가입 endpoint, 인증 endpoint, 플랫폼 운영 endpoint, Workspace endpoint의
  deny-by-default 정책을 모두 소유한다. Identity 전체가 통과하기 전 독립 커밋하지 않는다.
- `MeResponse`: Account, 플랫폼 역할, Membership과 현재 Workspace를 함께 노출하므로 프런트 관리 셸과
  응답 호환성을 같이 확인한다.
- `Workspace`, `WorkspaceRepository`: onboarding·slug·publication·lifecycle·purge가 공유한다. schema와
  함께 검토하되 특정 UI 커밋에 포함하지 않는다.
- `SaasSecurityFoundationIntegrationTest`: 인증뿐 아니라 publication, Membership, lifecycle 및 콘텐츠
  격리까지 포함한 1,800줄 이상의 통합 gate다. 기능별 커밋으로 억지 분리하지 않고 Identity 변경 세트의
  최종 회귀 gate로 유지한다.

## 3. endpoint 보안 계약

- 공개 허용: CSRF bootstrap, 초대 기반 가입, 이메일 확인, 공개 Workspace slug resolution
- 인증 필요: `/api/auth/me`, 첫 Workspace onboarding, 참여 초대 수락·거절
- 최근 재인증 필요: Workspace slug·이름 변경, 멤버 역할 변경·제거, 소유권 이전, 폐쇄, 운영 초대 변경
- 플랫폼 역할 필요: `/api/ops/invitations`; Workspace 역할만으로 접근할 수 없다.
- Workspace 관리: slug path를 Membership으로 다시 resolve하고, 다른 Workspace는 403 대신 404로
  존재를 숨긴다.
- MFA: 플랫폼 운영 역할은 등록되지 않았으면 enrollment gate, 등록 뒤 새 로그인마다 TOTP challenge를
  통과해야 한다.

## 4. 검증 명령과 시나리오

Targeted backend gate:

```bash
cd backend
./gradlew :api:test \
  --tests com.selfintro.modules.auth.application.PlatformMfaIntegrationTest \
  --tests com.selfintro.modules.auth.SaasSecurityFoundationIntegrationTest
./gradlew :core:test \
  --tests com.selfintro.modules.identity.application.InvitationRetentionServiceTest \
  --tests com.selfintro.modules.identity.infrastructure.SmtpEmailVerificationSenderTest
```

최종 backend gate는 `./gradlew spotlessCheck test`다. 이후 실제 세션·CSRF를 사용하는
`scripts/e2e/workspace-isolation-compose.sh`로 두 일반 사용자와 두 Workspace의 교차 접근, 초대, 역할,
소유권 이전, 폐쇄를 확인한다. 프런트는 Prettier·TypeScript와 역할별 메뉴·직접 URL 접근을 모두 확인한다.

## 5. 다음 검토 순서

1. 완료: Auth·Session과 MFA의 deny-by-default·session fixation·재인증 경계
2. 완료: 가입 초대 token·이메일 귀속·retention
3. 완료: Workspace routing의 canonical slug와 404 은닉
4. 완료: Membership의 유일 OWNER·소유권 이전 불변식
5. 완료: lifecycle 폐쇄 transaction과 purge schedule 결합
6. 완료: 보안 감사의 개인정보 비노출과 mutation 원자성

실제 stage·commit은 위 검토와 targeted test가 통과하고 사용자가 승인한 뒤 진행한다.

## 6. 이번 안정화에서 확인한 보안 수정

- 커스텀 로그인 endpoint는 form-login filter를 통과하지 않으므로 인증 context 저장 전에 기존 session
  ID를 명시적으로 회전한다. 사전 발급 session으로 로그인해 ID가 달라지는 통합 테스트를 추가했다.
- MFA 등록은 최근 비밀번호 재확인을 요구한다.
- 이미 MFA가 활성화된 계정은 일반 enrollment endpoint에서 secret을 교체할 수 없다. 등록 완료 시 발급한
  일회용 복구 코드는 로그인 복구에만 사용하며, secret 재설정은 향후 별도 본인 확인 흐름으로 제한한다.
- controller/service에서 발생한 `AuthenticationException`과 `AccessDeniedException`을 각각 개인정보 없는
  401·403으로 변환해 내부 예외와 stack trace가 500 응답으로 노출되지 않게 했다.
- 가입은 기존·신규 이메일 모두 초대 유효성 검증과 비밀번호 hash 경계를 통과해 invalid code 응답으로
  계정 존재 여부를 판별할 수 없게 했다.
- 가입 초대와 이메일 확인 token은 DB에 hash만 저장한다. 두 링크 모두 fragment로 전달하고 브라우저가
  즉시 주소에서 제거해 access log·history·Referer 유출을 줄였다.
- 이메일 지정 초대는 원문을 메일로만 전달하고 운영 API 응답에는 code·URL을 반환하지 않는다. 수동
  전달용 공용 코드만 1회 표시한다.
- 사용·폐기·만료 초대뿐 아니라 사용·만료된 이메일 확인 token도 종결 30일 뒤 bounded batch로 삭제한다.
- 공개 Workspace 조회는 존재하지 않음, 비공개, 미발행 revision 누락을 모두 같은 404로 반환해 상태
  차이를 통한 Workspace 열거를 막는다. 인증된 비멤버의 관리 slug 조회도 존재 여부와 무관하게 같은
  404를 반환한다.
- slug가 없는 전환기 legacy API는 활성 Membership이 정확히 하나일 때만 동작한다. 여러 Workspace에
  속한 계정에는 임의의 첫 행을 선택하지 않고 409로 실패시켜 명시적 `/api/workspaces/{slug}/...`
  경로 사용을 강제한다.
- 비로그인 관리 화면의 로그인 `next`에는 `tab` 등 query까지 보존한다. canonical/alias 이동 뒤에도
  사용자가 요청한 관리 위치가 유지된다.
- Workspace 참여 초대 수락·거절은 Workspace→초대 순서의 비관적 잠금으로 단일 사용을 보장하고,
  폐쇄된 Workspace에서는 실패한다. 소유권 이전은 Workspace lock과 단일 transaction을 유지한다.
- V218은 활성 OWNER guard의 `UNIQUE`·`CHECK`로 복수 활성 OWNER를 DB에서 차단한다. 서비스도 이전 전
  활성 OWNER가 정확히 한 명인지 확인하고, 기존 guard를 flush한 뒤 새 OWNER를 지정한다.
- V219는 활성 OWNER guard에 `IS NOT NULL`을 명시해 SQL CHECK의 `UNKNOWN` 통과를 차단한다.
- Workspace 이름 변경·탈퇴·폐쇄는 비관적 잠금 뒤에도 상태가 `ACTIVE`인지 다시 확인한다. 접근 정책
  확인과 service mutation 사이에 폐쇄가 끼어든 경우에도 stale Membership으로 변경을 계속하지 않고 같은
  404로 실패한다.
- 폐쇄와 purge job·5개 checkpoint 생성은 같은 transaction에 참여한다. Workspace별 purge job과
  job/store별 checkpoint의 DB 유일 제약을 유지하며, 동일 폐쇄의 재요청은 404로 실패하고 복원
  reconciliation이 같은 schedule을 다시 호출해도 job 1개·checkpoint 5개로 수렴함을 통합 테스트로
  고정했다.
- 로그인 성공은 비밀번호 인증 직후가 아니라 필요한 MFA까지 통과하고 세션 context가 저장된 뒤에만
  기록한다. 비밀번호가 맞아도 MFA가 거부되면 `LOGIN_SUCCESS`가 아니라 개인정보 없는
  `LOGIN_FAILURE/MFA_REJECTED`를 남긴다. 재인증과 MFA 등록도 일반 로그인과 구분된 제한 코드로 기록한다.
- 성공한 Workspace·초대 mutation과 해당 감사 insert는 같은 요청 transaction에 참여한다. 감사 저장이
  실패하면 변경도 rollback되며, 권한 거부·로그인 context 이상처럼 실패 transaction 밖에서도 보존해야
  하는 이벤트만 `REQUIRES_NEW`를 사용한다.
- 감사 도메인은 event/result/reason/target type에 대문자 제한 코드만 허용하고 IP·기기 fingerprint에는
  64자리 HMAC-SHA256 hex만 허용한다. 이메일·token·예외 메시지·IP/User-Agent 원문을 실수로 전달하면
  DB insert 전에 거부한다.
