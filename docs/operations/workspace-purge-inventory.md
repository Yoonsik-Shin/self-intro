# Workspace 물리 삭제 inventory

- 최종 갱신: 2026-08-11
- inventory version: `workspace-purge-v1`
- 운영 상태: **로컬 복구 clone 전체 rehearsal 완료, 전체·저장소별 flag 기본 false로 비활성화**
- 관련 migration: V216, V217

이 문서는 폐쇄된 Workspace의 원본·파생 데이터를 실제로 지우기 전에 확인해야 할 저장소 경계를
고정한다. 코드 검색에서 나온 `workspace_id` 참조 횟수와 실제 DB 테이블 수를 혼동하지 않는다.
V217 적용 전 로컬 MySQL 실스키마에는 `workspace_id` 컬럼 테이블이 20개였고, purge 제어 이력을
보존하는 `workspace_purge_job`을 추가하면 21개다.

## 1. 실행 원칙

1. Workspace 폐쇄 transaction은 접근을 즉시 끊고 `purge_after`와 purge job·5개 저장소
   checkpoint를 만든다.
2. `POST /api/ops/workspace-purge-jobs/{jobId}/dry-run`은 최근 비밀번호 재확인과 플랫폼 운영자
   권한이 필요하다.
   관리 셸의 플랫폼 운영 전용 `Workspace 삭제 점검` 메뉴에서 같은 API를 사용한다.
3. MySQL live schema에 manifest에 없는 `workspace_id` 테이블이 하나라도 생기거나 예상 테이블이
   사라지면 `MYSQL_SCHEMA_INVENTORY_DRIFT`로 차단한다.
4. dry-run은 후보 수만 세며 데이터를 지우지 않는다. Object Storage는 공개·비공개 버킷의 현재
   object와 bytes, 이전 version과 bytes, delete marker, 미완료 multipart 수를 실제로 조회한다.
   version-aware 삭제 adapter와 Worker checkpoint orchestration은 구현했다. 다만 전체 실행
   `WORKSPACE_PURGE_EXECUTION_ENABLED`과 Object Storage·Vector·Redis·MySQL 각 삭제 flag가
   모두 기본 `false`이므로 dry-run의 `BLOCKED`가 정상이다. 로컬 백업 clone 복구와 전체
   rehearsal은 완료했지만 운영 backup 보존·복구와 provider rehearsal 전에는 flag를 열지 않는다.
5. Workspace 이름·이메일·본문·object key 원문은 purge job과 감사 이벤트에 기록하지 않는다.

## 2. MySQL 분류

| 처리 분류 | 테이블 |
| --- | --- |
| Workspace FK `CASCADE` | `competency`, `decision_study_link`, `experience`, `portfolio_case_study`, `print_template`, `profile`, `study`, `study_plan`, `study_taxonomy_curation`, `tag`, `workspace_job_application`, `workspace_learning_resource`, `workspace_member`, `workspace_publication_revision`, `workspace_skill`, `workspace_slug_alias`, `workspace_visitor_daily_visit`, `workspace_visitor_hourly_visit` |
| Workspace 삭제 전 명시 삭제 | `workspace_membership_invitation` (`NO ACTION`) |
| 보존·가명화 정책 필요 | `security_audit_event` (Workspace FK 없음) |
| purge 제어 증적 보존 | `workspace_purge_job` (Workspace FK 없음) |

직접 FK의 `CASCADE`만으로는 충분하지 않다. 현재 adapter는 live schema의 21개 `workspace_id` 테이블과
Workspace 직접 FK 19개(18개 `CASCADE`, 참여 초대 `NO ACTION`)가 code-owned manifest와 정확히 일치할
때만 진행한다. 참여 초대를 먼저 삭제하고, Workspace 감사 이벤트의 actor·Workspace·target·request·IP
연결값을 `NULL`로 가명화한 뒤 Workspace를 삭제해 18개 자식 graph를 cascade한다. purge 제어 row는
증적으로 보존하고 모든 삭제·가명화 대상의 잔여 0건을 재검증한다. Worker는 MySQL을 항상 마지막에
실행하지만 개별 flag와 전체 실행 flag는 false다. 실제 Compose MySQL 격리 fixture에서 transaction
rollback 검증을 수행했고, 이어서 현재 로컬 DB의 transaction-consistent dump를 복원한 disposable
clone에서 실제 Workspace graph 삭제, 감사 연결값 가명화, purge 제어 row 보존과 2차 멱등 실행을
확인했다. clone DB는 종료 trap으로 삭제했다.

## 3. 외부 저장소 분류

| 저장소 checkpoint | 확인된 Workspace 데이터 | 현재 blocker |
| --- | --- | --- |
| `OBJECT_STORAGE` | `workspaces/{workspaceId}/...` 아래 Experience·Study·Portfolio 이미지 및 private 최종 PDF | inventory와 version-aware 멱등 batch delete·0건 재검증 adapter 구현. 복원 clone 전체 로컬 rehearsal 완료, flag 기본 false, 운영 provider rehearsal 전 |
| `ORACLE_VECTOR` | `experience_vector`, `study_vector`의 `workspace_id`; `job_posting_vector`는 공통 catalog | count와 기본 비활성 delete·0건 재검증 adapter 및 로컬 격리 rehearsal 완료. Worker 내부 직접 연결, 삭제 gRPC는 없음 |
| `ORACLE_NOSQL` | `JobPostingCatalogReadModel`은 공통 공고 key와 공통 필드만 사용. Workspace·사용자·매칭 필드 없음 | schema를 code-owned allowlist로 검사하고 기존 `JobPostingReadModel` 행이 0건일 때 `READY` 0건으로 제외. 로컬 실데이터 검증 완료 |
| `REDIS_CACHE` | `workspace-visitor:summary`, ExperienceTree, PrintTemplate. BFF는 현재 생성 지점 없이 레거시 eviction만 남음 | code-owned registry와 SCAN/UNLINK·0건 재검증 adapter를 전용 DB fixture에서 검증. Worker 연결 완료, flag 기본 false |

OCI Object Storage와 MinIO, Oracle Vector 로컬 DB와 운영 Oracle DB의 차이는 adapter 설정 차이로만
다룬다. purge 도메인은 S3 호환 object prefix, vector Workspace 조건, cache namespace라는 계약에
의존하며 특정 cloud SDK를 직접 호출하지 않는다.

현재 Compose MinIO는 slash로 끝나는 prefix를 `ListMultipartUploads`에 전달하면 실제 upload와 part가
있어도 0건을 반환한다. multipart inventory만 버킷 전체를 페이지 단위로 조회한 뒤 검증된 Workspace
prefix로 메모리에서 필터링한다. key는 checkpoint·응답·로그에 반환하지 않는다. object와 version 목록은
저장소 prefix를 직접 사용한다.

## 4. Worker 실행·재시도 규칙

1. AI Worker만 scheduler를 소유하고 파괴적 API·gRPC는 제공하지 않는다.
2. job row를 pessimistic lock으로 claim하고 외부 provider 호출 중에는 DB transaction을 열어 두지
   않는다. 각 저장소 실행 전 lease를 갱신하고, 2시간 기본 lease가 지난 `PURGING`은
   다른 Worker가 재claim할 수 있다. claim 시도 번호를 fencing token으로 사용해 이전 Worker의 느린
   checkpoint commit을 차단한다.
3. 순서는 `ORACLE_NOSQL` 공통 catalog 제외 확인 → `OBJECT_STORAGE` → `ORACLE_VECTOR` →
   `REDIS_CACHE` → `MYSQL_PRIMARY`로 고정한다. 원본 관계형 graph는 마지막에 지운다.
   첫 외부 삭제 전에 MySQL manifest·폐쇄·유예 경계를 다시 검증하고, NoSQL 제외 시점에도
   catalog schema와 레거시 개인화 0건을 다시 검증한다.
4. 완료 checkpoint는 다시 호출하지 않고, 실패 checkpoint부터 재개한다. provider 삭제와 0건
   재검증이 멱등이므로 삭제 후 checkpoint commit 전 crash도 재실행으로 복구한다.
5. provider 오류 원문·key·URL은 job, checkpoint, 일반 로그에 남기지 않는다.

## 5. 검증된 로컬 복구 rehearsal

`scripts/rehearse-workspace-purge-compose.sh`는 원본 `self_intro`를 `--single-transaction`으로 dump하고
고유한 임시 MySQL database에 복원한다. 원본과 clone의 table 수, 성공 Flyway migration 수,
Workspace 수가 같을 때만 30일 유예가 지난 격리 fixture를 만든다. MinIO의 version·delete marker·
multipart, Oracle Vector의 Experience·Study, Redis DB 15의 Workspace/legacy cache를 함께 생성해 5개
checkpoint 전체 실행, 감사 가명화, 잔여 0건, 무관한 cache 보존과 2차 멱등 실행을 확인한다.

2026-08-11 실행 결과는 table 95개, 성공 migration 122개, 기존 Workspace 1개가 source와 clone에서
일치했고 전체 test가 통과했다. trap 종료 뒤 임시 clone database와 Redis DB 15는 0건이었다. 이 결과는
현재 시점의 로컬 logical backup과 로컬 provider fixture를 검증한 것이며 30일 된 운영 backup의 실제
복원 가능성, OCI Object Storage 보존본, 운영 Oracle 복구를 증명하지 않는다.

## 6. 다음 게이트

1. 운영 MySQL backup 보존기간을 삭제 유예기간보다 길게 고정하고 별도 clone 복구 증적 남기기
2. OCI Object Storage versioning·lifecycle·복구 정책과 운영 provider 격리 rehearsal
3. 결과 승인 후에만 개별 provider flag를 먼저 설정하고, 마지막에
   `WORKSPACE_PURGE_EXECUTION_ENABLED=true`를 검토

현재 Compose와 운영 manifest는 위 flag를 모두 false로 유지한다.
