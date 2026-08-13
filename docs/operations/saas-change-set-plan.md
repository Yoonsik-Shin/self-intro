# SaaS 전환 변경 세트 계획

- 기준일: 2026-08-12
- 브랜치: `feat/saas-security-foundation`
- 기준: working tree의 변경은 사용자 승인 전까지 stage·commit하지 않는다.
- 목적: 큰 변경을 리뷰·회귀·롤백 가능한 단위로 나누고 각 단위의 검증 계약을 고정한다.

## 1. 왜 먼저 분리하는가

현재 변경은 경력 콘텐츠 보강, SaaS schema, 인증, Workspace 콘텐츠, AI·Vector, 공개 UI, 삭제·복구와
인프라가 하나의 working tree에 섞여 있다. 파일 수만 줄이는 커밋은 안전 경계를 만들지 못한다. schema
선행 조건, 런타임 의존성, 개인정보 경계와 독립적인 rollback 가능성을 기준으로 나눈다.

`scripts/inventory-saas-changes.sh`는 untracked directory를 파일까지 펼쳐 현재 변경을 아래 후보에
분류한다. 이는 자동 staging 도구가 아니다.
같은 파일 안에 여러 기능이 섞인 경우 `git add -p` 수준의 hunk 검토가 필요하며, 사용자의 명시적 승인
없이는 실행하지 않는다.

## 2. 적용 순서

| 순서 | 변경 세트 | 포함 범위 | 완료 조건 |
| ---: | --- | --- | --- |
| 1 | 경력 콘텐츠 | V176~V189의 검증된 경력·노출 tier 데이터 | migration checksum·내용 검토, 기존 공개 화면 확인 |
| 2 | SaaS schema | V190~V225 | 빈 DB·기존 DB Flyway 성공, FK·index 계약 확인 |
| 3 | Identity·Access | Account, Membership, MFA, 가입·초대·slug·Workspace lifecycle | 인증 단위 테스트, 역할별 401/403/404, 초대 E2E |
| 4 | Workspace 콘텐츠 | Profile, Experience, Study, Skill, Competency, Portfolio, PrintTemplate, LearningResource, Visitor | 두 Workspace 교차 접근 차단 E2E |
| 5 | Job·AI·Vector | 공용 채용공고 catalog, Workspace 지원, AI worker, Vector, StudyPlan | 공용/개인 데이터 분리, gRPC·AI 입력 scope 테스트 |
| 6 | 프런트 제품 흐름 | 공개 Workspace, 관리 셸, onboarding, ops, 역할별 메뉴 | TypeScript·Prettier·ESLint, 브라우저 권한 E2E |
| 7 | Purge·Recovery | V217 위의 inventory, adapters, Worker, rehearsal, release gate | clone 전체 rehearsal, 잔여 0, 실행 flag false |
| 8 | Runtime·Infra | Compose, OCI-neutral K8s, storage, mail, runtime role | Compose config, Kustomize render, health, Secret 미포함 |
| 9 | 문서 | 기능 지도, ADR, 운영·베타 가이드 | 구현 상태와 일치, 다음 작업·미완료 명시 |

V217 migration 자체는 schema 세트에 두고, 그 위에서 동작하는 purge 구현은 7번으로 둔다. 따라서 2번만
되돌려서는 안 되며 3~8번이 아직 적용되지 않은 환경에서만 schema rollback 여부를 판단한다. 운영 DB에는
down migration을 자동 실행하지 않고 backup clone에서 복원 절차를 검증한다.

## 3. 분리 시 주의할 교차 파일

- `AuthService`, `SecurityConfig`, `MeResponse`: 가입, Workspace 선택, MFA, 플랫폼 역할 변경이 함께 있어
  Identity 단위에서 hunk와 테스트를 같이 검토한다.
- Workspace identity 서비스와 controller: onboarding, slug, Membership, 폐쇄, purge schedule이 이어진다.
  폐쇄 transaction과 purge job 생성은 분리해 커밋하면 중간 상태에서 데이터 삭제 증적이 누락될 수 있다.
- `application.yml`, Compose, Kustomize: API/Worker runtime role과 purge fail-closed 설정을 같은 검증
  단위로 유지한다.
- JobPosting·StudyPlan: 공용 catalog와 Workspace 결과, API와 Worker가 모듈을 가로지르므로 모듈별로
  따로 커밋하지 않는다.
- 프런트 관리 셸: 메뉴 노출은 편의 기능이며 백엔드 인가를 대신하지 않는다. 관련 backend 세트 뒤에
  적용하되 단독 rollback 가능해야 한다.

## 4. 각 변경 세트 공통 검증

1. `git diff --check`
2. 관련 모듈 targeted test
3. `backend/gradlew spotlessCheck test`
4. `frontend-next`의 Prettier·TypeScript 검사
5. schema 또는 Workspace 권한 변경이면 Compose E2E
6. 인프라 변경이면 `docker compose config --quiet`와 production의 backend·frontend·monitoring·
   mysql-exporter·oracle-exporter overlay 개별 Kustomize render
7. 개인정보 삭제 변경이면 full clone rehearsal과 release gate
8. 운영 가이드·ADR·체크포인트 동시 갱신

현재 frontend ESLint 기준선은 별도 실패 상태이므로 새 오류가 추가되지 않았는지 비교하고, 공개 베타 전
전체 0건을 완료 조건으로 승격한다.

## 5. 현재 안정화 판단

- 펼친 untracked 파일을 포함한 717개 변경을 9개 변경 세트로 분류했고 `manual-review`는 0이다.

| 변경 세트 | 파일 수 |
| --- | ---: |
| 경력 콘텐츠 | 16 |
| SaaS schema | 36 |
| Identity·Access | 111 |
| Workspace 콘텐츠 | 176 |
| Job·AI·Vector | 146 |
| 프런트 제품 흐름 | 138 |
| Purge·Recovery | 48 |
| Runtime·Infra | 23 |
| 문서·inventory | 20 |

- 로컬 검증은 가능하지만 이 9개 변경 세트가 아직 working tree에 함께 존재한다.
- Identity·Access 114개의 exact path·교차 hunk 검토와 독립 targeted/full/Compose gate 고정은 완료했다.
- Workspace 콘텐츠 174개도 default 관리 API 제거, canonical 인쇄 경로 전환, Workspace AI 입력 격리와
  Compose 9단계 교차
  Workspace gate까지 완료했다. Job·AI·Vector 146개도 Workspace 지원 건 경계, Worker 호출 계약,
  vector namespace·삭제 생명주기, retry/DLQ와 source-of-truth 재조정, 최종 정적 diff review까지
  재감사했다. 일반 Workspace 사용자의 플랫폼 공고 catalog·수집 API 403 계약도 통합 테스트로 고정했다.
- Identity 하위 경계와 검증 계약은 [Identity·Access 안정화 계획](identity-access-stabilization-plan.md)을
  따른다.
- Workspace 콘텐츠 하위 경계와 검증 계약은
  [Workspace 콘텐츠 안정화 계획](workspace-content-stabilization-plan.md)을 따른다.
- Job·AI·Vector 하위 경계와 검증 계약은
  [Job·AI·Vector 안정화 계획](jobs-ai-vector-stabilization-plan.md)을 따른다.
- 실제 연락처를 제거한 `V1__init_schema.sql`과 `seed_portfolio.sql`은 경력 콘텐츠 세트로 분류한다.
  Java source에 들어 있던 raw NUL delimiter는
  `"\0"` octal escape로 바꾸고 `.gitattributes`에서 Java를 text diff로 고정해 변경 세트 리뷰와 부분
  staging이 바이너리 파일로 막히지 않게 했다.
- 공개 원격의 과거 연락처 노출은 사용자가 수용했으며 이력 재작성·강제 push는 범위에서 제외한다. 신규
  commit에 실제 연락처가 다시 들어오지 않는지만 검증한다.
- 실제 커밋 분리는 사용자 승인 뒤 수행한다. 커밋 전에도 이 순서대로 회귀 테스트해 기능 간 숨은 의존성을
  먼저 제거한다.

## 6. 리뷰용 commit 후보 계약

아래 제목은 staging이나 commit을 실행하라는 의미가 아니다. 717개 변경을 리뷰할 때 기능 경계와 검증
결과를 일관되게 연결하기 위한 후보 계약이다. 공개 원격의 과거 연락처 이력은 그대로 두며, 어떤 후보에도
Git 이력 재작성·강제 push·저장소 공개 범위 변경을 포함하지 않는다.

| 순서 | commit 후보 | 포함해야 하는 계약 | 단독 검증 gate |
| ---: | --- | --- | --- |
| 1 | `docs(career): strengthen verified career evidence` | 검증된 경력 migration, 공개 노출 tier, 현재 소스의 연락처 placeholder | migration 내용·checksum 검토, 실제 연락처 재탐색 |
| 2 | `feat(schema): add SaaS workspace data model` | V190~V225의 계정·Workspace·공개 revision·taxonomy·공고 권한·purge schema | 빈 DB와 기존 DB Flyway, FK·index 검토 |
| 3 | `feat(auth): isolate identity and workspace access` | 가입·로그인·MFA·세션·Membership·초대·slug·lifecycle 인가 | auth targeted/full test, 역할별 401/403/404, 초대 E2E |
| 4 | `feat(workspace): scope portfolio content` | Profile·Experience·Study·Skill·Portfolio 등 개인 콘텐츠의 Workspace 귀속 | 콘텐츠 targeted/full test, 9단계 교차 Workspace E2E |
| 5 | `feat(ai): scope jobs plans and vectors by workspace` | 공용 공고 catalog와 개인 지원 분리, StudyPlan, vector namespace·삭제·DLQ·reconciliation | core/API/Worker test, 무인증 401, Worker health, 교차 Workspace E2E |
| 6 | `feat(web): add workspace public and management flows` | 공개 Workspace, 관리 셸, onboarding, ops 권한 메뉴 | Prettier·TypeScript·production build, 역할별 브라우저 E2E |
| 7 | `feat(purge): add workspace erasure and recovery gates` | 삭제 inventory, storage adapter, Worker, clone rehearsal, release gate | disposable clone rehearsal, 잔여 데이터 0, runtime flag fail-closed |
| 8 | `chore(runtime): separate portable service profiles` | Compose profile, OCI-neutral Kubernetes, storage·mail adapter, runtime role | Compose config, Kustomize render, 서비스 health, Secret 미포함 |
| 9 | `docs(ops): document SaaS operation boundaries` | 기능 지도, ADR, 운영·베타 가이드, inventory·checkpoint | 링크·구현 상태·미완료 항목 상호 검토 |

각 후보는 앞선 후보가 적용된 상태에서 검증한다. 동일 파일의 hunk가 두 후보에 걸치는 경우에는 파일
경로만 보고 자동 staging하지 않고, 컴파일 가능한 최소 단위와 migration 선행 관계를 우선한다. 특히
`application.yml`, 인증 서비스, Workspace lifecycle, JobPosting 계약은 교차 파일 주의사항을 따라
부분 staging 뒤 반드시 해당 후보의 full gate를 다시 실행한다.

현재 다음 출시 전 수동 gate는 플랫폼 운영자 계정으로 MFA 로그인한 뒤 관리 셸의
`플랫폼 운영 > Vector 정합성 점검`에서 read-only 결과를 확인하고, 최근 비밀번호 재확인과 정확한 삭제 수
확인을 거쳐 고아 파생 Vector만 정리하는 것이다. 이 탭은 `GET /api/v1/vector-sync/reconciliation`과
외부 임베딩을 호출하지 않는 `POST /api/v1/vector-sync/reconcile-orphans`만 노출한다. 전체 백필은 UI에
노출하지 않는다. 비로그인 브라우저가
보호된 Workspace 관리 주소에서 로그인 화면으로 이동하고 MFA 우회가 불가능한 것까지는 확인했다.
2026-08-11 실제 로컬 점검에서 Experience 고아 82개, Study 고아 70개·누락 1개를 확인한 뒤 재인증과
명시적 승인으로 고아 152개를 삭제했다. 중간 재점검 결과 Experience는 원본/Vector 17/17, Study는
70/69였고 고아는 모두 0, Study 누락 1개만 남았다. 이어 별도 외부 전송 확인과 재인증 후 누락 Study
1개만 NVIDIA provider로 복구해 4개 chunk를 생성했다. 최종 read-only 대조는 Experience 17/17, Study
70/70, 고아·누락 모두 0이며 gate가 통과했다. 전체 백필과 MySQL 원본 변경은 수행하지 않았다.

## 7. 리뷰 시작 명령

다음 명령은 stage나 commit을 만들지 않고 현재 working tree의 모든 파일을 위 9개 세트별로 펼친다.

```bash
SHOW_ALL_CHANGE_PATHS=true ./scripts/inventory-saas-changes.sh
```

현재 기준은 총 717개, `manual-review=0`이다. 실제 분리는 1번부터 순서대로 `git add -p`로 교차 hunk를
검토하고 각 표의 gate를 통과한 뒤에만 다음 세트로 넘어간다. 사용자의 별도 승인 전에는 이 분리 작업을
실행하지 않는다.
