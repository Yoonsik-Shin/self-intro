# Job·AI·Vector 안정화 계획

## 1. 목적

공용 채용공고 catalog와 Workspace별 지원·AI 결과를 분리하고, API와 AI Worker 사이에서
`workspace_id`가 유실되지 않도록 고정한다. Oracle Vector는 공용 공고 vector와 Workspace 소유
경력·학습 vector의 생명주기를 구분한다.

이 문서는 현재 코드와 migration, 기존 ADR, 로컬 검증 결과를 source of truth로 사용한다. 운영 배포가
확인되지 않은 구현은 로컬 완료로만 기록한다.

## 2. 변경 경로 분류

`scripts/inventory-jobs-ai-vector-changes.sh`가 상위 inventory의 `05-jobs-ai-vector` 경로를 다음 경계로
분류한다.

| 경계 | 핵심 계약 |
| --- | --- |
| Shared AI runtime | provider client·dispatcher는 tenant를 추론하지 않고 호출자가 범위를 제공 |
| Job catalog·projection | 공고 원문·수집·dedup·공용 vector만 관리하고 개인 상태를 기록하지 않음 |
| Workspace job application | 지원 상태·메모·관심도·상태 이력은 `(workspace_id, job_posting_id)` 소유 |
| Workspace AI artifact | 자소서·어필·Gap·PDF 초안은 먼저 Workspace 지원 건을 검증 |
| Workspace StudyPlan | root·후보·AI 입력·수정이 같은 Workspace ID를 사용 |
| Vector boundary | `job_posting_vector`는 공용, `experience_vector`·`study_vector`는 Workspace scope |

## 3. 현재 확인된 경계

- 일반 Workspace 지원 관리는 `/api/workspaces/{slug}/job-applications/manage`를 사용하며 read/write
  Membership을 각각 확인한다.
- Worker AI 경로는 `/api/worker/workspaces/{slug}/job-applications/manage/**`에서 slug를 Workspace
  ID로 해석한 뒤 지원 건을 `(workspace_id, job_posting_id)`로 다시 검증한다.
- 자기소개서 revision, Gap 문서, 적합도 결과와 PrintTemplate 재생성은 해당 Workspace 지원 건의
  자식으로 취급한다.
- `RelevantProfileDigestService`는 명시적 Workspace ID를 받아 경력·학습 vector를 검색한다.
- `job_posting_vector`는 공용 공고 원문 파생 데이터다. Workspace 폐쇄·purge 대상은
  `experience_vector`와 `study_vector`이며 공용 공고 vector는 제외한다.
- 공용 공고 수집·URL/이미지 등록·새로고침 endpoint는 플랫폼 운영 경계에 남아야 하며 개인 매칭을
  암묵적으로 실행해서는 안 된다.
- Workspace 인쇄 화면에서 발견된 전역 API 혼입을 제거했다. 자소서 조회, AI 템플릿 재생성,
  템플릿 연결용 지원 공고 목록은 모두 현재 slug의 Workspace 지원 API를 사용한다. 플랫폼 운영 전용
  공고 화면의 전역 수집·AI API는 별도 역할 경계 안에서 유지한다.
- `/api/v1/vector-sync/**`는 request의 `workspaceId`로 수동 재색인하는 내부 운영 endpoint인데 별도
  역할 matcher가 없었다. 플랫폼 OWNER·OPERATOR 전용으로 잠그고 일반 Workspace 사용자 403 통합
  테스트를 추가했다.
- 호출처가 없고 request 본문에서 임의 Workspace ID·Experience·Study 원문을 받던 수동
  `/api/v1/vector-sync/experience`, `/api/v1/vector-sync/study`는 제거했다. Workspace 소유 vector는
  source-of-truth 변경 이벤트와 Workspace 범위를 검증하는 backfill·purge 경로로만 갱신한다. 공용
  JobPosting 수동 sync와 전체 backfill도 플랫폼 운영자 경계 안에서만 유지한다.
- 플랫폼 공고 운영 화면의 자소서·revision·어필·재매칭·Gap 문서·PDF 생성 및 최종 PDF 저장을 현재
  `workspaceSlug`의 지원 건·PrintTemplate·Object Storage API로 전환했다. 호출처가 0개가 된
  `/api/worker/job-postings/{id}` 아래 개인화 AI endpoint와 default 공개 Workspace를 추론하는 서비스
  오버로드·frontend client를 제거했다. 공용 URL 파싱·수집·refresh·collect·backfill만 플랫폼 Worker
  prefix에 남는다.
- API 모듈의 `/api/admin/job-postings/**` 자소서 endpoint와 전역 PrintTemplate의 지원 공고 최종 PDF
  endpoint도 호출처 0을 확인한 뒤 제거했다. 관련 default Workspace service와 client도 삭제했고
  RequestMapping 테스트가 개인화 endpoint의 재등장을 막는다.
- StudyPlan은 읽기뿐 아니라 candidate 선택, item 완료·이해 상태 변경, 삭제도 먼저
  `(plan_id, workspace_id)` root를 조회한다. 다른 Workspace의 plan ID로 하위 자원을 변경할 수 없음을
  테스트로 고정했다.
- Experience·Study vector 저장 전 기존 행 삭제, 검색, Workspace purge SQL은 모두
  `(workspace_id, source_entity_id)` 또는 `workspace_id` 조건을 사용한다. 원본 Experience·Study 삭제
  시에도 기존 update queue에 삭제 이벤트를 순서대로 발행해 같은 조건으로 Oracle vector를 제거한다.
  Experience subtype 변경처럼 기존 ID를 삭제하고 새 ID를 만드는 경로도 이전 ID 삭제 후 새 ID sync를
  등록한다. 기존 4-field update 이벤트 생성자는 유지해 생산자 코드 호환성을 보존했다.
- 플랫폼 운영자 전용 `backfill-all`은 최근 비밀번호 재확인을 요구하며 Oracle의 distinct `(workspace_id, source_entity_id)`를 MySQL
  source of truth의 같은 복합 경계와 먼저 대조한다. 원본이 없는 namespace만 삭제한 뒤 현재 원본을
  백필하므로 유실된 update와 delete 이벤트를 모두 재조정한다. 삭제 전 read-only `reconciliation`
  endpoint는 종류별 원본·Vector·고아·누락 namespace 수만 반환한다. 공용 `job_posting_vector`는 대상이 아니다.
  비교는 Oracle reference snapshot을 먼저 읽고 MySQL source projection을 종류별 1회 조회해 set으로
  대조하므로 namespace별 N+1 조회를 만들지 않는다.
- 전체 백필은 Experience·Study 본문을 외부 임베딩 API에 전송할 수 있으므로 자동 복구나 일반 관리 UI에
  연결하지 않는다. `reconcile-orphans`는 최근 비밀번호 재확인과 정확한 삭제 수 확인을 요구하고 MySQL
  원본이 없는 Oracle 파생 namespace만 삭제한다. 이 경로는 외부 임베딩 API를 호출하지 않는다. 누락
  namespace 생성은 로컬 전용 fallback과 외부 임베딩 중 데이터 처리 결정을 별도로 받은 뒤 수행한다.
- 외부 임베딩을 선택한 누락 복구는 전체 백필 대신 `reconcile-missing-external`을 사용한다. 최근 재인증,
  정확한 `EXTERNAL_NVIDIA` 확인값, 화면의 건수·전송 범위 확인을 모두 요구하고 누락 namespace만 처리한다.
  이 경로의 embedding 호출은 strict 모드여서 provider 실패를 로컬 결정론적 vector로 대체하지 않는다.

## 4. 안정화 순서

1. 120개 경로를 위 여섯 경계로 고정하고 manual-review 0을 유지한다.
2. [완료] legacy `/api/worker/job-postings/**`에서 Workspace 개인 결과를 생성·조회하는 endpoint와 실제
   frontend 호출처를 대조한다.
3. [완료] 모든 AI 진입점에서 Membership → Workspace 지원 건 → 하위 자원 순서로 인가하는지 확인한다.
4. [완료] 공용 수집·dedup·refresh가 `workspace_job_application` 또는 개인 점수를 수정하지 않는지 확인한다.
5. [완료] StudyPlan의 plan·candidate·item ID 교차 Workspace 조작을 테스트로 고정한다.
6. [완료] vector SQL·repository·event에서 Workspace 소유 데이터에 `workspace_id` 조건이 빠진 경로가
   없는지 확인하고 원본 삭제 시 vector 삭제 전파를 추가한다.
7. API·Worker targeted test, 전체 backend test, production build, Compose 교차 Workspace E2E를 실행한다.

## 5. 완료 조건

- inventory manual-review 0
- 일반 사용자에게 플랫폼 공고 수집·전체 refresh·backfill API 403
- 두 Workspace가 같은 공고를 독립 지원하고 AI 결과를 서로 조회·변경하지 못함
- 공용 공고 갱신이 다른 Workspace의 지원 상태·매칭 결과를 덮어쓰지 않음
- StudyPlan 및 경력·학습 vector의 교차 Workspace ID 조작 차단
- 전체 테스트·빌드·Compose gate 통과
- 운영 가이드에 로컬 검증과 미배포 상태 기록

JobPosting 개인화 경계와 legacy endpoint 제거는 완료했다. 전체 core·AI Worker·API 테스트, TypeScript,
Next.js production build, 새 backend·worker 이미지와 Compose 9단계 교차 Workspace E2E가 통과했다.
로컬에서만 검증했으며 운영에는 배포하지 않았다.

StudyPlan 하위 자원 경계와 Experience·Study vector SQL·삭제 생명주기 감사까지 완료했고 표적 테스트가
통과했다. vector update/delete는 공용 after-commit 발행기를 사용해 원본 MySQL transaction이 rollback된
경우 RabbitMQ에 전송하지 않는다. 다만 DB commit 직후 broker 전송 전에 프로세스가 종료되는 유실 창을
제거하는 transactional outbox는 아직 없다. Consumer는 실패를 삼키지 않고 1초·2초 backoff로 총 3회
시도한 뒤 `selfintro.queue.vector-sync.dlq`로 재발행한다. update는 기존 Workspace vector를 지우고 다시
만들며 delete는 범위 삭제이므로 중복 전달에도 멱등하다. 개인정보 payload가 DLQ에 무기한 남지 않도록
기본 TTL은 7일이다.

전체 core·AI Worker·API test와 Next.js production build가 통과했다. 새 backend·worker Compose image로
교체한 뒤 Worker health에서 MySQL·Oracle Vector·RabbitMQ·Redis `UP`, durable DLX와 7일 TTL DLQ 선언,
빈 DLQ를 확인했다. Compose 9단계 교차 Workspace E2E도 다시 통과했다. 이 결과는 로컬 검증이며 운영에는
배포하지 않았다.

source-of-truth reconciliation은 같은 ID라도 Workspace가 다른 경우를 원본으로 인정하지 않고 해당 잘못된
namespace만 제거하는 테스트를 통과했다. 일반 Workspace 사용자는 실제 `backfill-all` endpoint에서
403으로 차단한다.

비공개 베타에서는 transactional outbox 도입을 보류한다. 현재 규모에서는 after-commit 발행, 3회 retry,
7일 DLQ, 멱등 Consumer와 운영자 재조정으로 허용 가능한 복구 경계를 확보했고, outbox relay·backlog·정리
운영 비용이 더 크기 때문이다. 다음 조건 중 하나가 생기면 outbox를 다시 검토한다.

- vector 정합성 RPO가 수동 재조정 주기보다 짧아야 함
- after-commit publish 유실 또는 DLQ 적재가 반복됨
- 원본·이벤트 규모가 수동 감사 범위를 벗어남

bulk source projection, read-only inspection, 동일 ID·다른 Workspace 오판 방지 단위 테스트와 전체
core·AI Worker·API 테스트가 통과했다. 최신 backend·worker Compose image에서 모든 dependency health가
`UP`, 무인증 inspection은 401, 9단계 교차 Workspace E2E는 전체 통과했다. 브라우저에 플랫폼 운영자
로그인 세션이 없어 MFA를 우회하지 않았으며 인증된 실제 inspection 응답 확인만 운영자 smoke test로
남겼다.

120개 경로의 최종 정적 diff review도 완료했다. `PublicWorkspaceResolver`·default Workspace 추론,
request 본문의 임의 `workspaceId`, Workspace 범위가 없는 Experience·Study vector 삭제·검색, 개인 본문
payload 로그는 남아 있지 않다. ID 단독 조회는 공용 JobPosting catalog이거나, 먼저
`(workspace_id, job_posting_id)` 지원 건을 검증한 뒤 읽는 하위 자원으로 한정된다. 공용 `JobPosting`의
`match_score`, `match_reason`, `appeal_analysis`는 단일 사용자 시절의 레거시 컬럼이며 신규 Workspace
지원·AI 경로는 이를 읽거나 쓰지 않고 `workspace_job_application`만 사용한다. 일반 Workspace 사용자가
플랫폼 공고 catalog와 수집 endpoint에 접근하면 403인 통합 테스트도 추가했다.

다음 작업은 9개 변경 세트를 실제 커밋 순서와 리뷰 가능한 commit 후보로 정리하는 것이다. 사용자 승인
전에는 commit하지 않는다. 그 뒤 운영자 MFA 로그인 상태에서 read-only reconciliation 응답을 확인하고
OCI 배포 전 gate와 배포 여부를 결정한다.
