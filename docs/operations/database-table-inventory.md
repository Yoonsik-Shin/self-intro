# Database table inventory

- 최종 갱신: 2026-08-14
- 검증 브랜치: `fix/saas-recovery-build-baseline`
- 로컬 기준: Flyway V234, 애플리케이션 테이블 115개 + `flyway_schema_history` 1개
- 목적: SaaS 전환 뒤 늘어난 테이블의 소유권과 보존·제거 기준을 한 곳에서 관리한다.

이 문서는 테이블 수를 줄이는 것 자체를 목표로 하지 않는다. 행이 없다는 이유만으로 인증, 복구,
실명 인증, purge처럼 정상 상황에서 비어 있을 수 있는 테이블을 제거하지 않는다. 제거 후보는 코드 참조,
FK, migration 기원, 실제 행 수와 대체 source of truth를 모두 확인한 뒤 별도 migration으로 처리한다.

## 1. 현재 결론

- V231에서 `study_entry`, `study_entry_skill`, `portfolio_case_study_study`만 제거했다.
- 현재 115개 애플리케이션 테이블은 아래 8개 책임 영역에 중복·누락 없이 분류된다.
- `architecture_overview`, `donation_setting`은 현재 0행이고 FK도 없지만 활성 JPA 엔티티이므로 보존한다.
- `verified_identity`는 활성 런타임 참조가 아직 없지만 향후 실명 인증 provider와 Account를 분리하는
  보안 경계로 ADR-002에서 확정했으므로 보존한다.
- 나머지 JPA 엔티티에 직접 나타나지 않는 테이블은 `@JoinTable`, element collection 또는 네이티브 쿼리의
  연결·snapshot 테이블로 사용된다. 현재 근거로 추가 DROP할 테이블은 없다.

`information_schema.tables.table_rows`는 InnoDB에서 추정값이다. 다음 제거 검토에서는 후보별
`SELECT COUNT(*)`를 다시 실행해야 하며, 이 문서의 행 수 관찰만 삭제 근거로 사용하지 않는다.

## 2. 책임 영역별 inventory

### Schema history (1)

`flyway_schema_history`

Flyway가 관리한다. 애플리케이션 정리 대상으로 취급하지 않는다.

### Account·인증·보안 (12)

`app_user`, `email_change_token`, `email_verification_token`, `mfa_recovery_code`,
`password_reset_token`, `registration_invitation`, `security_audit_event`, `support_access_request`,
`support_access_request_scope`, `user_consent`, `user_platform_role`, `verified_identity`

Account와 Workspace를 분리하는 플랫폼 경계다. 토큰·복구·지원 접근 테이블은 평상시 0행이어도 정상이다.
`verified_identity`는 외부 실명 인증을 도입할 때 provider 식별자와 검증 상태를 Account 자격 증명에서
분리하기 위한 예약 경계다.

### Workspace·membership·삭제 전파 (8)

`workspace`, `workspace_member`, `workspace_membership_invitation`, `workspace_purge_checkpoint`,
`workspace_purge_job`, `workspace_skill`, `workspace_slug_alias`,
`workspace_taxonomy_scheme_subscription`

Workspace가 데이터 소유권 경계이고 `workspace_member`가 접근 권한의 source of truth다. purge 테이블은
삭제 작업의 재시도와 완결성을 보장하므로 일반 콘텐츠와 함께 정리하지 않는다.

### 경력 원본·근거 (23)

`career`, `certificate`, `competency`, `competency_evidence`, `competency_skill`, `competency_study`, `competency_tag`,
`education`, `experience`, `experience_detail`, `experience_detail_skill`, `experience_image`,
`experience_placement`, `experience_placement_detail`, `experience_relation`, `experience_skill`,
`experience_tag`, `portfolio_case_study`, `portfolio_case_study_revision`, `profile`, `project`, `skill`, `tag`

Workspace의 원본 기록과 관계를 저장한다. 공개 여부는 이 영역에 두지 않고 공개 구성·revision 영역에서
관리한다. 연결 테이블은 원본 간 다대다 관계를 표현하므로 행 수가 적다는 이유로 제거하지 않는다.

### 학습·의사결정·taxonomy (25)

`decision_option`, `decision_situation`, `decision_situation_relation`, `decision_source`,
`decision_study_link`, `decision_tradeoff`, `decision_warning`, `learning_resource`,
`learning_resource_relation`, `learning_resource_skill`, `learning_resource_tag`,
`learning_resource_taxonomy_node`, `study`, `study_experience`, `study_experience_detail`, `study_image`,
`study_relation`, `study_skill`, `study_tag`, `study_taxonomy_curation`,
`study_taxonomy_node`, `taxonomy_node`, `taxonomy_scheme`, `workspace_learning_resource`,
`workspace_learning_resource_tag`

Markdown 학습 원본, 학습 자료와 도메인 taxonomy를 포함한다. AI 학습 계획 API와 `study_plan_*`
테이블은 V235에서 제품 범위와 함께 제거했다. `learning_resource_*`는 현재 backend 경로에서 사용하므로
초기 데이터가 없어도 유지한다.

### 공개 구성·revision·출력 (17)

`print_document_artifact`, `print_template`, `print_template_revision`,
`workspace_public_competency_selection`,
`workspace_public_experience_detail_selection`, `workspace_public_experience_placement`,
`workspace_public_experience_revision`, `workspace_public_experience_selection`,
`workspace_public_page_draft`, `workspace_public_portfolio_selection`, `workspace_public_profile_config`,
`workspace_public_profile_revision`, `workspace_public_skill_selection`,
`workspace_public_study_selection`, `workspace_public_taxonomy_selection`,
`workspace_publication_resource`, `workspace_publication_revision`

원본 기록을 복제하지 않고 공개 범위·순서와 불변 발행 snapshot을 관리한다. 이름이 유사해도 draft,
selection, revision, publication은 수명주기가 다르므로 하나로 합치지 않는다. `print_document_artifact`는
현재 최종 PDF pointer와 별도로 정확한 출력 revision·서버 검증 checksum·객체 key를 보존한다.

### 지원 공고·지원 현황 (14)

`gap_project_document`, `job_posting`, `job_posting_cover_letter_item`,
`job_posting_cover_letter_revision`, `job_posting_permission_review_event`, `job_posting_position_choice`,
`job_posting_setting`, `job_posting_source_image`, `job_posting_source_url`, `job_posting_status_event`,
`workspace_job_application`, `workspace_job_application_status_event`, `workspace_job_map_setting`,
`workspace_job_screenshot_upload`

공고 원본·출처와 Workspace별 지원 상태를 분리한다. `job_posting`을 Workspace의 지원 메모와 합치면
공통 원본과 사적 상태의 소유권이 섞이므로 유지한다. `workspace_job_map_setting`은 지도 출퇴근 계산에
사용하는 Workspace별 비공개 기준 위치이며 공개 revision과 공통 공고 원본에 복제하지 않는다.
`gap_project_document`도 활성 API 경로가 있다.

### 플랫폼 콘텐츠·후원·통계 (10)

`architecture_layer`, `architecture_layer_item`, `architecture_overview`, `donation`, `donation_event`,
`donation_setting`, `visitor_daily_visit`, `visitor_hourly_visit`, `workspace_visitor_daily_visit`,
`workspace_visitor_hourly_visit`

플랫폼 설명·후원 운영과 플랫폼/Workspace 방문 집계를 분리한다. 집계 테이블은 원본 이벤트가 아니라
보존 정책이 적용된 통계 결과이므로 purge 정책을 별도로 유지한다.

## 3. 목표 물리 저장소와 개인정보 등급

[ADR-006](../adr/ADR-006-private-data-plane-and-public-projection.md)은 현재 113개 테이블을 즉시 옮기라는
배포 지시가 아니다. 아래 표는 두 번째 관계형 ATP를 도입할 때의 목표 소유권이며, 현재 운영 source of
truth는 계속 MySQL이다. 공개 revision에는 개인 식별 정보가 포함될 수 있으므로 `PUBLIC`은
`비개인정보`가 아니라 `사용자가 명시적으로 발행한 최소 개인정보`를 뜻한다.

| 현재 책임 영역 | 개인정보 등급 | 목표 저장소 | 이관 전 조건 |
| --- | --- | --- | --- |
| Account·인증·보안 | SECURITY / SENSITIVE_PII | Private ATP | Identity datasource, 독립 migration, Secret·복구 절차 |
| Workspace·membership·삭제 전파 | PRIVATE / SECURITY | Private ATP | 공개 registry 분리, purge orchestration 재검증 |
| 경력 원본·근거 | PRIVATE / SENSITIVE_PII | Private ATP | 공개 snapshot이 원본 DB를 조회하지 않는지 검증 |
| 학습·의사결정 | PRIVATE | Private ATP | PLATFORM taxonomy 정의를 먼저 분리 |
| 공통 taxonomy 정의·version | PLATFORM_SHARED | Public MySQL | Workspace subscription·curation과 물리 분리 |
| 공개 구성 draft·selection | PRIVATE | Private ATP | 발행 outbox와 source version 도입 |
| 불변 공개 revision·resource | PUBLIC / PERSONAL_DATA | Public MySQL | 최소 필드 allowlist, checksum, 공개 중지·retention 검증 |
| Workspace private 공고·지원 현황 | PRIVATE / SENSITIVE_PII | Private ATP | 공통 catalog와 외부 key로 분리 |
| 승인된 공통 공고 catalog | PLATFORM_SHARED | Public MySQL | 허락 증빙 gate와 private source 비복제 검증 |
| Architecture 공개 콘텐츠 | PUBLIC | Public MySQL | 공개 API DTO와 관리 권한 유지 |
| Donation·결제·메시지 | SENSITIVE_PII / SECURITY | Private ATP | provider 멱등성·감사·복구를 함께 이관 |
| 플랫폼 비식별 방문 집계 | INTERNAL_AGGREGATE | Public MySQL | 재식별 가능 필드 제거와 보존기간 검증 |
| Workspace 방문 집계 | PRIVATE | Private ATP | Workspace purge와 Support Access 경계 검증 |
| Experience·Study vector | DERIVED_SENSITIVE | Vector ATP private schema | `(workspaceId, sourceId)`와 삭제 reconciliation 유지 |
| 승인 공고 vector | DERIVED_SHARED | Vector ATP catalog schema | 승인 catalog만 색인하고 schema credential 분리 |

다음 현재 테이블은 한 행 또는 한 테이블 안에 목표 저장소가 다른 책임이 섞여 있으므로 그대로 물리
이동하지 않는다.

- `job_posting`: 플랫폼 공통 후보와 Workspace private source를 먼저 분리한다.
- `taxonomy_scheme`, `taxonomy_node`: PLATFORM 정의와 Workspace 정의·curation을 먼저 분리한다.
- `workspace`: Private ATP의 Workspace 원본과 Public MySQL의 공개 registry/pointer를 별도 모델로 만든다.
- 공개 구성 16개 중 draft·selection은 Private ATP, 완결된 publication revision/resource만 Public MySQL로
  분리한다.

DB 간 FK, cross-DB SQL join, XA transaction과 동기 dual write는 허용하지 않는다. 불투명한 외부 key,
outbox event, idempotent consumer와 row count·business key·checksum reconciliation을 사용한다.

## 4. 제거 결정 gate

다음 조건을 모두 만족할 때만 후속 removal migration을 만든다.

1. 현재 코드, ORM mapping, 네이티브 쿼리와 운영 스크립트에 읽기·쓰기 경로가 없다.
2. 다른 테이블에서 들어오거나 나가는 FK가 없거나, 대체 관계로 안전하게 이관할 수 있다.
3. 후보별 정확한 `COUNT(*)`와 운영 DB 사전 점검 결과가 0이거나 승인된 이관 절차가 있다.
4. 대체 source of truth와 rollback 방법이 문서화돼 있다.
5. migration은 비어 있지 않으면 `SQLSTATE 45000`으로 실패하도록 fail closed한다.
6. 전체 백업, 임시 DB 실패 경로, Flyway 적용, backend health와 동기화 스크립트를 검증한다.

## 5. 다음 점검 순서

1. 신규 migration마다 이 inventory의 책임 영역과 테이블 수를 갱신한다.
2. `verified_identity`는 실명 인증 provider 도입 시 schema를 확정하고, 도입을 취소할 때만 ADR 변경과
   함께 제거 여부를 다시 판단한다.
3. 공개 revision과 브라우저 PDF를 불변 산출물로 연결하는 작업에서는
   `workspace_publication_revision`, `workspace_publication_resource`, `print_template_revision`의 책임을
   먼저 재검증한다.
4. 운영 반영 전에는 로컬 115개와 운영 schema를 직접 비교하고, V231 이전 운영 환경에 DROP을
   선적용하지 않는다.
5. ADR-006 이관은 공고·taxonomy 혼합 모델 분리와 Public/Private datasource port를 먼저 구현한 뒤
   수행하며, 현재 MySQL 개인정보 테이블을 선삭제하지 않는다.
