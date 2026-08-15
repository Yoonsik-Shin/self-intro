# ADR-006: 개인정보 원본과 공개 projection의 물리적 데이터 경계

- 상태: Accepted (구현 전 목표 구조)
- 기준일: 2026-08-14
- 적용 범위: 배포 환경의 관계형 DB·Vector DB 경계
- 현재 상태: MySQL HeatWave 1개와 Oracle ATP/26ai Vector 1개를 사용한다. 이 ADR의 두 번째
  관계형 ATP와 데이터 이관은 아직 구현·배포하지 않았다.

## 배경

Workspace 데이터는 행 단위 tenancy와 Membership 검증으로 논리적으로 격리되어 있지만, 계정·인증,
비공개 경력·학습 원본, 지원 기록, 공개 catalog와 발행 snapshot이 하나의 MySQL schema에 함께 있다.
배포 환경에서 관계형 Oracle ATP를 한 대 더 사용할 수 있으므로, 테이블 수를 나누는 목적이 아니라
개인정보 원본에 접근할 수 있는 실행 주체와 자격 증명을 줄이는 목적으로 물리 경계를 추가한다.

공개 revision도 이름·경력처럼 개인을 식별할 수 있는 정보를 포함한다. 사용자가 공개에 동의했다는
이유로 비개인정보가 되는 것은 아니며, 공개에 필요한 최소 snapshot으로 별도 취급한다.

## 결정

목표 배포 구조를 다음 세 data plane으로 분리한다.

| 저장소 | 책임 | 접근 주체 |
| --- | --- | --- |
| Public MySQL | 제품 공개 콘텐츠, 승인된 공통 catalog, 비식별 플랫폼 집계, 공개 Workspace registry와 불변 발행 projection | Public API, 제한된 Platform Catalog 관리 경로 |
| Private ATP | 계정·인증·동의, Membership, 비공개 Workspace 원본·초안·지원 상태·AI 결과·감사 데이터 | Identity/Manage API와 승인된 private worker |
| Vector ATP | 원본에서 재생성 가능한 embedding과 vector index | Vector Worker만 직접 접근 |

OCI, MySQL HeatWave와 Oracle ATP는 현재 adapter 선택이다. 도메인 경계는 `PublicProjectionPort`,
`PrivateWorkspaceStorePort`, `VectorStoragePort` 같은 port로 표현하고 특정 JDBC URL, wallet 또는 Oracle
타입을 domain/application 계층에 노출하지 않는다.

### Public MySQL에 둘 데이터

1. 제품 아키텍처 소개처럼 개인 Workspace와 무관한 공개 제품 콘텐츠
2. 외부 권리자의 재노출 허락을 검증하고 플랫폼 운영자가 승인한 공통 공고 catalog
3. 공통 taxonomy의 정의·버전. Workspace 선택·메모·사용자 정의 분류는 포함하지 않는다.
4. 개인이나 특정 Workspace를 재식별하기 어렵게 최소화한 플랫폼 집계
5. 사용자가 명시적으로 발행한 필드만 복제한 불변 공개 revision/resource
6. 무작위 공개 key, canonical slug, 현재 공개 revision pointer로 구성한 공개 Workspace registry

공개 API는 Private ATP를 조회하지 않는다. 공개 화면 한 요청에서 Private ATP와 Public MySQL을
동시에 join하거나 조합하지 않고 Public MySQL의 완결된 projection만 읽는다.

### Private ATP에 둘 데이터

- Account, 비밀번호 hash, 이메일·MFA·복구 token, 동의와 실명 인증
- Workspace, Membership, 초대, 역할 변경, Support Access와 보안 감사
- Profile·Experience·Study·Skill overlay·Competency·Portfolio 원본과 공개 구성 초안
- 지원 공고의 Workspace private source, 지원 상태·메모·자기소개서·제출 문서 연결
- AI 입력·결과·작업 상태 중 Workspace 또는 사용자를 식별할 수 있는 데이터
- Workspace별 방문 집계와 재식별 가능한 fingerprint

운영자 역할만으로 Private ATP의 다른 Workspace 원본을 읽을 수 없다. Support Access의 승인·범위·만료
검증을 통과한 Manage API만 제한적으로 읽고 모든 접근을 감사한다.

### Vector ATP에 둘 데이터

Vector ATP는 source of truth가 아니며 원본 저장소와 발행 catalog에서 다시 만들 수 있어야 한다.

- `experience_vector`, `study_vector`: 민감한 Workspace 파생 데이터. `(workspaceId, sourceId)`를
  source identity로 사용한다.
- `job_posting_vector`: 승인된 공통 공고 catalog 파생 데이터만 허용한다.
- 원문, 이메일, 전화번호, 사람 이름과 인증 식별자는 저장하지 않는다.
- Workspace vector와 공통 catalog vector는 별도 Oracle schema/DB 사용자로 분리하고 Vector Worker에도
  필요한 schema 권한만 부여한다.
- Workspace 삭제는 private 원본, 공개 projection, 객체 저장소와 Workspace vector 삭제를 모두
  확인한 뒤 완료한다. Vector 삭제 실패를 성공으로 처리하지 않는다.

## 현재 혼합 모델의 분리 조건

### JobPosting

현재 `job_posting`은 `owner_workspace_id`와 `scope_key`로 플랫폼 원본과 Workspace private source를
같은 테이블에서 표현한다. 이 상태로 테이블 전체를 Public MySQL이나 Private ATP로 옮기지 않는다.

- Public MySQL: 승인된 공통 공고 catalog와 권한 증빙의 공개 가능 최소 메타데이터
- Private ATP: Workspace private source, 지원 overlay, 메모·분석·자소서와 상태 이력
- 두 저장소는 DB FK 대신 추측하기 어려운 `catalogPostingKey`로 연결한다.
- 승인되지 않은 private source는 Public MySQL과 `job_posting_vector`로 복제하지 않는다.

### Taxonomy

현재 `taxonomy_scheme`은 PLATFORM scope와 `workspace_id`를 함께 표현한다. 물리 이관 전에 다음을
분리한다.

- Public MySQL: 전역 scheme/node 정의와 version
- Private ATP: Workspace 구독·선택·순서·curation과 사용자 정의 taxonomy
- Private ATP에는 필요한 catalog key와 version만 저장한다. 요청 시 cross-DB join하지 않도록
  필요한 표시 정보는 versioned read model로 동기화한다.

### 공개 발행

발행은 Private ATP 원본을 공개하는 작업이 아니라 공개 allowlist에 포함된 필드로 새 snapshot을 만드는
작업이다. 다음 순서를 보장한다.

1. Private ATP transaction에서 발행 의도와 source version을 기록하고 outbox event를 만든다.
2. Publication Worker가 최소 필드 snapshot을 생성해 Public MySQL에 append한다.
3. snapshot checksum과 resource 수를 검증한 뒤에만 공개 pointer를 새 revision으로 전환한다.
4. 실패하면 이전 revision을 계속 제공하고 부분 생성 projection은 공개하지 않는다.
5. 공개 중지는 pointer를 비활성화하고 CDN/cache를 무효화한다. revision 보존·삭제는 별도 정책을 따른다.

DB 간 XA/2-phase commit과 애플리케이션의 동기 dual write는 사용하지 않는다. Outbox, idempotency key,
재시도와 reconciliation으로 eventual consistency를 관리한다.

## 장애와 침해 시 불변 조건

- Private ATP 장애: 로그인·관리·신규 발행은 실패하지만 기존 Public MySQL 공개본은 제공할 수 있다.
- Public MySQL 장애: 공개 페이지는 실패하지만 Private ATP 원본과 관리 데이터는 손상하지 않는다.
- Vector ATP 장애: AI 검색·추천만 degraded 처리하고 CRUD·기존 공개 페이지를 막지 않는다.
- Public API 배포에는 Private ATP와 Vector ATP의 wallet/Secret을 주입하지 않는다.
- 각 DB는 별도 wallet, DB 사용자, Secret, backup·retention 정책과 migration history를 사용한다.
- 로그와 tracing attribute에는 원문 개인정보, JDBC URL, wallet 경로와 token을 남기지 않는다.

## 이관 순서

1. inventory의 모든 테이블을 PUBLIC, PRIVATE, DERIVED, SECURITY로 분류한다.
2. DB 간 외부 key와 port를 도입하되 저장 위치는 바꾸지 않는다.
3. `job_posting`과 taxonomy의 혼합 catalog/Workspace 모델을 분리한다.
4. Private ATP datasource와 독립 migration 모듈을 만들고 최소 권한 계정을 구성한다.
5. 백필 뒤 row count, business key와 checksum reconciliation을 수행한다.
6. shadow read로 결과를 비교하고 endpoint별로 읽기를 전환한다.
7. rollback 기간과 백업 검증이 끝난 뒤에만 기존 MySQL 개인정보 테이블 제거 migration을 검토한다.

실제 DB 이관, Secret 생성, 운영 DB DDL과 데이터 삭제는 별도 승인·백업·복구 rehearsal 없이 실행하지
않는다.
