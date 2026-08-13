# SaaS 전환 작업 체크포인트

- 최초 점검일: 2026-08-12
- 상태 갱신일: 2026-08-13
- SaaS 루트 브랜치: `docs/saas-product-guides`
- 상태 갱신 브랜치: `fix/saas-recovery-build-baseline`
- 기준 HEAD: `282b487`
- 운영 상태: **미배포**
- 목적: 96개로 분리·커밋된 SaaS 전환 변경의 검증 기준과 다음 순서를 고정한다.

이 문서는 구현 완료를 선언하는 문서가 아니다. 제품 기능의 소유권과 상태는
[제품 기능 지도](../product/feature-map.md), 설계 결정은
[ADR-001](../adr/ADR-001-saas-security-multitenancy.md), 실행 절차와 검증 이력은
[SaaS 운영 가이드](saas-operations-guide.md)를 따른다.
변경 세트의 검토·적용 순서는 [SaaS 변경 세트 계획](saas-change-set-plan.md)을 따른다.

## 1. Source control 상태

최초 점검에서는 `scripts/inventory-saas-changes.sh`가 펼친 717개 경로가 working tree에 있었다. 이후
기능·경계·검증·문서 단위의 작은 branch와 commit으로 분리했고, 2026-08-13 현재 검증 HEAD는 `main`보다
96개 commit 앞서며 누적 변경은 772개 파일이다. 상태 갱신 직전 working tree는 clean이다. 아직 `main`에
merge·push·배포하지 않았으므로 다음 원칙을 지킨다.

1. 기존 변경을 대량 포맷·되돌리기·삭제하지 않는다.
2. migration, backend 경계, frontend route/UI, 인프라, 문서를 구분해 검토한다.
3. 기능 단위 검증이 끝나기 전에는 운영 배포나 purge 실행 경로를 열지 않는다.
4. 후속 변경도 자식 branch의 작은 commit으로 만들며 사용자의 로컬 인수 확인 전 `main`에 merge하지 않는다.
5. 세션 cookie·token·실제 Secret·DB dump 같은 로컬 산출물은 Git에서 제외한다.

루트의 임시 `cookies.txt`는 사용자 요청으로 삭제했고 `.gitignore`에 `cookies.txt`, `*.cookies`,
`*.cookies.txt`를 추가해 재유입을 막았다. 파일 내용은 점검 과정에서 출력하지 않았다.

## 2. 변경 영역 inventory

| 변경 세트 | 변경 경로 수 | 현재 판단 |
| --- | ---: | --- |
| 경력 콘텐츠 | 16 | 검증된 경력 migration과 공개 노출 tier |
| SaaS schema | 36 | V190~V225 계정·Workspace·발행·taxonomy·공고 권한·purge schema |
| Identity·Access | 111 | 가입·MFA·세션·Membership·초대·slug·lifecycle·가입 Compose UAT |
| Workspace 콘텐츠 | 176 | Profile·Experience·Study·Skill·Portfolio·이미지 업로드 등 Workspace 귀속 |
| Job·AI·Vector | 146 | 공용 catalog와 개인 결과, Worker, vector 생명주기 |
| 프런트 제품 흐름 | 138 | 공개 Workspace·관리 셸·onboarding·ops |
| Purge·Recovery | 48 | inventory·adapter·Worker·rehearsal·release gate |
| Runtime·Infra | 23 | Compose profile·Kubernetes·storage·mail·runtime role |
| 문서·inventory | 20 | 기능 지도·ADR·운영·베타 가이드·검증 스크립트 |

기존 `git status`의 untracked directory 축약 수치는 실제 파일 수를 숨기므로 앞으로
`scripts/inventory-saas-changes.sh`를 source of truth로 사용한다. migration 변경은 V190 이전 14개와
SaaS 경계 V190~V225 36개로 나뉜다. 경력 콘텐츠 보강 migration과 멀티테넌트 schema migration을 같은
완료 단위로 취급하지 않는다.

## 3. 확인된 기준선

- 현재 Compose MySQL에서 V190~V228이 모두 `success=1`이다.
- backend·MySQL·MinIO·Redis·Oracle Vector·Oracle NoSQL·RabbitMQ 등 필요한 Compose 서비스가 실행 중이며
  backend health가 `healthy`다.
- core·api·ai-worker 전체 Spotless와 테스트가 통과했다. 2026-08-12 Workspace Skill 조회 회귀 수정 뒤에도
  core/API 전체 test와 Spotless를 다시 통과했다.
- frontend Prettier, ESLint(error 0·warning 0), `tsc --noEmit`, production build가 현재 HEAD에서
  통과했다.
- 실제 세션·CSRF 기반 Compose E2E는 Profile, 공개 revision/rollback, slug alias, Study, 핵심 프로젝트,
  방문 통계, Workspace 초대·역할·소유권 이전·폐쇄 경계를 검증한다.
- Object Storage purge inventory와 기본 비활성 멱등 삭제 adapter는 격리 MinIO fixture에서 검증했다.
- Oracle Vector의 Workspace count와 기본 비활성 delete adapter를 구현했다. 읽기 전용 inventory만
  API→AI Worker 내부 gRPC로 연결하고, 격리 Workspace ID의 경험·Study vector 각 2건을 삭제한 뒤
  잔여 0건을 로컬 Oracle에서 확인했다.
- Redis는 실제 cache annotation을 기준으로 Workspace key registry를 고정했다. `SCAN`/`UNLINK` 기반
  inventory와 기본 비활성 eviction adapter를 전용 DB 15 fixture에서 검증했고, 세션·플랫폼 cache와
  다른 Workspace의 명시적 Experience Tree key가 보존됨을 확인했다.
- Oracle NoSQL은 공통 필드만 가진 `JobPostingCatalogReadModel`로 쓰기 계약을 분리했다. 실제 Compose
  KVLite schema allowlist와 기존 `JobPostingReadModel` 0행을 통합 테스트로 확인해 Workspace purge 후보
  0건 `READY` 제외 조건을 검증했다. schema drift·레거시 행·provider 실패는 계속 fail-closed한다.
- MySQL은 21개 Workspace 테이블과 직접 FK 19개의 rule을 code-owned manifest로 고정했다. Compose MySQL
  transaction 격리 fixture에서 초대 선삭제, 감사 연결값 가명화, Workspace cascade, purge 제어 row 보존,
  잔여 0건과 두 번째 멱등 실행 0건을 확인하고 전체 fixture를 rollback했다. 삭제 flag는 false다.
- Compose Workspace 격리 E2E 9단계가 실제 세션·CSRF로 모두 통과했고 종료 cleanup이 실행됐다. 공통
  JobPosting 검증은 기존 로컬 공고에 의존하지 않고, 권한 증적을 가진 실행 전용 공고를 생성·승인·조회한
  뒤 삭제하는 결정적 fixture로 고정했다.
- 운영자 MFA 세션으로 첫 Vector source-of-truth reconciliation을 완료해 Experience 원본/Vector 17/17,
  Study 70/70과 고아·누락 0을 확인했다. 이후 과거 Compose E2E cleanup이 MySQL fixture를 직접 삭제하면서
  삭제 이벤트를 우회해 Experience·Study 고아 namespace가 2개씩 다시 발견됐다. E2E cleanup은
  canonical API 삭제와 비동기 Vector 소비 0건 확인을 포함하도록 수정했고 새 실행 뒤 고아 수가 증가하지
  않음을 확인했다. 기존 고아 2+2도 운영자가 정확한 범위를 확인하고 최근 재인증한 뒤 전용 UI로만
  삭제했다. 2026-08-12 최종 read-only 재점검에서 Experience 17/17, Study 70/70과 고아·누락 0을 확인했다.
- Workspace Skill 목록의 LAZY catalog 조회로 발생하던 500을 entity graph로 수정했다. 실제 Compose 관리
  화면에서 71개 기술이 렌더링됐고 같은 Workspace Skill API 두 요청이 200임을 확인했다.
- Experience·Study·Competency AI를 slug 기반 canonical endpoint와 Workspace별 후보 조회로 전환했다.
  다른 Workspace ID는 provider 호출 전 거부하고 비멤버 endpoint 호출은 404로 숨기는 단위·통합 테스트가
  통과했다. PrintTemplate CRUD도 일반 Workspace 메뉴로 개방한 뒤 전체 backend test, frontend production
  build와 최신 Compose 9단계 교차 Workspace E2E를 다시 통과했다.
- 실제 SMTP 가입 경로를 검증하는 `registration-onboarding-compose.sh`를 추가했다. 테스트 전용 개인 초대,
  `PENDING_VERIFICATION`, Mailpit fragment token, 확인 전 로그인 401, 단일 사용 확인 링크, 일반 사용자
  로그인, 첫 비공개 Workspace, 발행 전 공개 404, Profile 저장과 첫 공개 snapshot·프런트 200을 순서대로
  확인했다. 종료 후 임시 계정·Workspace·초대는 모두 0건이며 운영자 세션과 기존 데이터는 변경하지 않았다.
- Finder 휴지통 복원 뒤 `frontend-next` bind mount에 붙은 macOS 확장 속성으로 `/app` 읽기가 `EPERM`으로
  실패한 상태를 복구했다. 확인된 `com.apple.macl`·`com.apple.provenance`만 제거하고 프런트를 재시작해
  Next.js `Ready`와 직접 route 200을 확인했다. 이어 frontend format·TypeScript·production build,
  backend 전체 Spotless·test, Workspace 격리 9단계와 가입·SMTP·온보딩 Compose UAT를 다시 통과했다.
- `account-withdrawal-compose.sh`는 두 동시 세션, 최근 비밀번호 재인증, 탈퇴, 전체 세션 만료, 재로그인 차단,
  DB 익명화와 감사 이벤트를 모두 통과했다. `support-access-compose.sh`는 운영 역할 MFA, OWNER 승인,
  세 가지 최소 진단 범위, 즉시 철회, 철회 뒤 404와 감사 이벤트를 모두 통과했다.
- 현재 HEAD에서 backend `./gradlew spotlessCheck`, `./gradlew test`, frontend format·ESLint·TypeScript·
  production build가 통과했다. 가입·온보딩·첫 발행, 계정 탈퇴, Support Access, Workspace 격리 9단계
  Compose E2E도 모두 재통과했다. 이전에 backend·worker·frontend 병렬 Compose 이미지 빌드도 통과했으며,
  Gradle BuildKit cache는 `sharing=locked`로 직렬화해 backend·worker 동시 빌드의 journal lock timeout을
  제거했다.
- 현재 Compose MySQL logical backup을 disposable clone으로 복원해 source/clone의 table 95개, 성공
  migration 122개, Workspace 1개 일치를 확인했다. 같은 clone에서 로컬 5개 purge checkpoint 전체,
  잔여 0건, 감사 가명화, purge 증적·무관 cache 보존과 2차 멱등 실행을 검증했고 clone DB와 Redis DB 15는
  종료 뒤 0건이었다. 이는 운영 backup 보존·OCI provider 복구 증적은 아니다.
- 복원 maintenance reconciliation은 누락 제어면·복원된 접근·중단 lease만 결정적으로 복구하고 모호한
  모순은 blocker로 중단하도록 구현했다. API/Worker runtime role 조건과 clone에서 reconciliation 우선
  실행도 검증했으며 장기 실행 production flag는 false다.
- 위 결과는 로컬 검증이며 운영 배포·운영 데이터 rehearsal을 의미하지 않는다.

## 4. 준비도 판단

| 구간 | 준비도 | 남은 핵심 조건 |
| --- | --- | --- |
| 로컬 비공개 베타 기반 | 약 96% | 별도 사람이 수행하는 작성·발행·AI/PDF UX 확인 |
| 핵심 Workspace 데이터 격리 | 약 98% | 레거시 호환 API 제거 시점 결정 |
| 개인정보 물리 삭제 | 약 90% | 운영 backup/provider 복구 rehearsal·flag 승인 |
| 플랫폼 보안·운영 | 약 78% | MFA 전체 수단 분실 복구 절차, 운영 Secret·SMTP·rate limit |
| 릴리스 변경 세트 준비 | 약 97% | 96개 commit 분리·자동 회귀 완료, 사람의 UX 확인 |
| 운영 가능한 공개 SaaS | 약 63% | 운영 provider·보안 self-service·복구·배포 rehearsal |

비율은 코드 줄 수가 아니라 보안·격리·복구·운영 차단 조건을 기준으로 한 준비도다.

## 5. 재개 순서

1. 현재 변경 범위·민감 파일 안전장치 고정 — **이번 체크포인트로 완료**
2. 기능 지도와 운영 가이드의 완료/미완료 중복 정규화 — **완료**
3. 전체 테스트 기준선 재실행 및 실패 목록 고정 — **완료**
4. Oracle Vector Workspace count/delete adapter와 격리 rehearsal — **완료**
5. Redis Workspace cache registry/eviction adapter — **완료**
6. Oracle NoSQL 공통 catalog 제외 증명 — **완료**
7. MySQL 초대 선삭제·감사 가명화·FK 삭제 순서 — **완료**
8. 저장소 checkpoint 재시도·중단 재개와 purge worker — **완료, 기본 비활성**
9. 로컬 백업 clone 복구·전체 purge rehearsal — **완료, 실행 flag는 비활성**
10. production purge release gate·삭제 유예 30일 명시 — **완료, required check 설정 전**
11. maintenance reconciliation·API/Worker runtime role 분리 — **완료, 로컬 clone 검증**
12. Vector 고아·누락 source-of-truth reconciliation — **완료, 17/17·70/70 및 고아·누락 0 확인**
13. Workspace Skill 실제 관리 화면 500 회귀 수정 — **완료, Compose API 200 확인**
14. 운영자·별도 베타 계정의 로컬 사용자 인수 테스트 — **SMTP·가입·온보딩·첫 발행·탈퇴·지원 접근 자동 UAT 완료, 사람의 UX 확인 필요**
15. 717개 변경을 9개 리뷰 세트로 분류하고 작은 branch/commit으로 분리 — **완료, 현재 96개 commit**
16. 운영 backup 보존·OCI provider 복구·격리 Worker reconciliation rehearsal 뒤 실행 flag 검토

안정화 트랙은 최초 717개 경로를 9개 변경 세트로 분류하고 `manual-review=0`을 유지한 뒤 96개 commit으로
분리했다. Identity·Access,
Workspace 콘텐츠, Job·AI·Vector의 하위 경계·정적 review·targeted/full/Compose gate를 완료했다. 가입,
MFA, session 회전, Membership, slug, lifecycle, 공개 revision, 지원 결과, StudyPlan, vector namespace,
retry/DLQ와 purge·restore 경계를 로컬에서 검증했다. 변경 세트 분리는 완료됐다. 현재 commit HEAD의
자동 Compose 회귀도 통과했으며, 다음 release gate는 별도 사람이 수행하는 UX 확인이다.

각 단계가 끝날 때 구현 여부, 검증 결과, 운영 배포 여부와 다음 작업을 이 문서와 운영 가이드에 함께
기록한다.

## 6. 고정된 품질 부채

frontend ESLint error와 warning은 모두 0이다. 미사용 변수, hook dependency, 사용하지 않는
eslint-disable을 제거했고, App Router 전역 font와 인증·객체 저장소 이미지처럼 의도적인 예외는 적용 파일에만
범위를 제한해 설정 근거를 남겼다.

비공개 베타에서 transactional outbox와 실제 JobPosting vector 추천 endpoint는 의도적으로 보류한다.
운영 배포 차단 조건은 MFA 초기화 운영 절차·운영 Secret, private object storage와 파일 검사, 운영 backup
복구 rehearsal이다. `/api/admin/**` 호환 endpoint는 플랫폼 역할로 잠겨 있고 Workspace 관리 UI는
canonical endpoint만 사용하지만, 베타 안정화 뒤 제거 시점을 별도로 결정한다.
