# ADR-001: SaaS 보안·멀티테넌트 기준

- 상태: Accepted
- 기준일: 2026-08-11
- 적용 브랜치: `feat/saas-security-foundation`

## 결정

Self-Intro를 단일 소유자 포트폴리오에서 다중 사용자 SaaS로 전환한다. 보안 경계와 데이터
소유권의 기본 단위는 `Workspace`이며, 모든 데이터는 기본 비공개다. 공개 페이지는 작업
테이블을 직접 조회하지 않고 명시적으로 발행된 revision만 제공한다.

서비스 루트(`/`)는 특정 사용자의 이력서가 아니라 제품의 구조, 기능, 운영 방식을 설명하는
제품 메인으로 사용한다. 기존 아키텍처 페이지의 제품 설명과 Workspace 체험을 루트로 옮긴다.
경력, 공부, 기술, 핵심역량, 의사결정 온톨로지는 특정 개인에게 고정된 전역 데이터가 아니라
각 Workspace가 소유하고 선택적으로 공개하는 콘텐츠다.

사용자의 Workspace 역할과 플랫폼 운영 역할은 분리한다. 플랫폼 운영자도 개인 Workspace의
`OWNER` 멤버십을 가지지만, `PLATFORM_OWNER`라는 이유만으로 다른 Workspace의 개인정보를
열람할 수 없다.

## 데이터 소유권 분류

모든 영속 데이터와 파생 데이터는 다음 네 범위 중 하나를 명시한다.

| 범위                | 의미                                                    | 대표 데이터                                                   |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Account             | 사람과 인증에 귀속되고 Workspace 이동과 무관            | 이메일, 비밀번호 hash, 닉네임, MFA, 동의, 실명 인증           |
| Platform Shared     | 모든 Workspace가 읽어 재사용하지만 플랫폼만 정의를 관리 | 기술 카탈로그, 공통 taxonomy, 기본 템플릿, 일반 의사결정 지식 |
| Workspace           | Membership을 통해서만 관리하는 tenant 데이터            | Profile, Experience, Study, 역량, 지원, 이력서, 공개 설정     |
| Platform Operations | SaaS 운영과 보안에 필요한 플랫폼 데이터                 | 가입 초대, 시스템 아키텍처, 후원, 전체 감사·운영 통계         |

공통 데이터에는 숙련도, 개인 설명, 핵심 여부, 노출 순서, 학습 상태, 지원 상태처럼 사용자나
Workspace에 따라 달라지는 값을 저장하지 않는다. 공통 정의를 개인화해야 하는 도메인은 공통
catalog와 Workspace overlay를 분리한다.

- Skill: 이름·분류·배지는 공통 `skill` 정의, 실무 수준·사용 버전·활용 맥락·경험 메모·핵심 여부·노출
  순서는 Workspace별 `workspace_skill` 표현. Workspace 생성 API는 `catalogSkillId`와 overlay 값만 받고,
  수정 API도 overlay 값만 받는다. 공통 정의의 쓰기는 플랫폼 운영 API에서만 수행한다.
- Taxonomy: 공통 노드 + Workspace별 선택·순서·사용자 정의 분류
- Learning Resource: 공통 자료 메타데이터 + Workspace별 상태·메모·진도
- Job Posting: 공고 원본 + Workspace별 저장·지원·분석·자소서
- Print Template: 현재 사용자 템플릿은 Workspace 소유, 향후 플랫폼 기본 템플릿 catalog와
  Workspace 복사본·수정본 분리
- 의사결정 온톨로지: 상황·선택지·트레이드오프·경고·출처·상황 관계는 플랫폼 공통 catalog,
  Study 근거 연결은 Workspace overlay. V208은 `decision_study_link.workspace_id`를 추가하고
  `(study_id, workspace_id)` 복합 외래키로 다른 Workspace Study 연결을 DB에서도 차단한다.
  YAML topology의 기본 Study 연결은 모든 Workspace에 복제하지 않고 bootstrap 공개 Workspace에만
  적용한다. 각 Workspace는 공통 의사결정 지식을 읽되 자기 Study 연결만 생성·조회·공개한다.
- 방문자 통계: 기존 `visitor_*` 집계는 플랫폼 전체 운영 통계로 유지하고,
  `workspace_visitor_*`는 공개 Workspace별 집계로 분리한다. canonical Workspace 공개 페이지의
  방문은 두 범위를 함께 갱신하지만 Workspace 관리 API는 URL의 Workspace Membership과
  `OWNER`/`ADMIN` 역할을 확인한 뒤 해당 Workspace 집계만 반환한다. 기존 전역 방문 기록은 어느
  Workspace 방문인지 증명할 수 없으므로 추정 backfill하지 않고 V210 적용 이후부터 Workspace 통계를
  새로 집계한다.

### LearningResource·JobPosting 전환 계약

두 도메인은 기존 한 행에 공통 원본과 개인 상태가 섞여 있어 `workspace_id` 하나만 추가하지 않는다.

| 도메인           | 공통 catalog/원본                                                  | Workspace overlay                                                         |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| LearningResource | 제목, 유형, 제공자, URL, 저자, 길이, 공통 taxonomy·skill·자료 관계 | 저장 여부, 상태, 우선순위, 순서, 개인 요약·노트, Workspace Tag            |
| JobPosting       | 회사·직무·공고 URL·원문·수집 출처·게시 기간·정규화 fingerprint     | 저장·지원 상태, 메모, 관심도, 분석 결과, 자기소개서, 제출 문서, 상태 이력 |

Workspace 전용으로 직접 입력한 자료·공고는 overlay가 소유하는 private source로 저장하고, 플랫폼
catalog 승격은 별도 검토 작업으로 다룬다. 수집 worker와 dedup/vector 파이프라인은 공통 원본 ID를
기준으로 유지하되, 개인 상태·AI 입력·검색 결과는 항상 `workspace_id`를 함께 전달해야 한다. 이
V202는 LearningResource catalog와 `workspace_learning_resource` 상태·메모·Tag overlay를,
V203은 JobPosting catalog와 `workspace_job_application` 지원 상태·메모·관심도·분석·상태 이력을
분리했다. V204는 StudyPlan root에 `workspace_id`를 부여하고 후보 자료·기술 숙련도·프로필 RAG를
명시적 Workspace 범위로 제한한다. 후보 우선순위는 계획 생성 시점의 Workspace overlay 값을
snapshot으로 보존하며 catalog의 legacy shadow 값을 읽지 않는다. LearningResource UI와 StudyPlan은
일반 Workspace에 개방한다. V205는 자기소개서 문항·답변을 `workspace_job_application`의 자식으로
이관하고 revision도 문항을 통해 소유권을 상속하게 한다. 수동 자기소개서 관리는 일반 Workspace에
개방한다. 자기소개서 AI는 명시적 Workspace 지원 건·문항·경력 RAG를 검증한다. V206은 어필 분석을
Workspace 지원 overlay에 저장하고 Gap 문서를 지원 건의 자식으로 이관한다. 제출 문서까지 같은
경계로 다룬다. 이 서비스에서 제출 문서는 별도 aggregate가 아니라 Workspace 소유
`PrintTemplate`의 최종 제출 PDF다. 채용공고 PDF AI 초안은 Workspace 지원 건을 먼저 확인하고,
해당 Workspace의 이력·벡터만 사용해 같은 Workspace 템플릿을 생성·수정한다. 최종 PDF object key는
Workspace와 `print-template/final-pdf` scope를 모두 검증하고 비공개 버킷에 저장한다. 기존 최종 PDF
key는 V207에서 `workspaces/{workspaceId}/...` namespace로 이관한다. object bytes는 DB migration
전에 비공개 버킷의 같은 결과 key로 복사·검증해야 한다. Workspace 지원 상태 관리 화면과 플랫폼
공고 수집·AI 운영 화면은 계속 분리한다. 전자는 일반
Workspace에 개방하고 후자는 플랫폼 운영자에게만 보인다.

지원 지도의 기준 위치는 공통 `job_posting_setting`이나 Account 프로필이 아니라
`workspace_job_map_setting`에 Workspace별로 저장한다. 이 값은 개인의 생활권을 추론할 수 있는 비공개
정보이므로 공통 공고 catalog, 공개 페이지 구성, 공개 revision, PDF 출력에 포함하지 않는다. 읽기는
`OWNER`, `ADMIN`, `EDITOR`, `VIEWER` Membership에 허용하고 변경은 `OWNER`, `ADMIN`, `EDITOR`로
제한한다. Workspace 폐쇄 시 FK cascade로 제거하며, 다른 Workspace로 복사하거나 기본 주소를 자동
생성하지 않는다.

### JobPosting 공유 카탈로그 권한 불변 조건

`job_posting`은 플랫폼 처리용 원본 저장소이지 자동으로 공유되는 카탈로그가 아니다. 수집 성공, 공개
URL, robots 허용, 출처 표기, 플랫폼 운영자의 판단은 Workspace 사용자에게 공고를 재노출할 권한을
만들지 않는다. V223부터 모든 기존·신규 원본은 `REVIEW_REQUIRED`로 시작하고 다음 조건을 모두 만족한
경우에만 공유 카탈로그 후보가 된다.

1. 심사 상태가 `APPROVED`다.
2. 근거가 채용 기업 직접 제공, 서면 이용 허락, 재노출을 허용하는 공식 API 계약 중 하나다.
3. 증빙 참조, 허락 주체, 그 주체의 권한 확인 내용, 저장·검색·재노출 허용 범위가 기록돼 있다.
4. 권한 만료 시각이 없거나 현재보다 미래다.

이 조건은 Workspace 카탈로그 조회와 신규 지원 기록 저장 양쪽에서 서버가 검사한다. 원본 내용이
수정되면 증빙 범위가 수정본까지 이어진다고 추정하지 않고 `REVIEW_REQUIRED`로 되돌린다. 심사 변경은
`job_posting_permission_review_event`에 불변 이력으로 남기며, 기존 Workspace 지원 overlay는 보존하되
재승인 전 공유 검색과 다른 Workspace의 신규 저장을 차단한다. 이 설계는 플랫폼 운영자를 저작권 판단
주체로 만들기 위한 것이 아니라, 외부 권리자의 허락 증빙을 검증하고 fail-closed 경계를 집행하기 위한
것이다.

`job_posting_vector`는 특정 사용자의 이력이나 기술이 아니라 공용 JobPosting 원문을 표현하는 catalog
파생 데이터이므로 의도적으로 `workspace_id`를 갖지 않는다. 반대로 적합도 계산 입력은 반드시 요청
Workspace의 `workspace_skill`만 조회하고, 점수·근거는 `workspace_job_application`에만 저장한다.
공용 수집·URL/이미지 등록·원문 새로고침은 개인화 매칭을 실행하거나 `job_posting`의 legacy shadow
점수를 갱신하지 않는다. 향후 벡터 추천 API도 catalog 후보를 찾은 뒤 Membership이 확인된 Workspace
overlay를 생성·조회하는 단계에서만 개인 결과를 반환해야 한다.

Aggregate root는 `workspace_id NOT NULL`을 직접 갖는다. root에 종속되어 단독 조회되지 않는 자식은
부모를 통해 소유권을 상속할 수 있지만, 서로 다른 Aggregate를 잇는 연결은 양쪽 Workspace가 같은지
application과 가능한 경우 복합 외래키로 검증한다.

## URL과 화면 경계

- `/`: 제품 메인과 Workspace 체험
- `/workspace/{workspaceSlug}`: Workspace가 발행한 공개 이력 홈
- `/workspace/{workspaceSlug}/experience`: Workspace 공개 경력
- `/workspace/{workspaceSlug}/study`: Workspace 공개 공부
- `/workspace/{workspaceSlug}/ontology`: Workspace 공개 의사결정 온톨로지
- `/workspace/{workspaceSlug}/manage`: Membership과 플랫폼 역할에 따라 메뉴가 달라지는 단일 관리 셸
- `/ops`: 플랫폼 운영 메뉴로 이동하는 호환 진입점

기존 `/w/{workspaceSlug}`, `/workspace/{workspaceSlug}/admin`, `/admin`, `/experience`, `/study`,
`/experience-tree`, `/architecture`는
전환 기간의 호환 경로로만 유지한다. 새 코드와 링크는 Workspace가 명시된 canonical URL을
사용한다.

## 보안 불변 조건

1. API는 명시적인 공개 allowlist를 제외하고 기본 거부한다.
2. 모든 Workspace 요청은 인증 사용자, 활성 멤버십, 필요한 권한, 대상 데이터의
   `workspace_id`를 매 요청마다 검증한다.
3. Workspace 소유 데이터는 ID만으로 조회·수정·삭제하지 않는다.
4. 캐시, 파일 경로, AI 작업, 이벤트, 벡터 검색에도 `workspace_id`를 포함한다.
5. 이메일·전화번호·주소와 비공개 문서는 공개 응답에서 기본 제외한다.
6. 플랫폼 운영자의 개인정보 접근은 사유·만료시간·감사 기록이 있는 별도 Support Access를
   통해서만 허용한다.
7. 로그에는 비밀번호, 세션, 토큰, 서명 URL, 개인정보 원문, AI 프롬프트 전문을 남기지 않는다.
8. 탈퇴·삭제는 원본뿐 아니라 캐시, 객체 저장소, 벡터, AI 결과, 공개 revision을 포함한다.

## 계정과 권한

- Workspace 역할: `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`
- 플랫폼 역할: `PLATFORM_OWNER`, `PLATFORM_OPERATOR`, `SUPPORT`
- 가입 시 개인 Workspace를 자동 생성한다.
- 플랫폼 운영자는 MFA, 짧은 세션, 중요 작업 재인증, 동시 세션 제한을 적용한다.
- IP·기기 이상 탐지는 원문 대신 HMAC fingerprint를 사용하고, 초기에는 자동 차단 없이 감사
  이벤트로 관측한다.
- 로그인 성공은 비밀번호뿐 아니라 계정에 필요한 MFA와 session context 저장이 끝난 뒤 기록한다.
  재인증·MFA 등록은 일반 로그인과 다른 제한 코드로 기록하며, 이메일·username·token·예외 메시지는
  감사 payload에 저장하지 않는다.
- 성공한 Workspace·초대 mutation과 감사 insert는 한 transaction으로 처리한다. 감사 저장 실패 시
  mutation도 rollback하고, 거부·이상 관측처럼 실패 transaction과 독립 보존해야 하는 이벤트만 새
  transaction으로 기록한다.
- 감사 event/result/reason/target type은 대문자 제한 코드만, IP·device는 HMAC-SHA256 hex만 허용한다.

## 데이터 격리

현재 규모에서는 MySQL 공유 스키마의 row-level tenancy를 사용한다. Workspace aggregate root와
보안상 직접 조회되는 하위·연결 테이블에는 `workspace_id NOT NULL`을 둔다. 연결 테이블은
가능한 경우 `(workspace_id, entity_id)` 복합 외래키로 교차 Workspace 연결을 DB에서도 막는다.

배포 환경의 다음 단계에서는 개인정보 원본에 접근할 수 있는 실행 주체를 줄이기 위해
[ADR-006](./ADR-006-private-data-plane-and-public-projection.md)의 Public MySQL, Private ATP,
Vector ATP 경계를 적용한다. 이는 아직 구현되지 않은 목표 구조이며, 이관 전까지 현재 MySQL 공유
schema의 row-level tenancy와 기존 Oracle Vector ATP 경계를 source of truth로 유지한다. 공개 revision도
개인정보이므로 비개인정보로 분류하지 않고, 사용자가 선택한 최소 필드 projection과 별도 보존·공개
중지 정책을 적용한다.

다른 Workspace의 객체를 요청하면 존재 여부를 노출하지 않도록 404로 응답한다.

## 개인정보와 공개 발행

데이터는 `PUBLIC`, `INTERNAL`, `SENSITIVE_PII`, `SECRET`로 분류한다. 연락처는 기본 비공개이며,
사용자가 선택한 필드만 발행 revision으로 복사한다. 공개 API는 private entity/DTO를 재사용하지
않는다.

Workspace의 작업 테이블은 항상 초안이다. `OWNER` 또는 `ADMIN`이 발행할 때 현재 공개 소개
(WEB·RESUME), 관련 Experience, 공개 Study·분류·Tag, 공개 온톨로지 index·detail·Study 연결을 하나의 불변
`workspace_publication_revision`과 `workspace_publication_resource` 집합으로 원자적으로 저장한다.
공개 API는 Workspace가 `PUBLISHED`이고 revision이 존재할 때만 최신 revision을 읽는다. 이후 초안을
저장해도 공개 응답은 바뀌지 않으며, 재발행해야 새 revision이 보인다. 공개 중지는 Workspace를
`PRIVATE`로 바꾸되 revision은 감사·복구를 위해 보존한다. Portfolio Case Study는 이미 자체 발행
revision을 가지므로 Workspace publication resource에 중복 저장하지 않는다.

이전 revision 복원은 기존 행이나 공개 pointer를 수정하지 않는다. `OWNER` 또는 `ADMIN`이 현재 schema와
호환되는 과거 revision을 선택하면 해당 resource 집합을 복사한 새 `ROLLBACK` revision을 만들고
`source_revision_number`를 남긴다. 초안은 변경하지 않는다. 보존 정책은 최근 20개를 기간과 무관하게
유지하고 그 밖의 revision도 기본 180일 동안 보존하는 두 경계를 함께 적용한다. 값은 배포 환경에서
조정할 수 있으며, 정리는 발행·복원 트랜잭션 뒤에만 수행한다. 현재 공개본과 최소 개수·기간 중 하나라도
해당하는 revision은 삭제하지 않는다.

기존 `PUBLISHED` Workspace는 V211 적용 후 애플리케이션 시작 시 revision이 없거나 최신 revision의
schema version이 애플리케이션 기준보다 낮은 경우 초기/보정 snapshot을 만든다. 신규 Workspace는 계속
`PRIVATE`로 생성하며 자동 발행하지 않는다.

Workspace slug는 공개·관리 URL의 라우팅 키이지 권한 증명이 아니다. V213부터 현재 canonical slug와
과거 alias를 `workspace_slug_alias`의 전역 unique namespace로 관리한다. `OWNER` 또는 `ADMIN`만 최근
10분 이내 비밀번호 재확인 후 canonical slug를 바꿀 수 있다. 변경 전 slug는 active alias로 남겨 공개
API 호환성과 Next.js 308 canonical redirect를 제공한다. 관리 API도 alias를 같은 Workspace로 해석하지만
매 요청 Membership과 역할을 다시 확인한다. 플랫폼 역할만으로 Workspace slug를 변경할 수 없으며 변경
성공은 `WORKSPACE_SLUG_CHANGED` 보안 감사 이벤트로 기록한다.

## AI·벡터 처리

AI 요청은 사용자가 선택한 Workspace 자료만 사용하고, 직접 식별자를 제거한 뒤 외부 모델에
전송한다. 전송 대상 미리보기와 동의를 제공하며 프롬프트·응답 보존기간을 제한한다. Workspace
콘텐츠 벡터 테이블과 검색 쿼리는 `workspace_id`로 격리하고 원본 삭제 시 파생 벡터도 삭제한다.
공용 catalog 자체의 벡터는 Workspace 비소유 데이터로 유지하되, 이를 사용한 개인 검색·추천 결과와
입력 snapshot은 Workspace overlay에만 저장한다.

## 클라우드 중립성

현재 운영 인프라는 OCI/OKE, MySQL HeatWave, Oracle ATP/26ai, OCIR, OCI Block Volume과
Cloudflare를 사용한다. 이 선택은 배포 어댑터이며 도메인 모델의 전제가 아니다.

- Kubernetes 표준 manifest와 Kustomize를 배포 계약으로 유지한다.
- 객체 저장소는 S3 호환 `ObjectStoragePort` 뒤에 둔다.
- 벡터 검색은 `ProfileVectorSearchPort` 뒤에 두고 Oracle VECTOR SQL을 adapter 내부에 격리한다.
- 비밀 관리는 `SecretProvider` 경계로 두고 OCI Vault, AWS Secrets Manager, Azure Key Vault로
  교체 가능하게 한다.
- 클라우드 SDK 타입과 OCID/ARN/resource ID는 domain/application 계층에 노출하지 않는다.
- 서비스 간 인증은 TLS/mTLS 표준을 사용하고 특정 클라우드 IAM만을 유일한 인증 방식으로
  삼지 않는다.

### 정적 고위험 Secret의 runtime 전달 (2026-08-22)

Workspace 사용자가 연결한 AI API key를 `SecretProvider`로 저장하는 것과 애플리케이션 시작 전에 필요한
DB·MFA·SMTP·결제·플랫폼 AI·Storage credential의 runtime 전달을 구분한다. 후자는 OKE Basic을
유지하고, workload별 전용 OCI IAM 서비스 사용자의 config-file 인증을 사용하는 init container가 Vault
Secret bundle을 `emptyDir.medium: Memory`에 기록하며 main container가 read-only로 mount하는 계약을
사용한다. Kubernetes Secret 동기화, Pod 환경변수 재복제, CSI node DaemonSet은 사용하지 않는다.

API와 Worker의 IAM 사용자·그룹·policy를 분리해 자기 범위의 Secret bundle만 읽게 한다.
생성·새 version 추가·폐기 권한은 별도 rotation principal에만 둔다. OKE node instance principal은
동일 node의 Pod를 구분하지 못하므로 정적 Secret 전체 이전에 사용하지 않는다. config-file 인증의 API
signing private key는 부트스트랩 잔존 위험으로 분류하여 SealedSecret으로 배포하고 90일 이내 회전한다.
별도 stage가 없는 개발 기간에는 production에서 기존 Ready Pod 유지, 한 Secret 그룹씩 전환, 실제 smoke,
즉시 rollback 조건을 결합한다. OCI metadata egress 차단은 현재 CNI의 외부 FQDN 허용 경로를 함께 검증한
뒤 적용하며, 그 전에는 workload별 최소 IAM 권한과 init 전용 credential mount를 주 통제로 사용한다.
MFA 암호화키는 keyring과 재암호화 절차 없이 단일 값으로 교체하지 않는다.

OCI Vault와 config-file 인증 init container는 현재 배포 adapter다. 다른 cloud에서도 같은 파일/bootstrap 및 최소권한
계약을 구현할 수 있어야 한다. 2026-08-22 최초 production 전환 범위는 API의 SMTP username/password 두
항목이며, 나머지 DB·MFA·결제·AI·Storage·Worker token은 기존 SealedSecret 소비 경로를 유지한다.

## 출시 게이트

다음 조건을 모두 통과하기 전에는 운영에 배포하지 않는다.

- 두 사용자·두 Workspace 교차 조회/수정/삭제 차단 통합 테스트
- 공개 API에서 draft·연락처·비공개 파일 비노출 테스트
- 캐시·AI·이벤트·벡터의 교차 Workspace 혼입 방지 테스트
- Docker Compose 전체 기동, migration, health, 주요 사용자 흐름 테스트
- 운영 migration 백업·복구·롤백 검증
- 운영 Secret·기본 계정·Actuator·TLS 설정 검증

### Workspace 참여 초대와 역할 변경 경계 (2026-08-11)

플랫폼 가입 자격을 부여하는 `registration_invitation`과 이미 가입한 계정에게 특정 Workspace 참여를
제안하는 `workspace_membership_invitation`은 서로 다른 aggregate와 토큰을 사용한다. Workspace 초대는
권한을 즉시 부여하지 않으며, 수신 이메일과 같은 활성 계정이 fragment 링크의 1회성 토큰을 로그인
상태에서 수락한 뒤에만 Membership을 활성화한다. 토큰 원문은 저장하지 않고 SHA-256 hash만 저장한다.
수신자는 같은 인증 계정으로 초대를 명시적으로 거절할 수도 있다. 거절은 Membership을 만들지 않고
`DECLINED` 종결 시각과 이메일 원문 없는 감사 이벤트만 남긴다.

멤버 초대·취소·역할 변경·제거·소유권 이전은 `OWNER` 또는 제한된 `ADMIN` 권한과 최근 비밀번호
재확인을 모두 요구한다. `ADMIN`은 `EDITOR`·`VIEWER`만 초대·관리할 수 있고 `ADMIN`·`OWNER`를 변경할
수 없다. `OWNER`는 초대로 지정할 수 없고 명시적인 소유권 이전만 허용한다. 소유권 이전은 Workspace
row를 비관적 잠금한 단일 transaction에서 대상 멤버를 `OWNER`, 기존 소유자를 `ADMIN`으로 바꾼다.
OWNER 제거·직접 강등과 자기 자신 제거를 막아 OWNER가 없는 Workspace가 생기지 않게 한다. 플랫폼
역할은 이 권한을 우회하지 않으며 모든 성공 mutation은 이메일 원문 없이 보안 감사 이벤트를 남긴다.
초대 수락·거절도 Workspace row 다음 초대 row 순서로 비관적 잠금해 동일 token의 동시 사용을 직렬화한다.
V218은 활성 OWNER만 `workspace_id`를 갖는 nullable guard에 `UNIQUE`와 `CHECK`를 적용해 DB에서도
Workspace당 활성 OWNER가 둘 이상 생기지 못하게 한다. 소유권 이전은 기존 OWNER guard를 먼저 비운 뒤
새 OWNER를 지정하지만 같은 transaction 안에서 수행되어 외부에는 중간 상태가 보이지 않는다.
V219는 SQL의 `UNKNOWN` CHECK 통과를 막기 위해 활성 OWNER guard에 `IS NOT NULL`을 명시한다.

가입 초대와 Workspace 참여 초대는 사용·수락·거절·폐기 또는 만료 시점부터 기본 30일간만 보존한다.
스케줄러는 유형별 최대 500개 ID를 먼저 고른 뒤 bounded batch로 삭제해 대량 잠금과 급격한 I/O를
피한다. 기존 가입 초대 중 실제 사용 시각을 알 수 없는 행은 V215에서 만료 시각을 보수적인 기준으로
채워 migration 직후 삭제되지 않게 한다. 기간·batch·cron·시간대는 cloud provider와 무관한 환경
설정으로 주입한다.

### Workspace 폐쇄와 물리 삭제 경계 (2026-08-11)

Workspace 탈퇴는 Membership 상태만 `SUSPENDED`로 전환하며 콘텐츠 소유권에는 영향을 주지 않는다.
유일한 `OWNER`는 소유권 이전 없이 탈퇴할 수 없다. Workspace 폐쇄는 OWNER가 최근 비밀번호를 재확인하고
현재 Workspace 이름을 정확히 입력한 경우에만 허용한다. 폐쇄 transaction은 Workspace를 `DELETED`와
`PRIVATE`로 바꾸고 `deleted_at`, 요청자 ID, `purge_after`를 기록하며 모든 활성 Membership을 중지하고
미사용 참여 초대를 폐기한다. 따라서 공개·관리 resolver는 즉시 404를 반환한다.

폐쇄와 물리 삭제는 분리한다. 현재 schema에는 여러 세대의 `workspace_id` 참조와 객체 저장소·벡터·캐시가
섞여 있어 단순 DB cascade를 신뢰하지 않는다. V216의 `purge_after`는 기본 30일 유예 경계를 기록하지만,
실제 purge worker는 참조 inventory, private object 삭제, 벡터·캐시 삭제, 재실행 멱등성, dry-run과
복구 rehearsal이 끝난 뒤에만 활성화한다. 그 전에는 폐쇄를 삭제 완료로 표현하지 않는다.

### Account 탈퇴와 Workspace 보존 경계 (2026-08-13)

Account 탈퇴는 Workspace 폐쇄나 콘텐츠 purge를 대신하지 않는다. 활성 Workspace의 `OWNER` 또는
플랫폼 역할을 가진 사용자는 먼저 소유권을 이전하거나 Workspace를 폐쇄하고 플랫폼 역할을 회수해야
탈퇴할 수 있다. 그 밖의 활성 Membership은 탈퇴 transaction 안에서 `SUSPENDED`로 전환한다.

감사·동의·Workspace 폐쇄와 purge 이력을 보존해야 하므로 `app_user` 행은 물리 삭제하지 않는다.
대신 로그인 ID와 비밀번호 hash를 재사용 불가능한 난수로 교체하고 이메일·canonical 이메일·이메일
인증 시각·닉네임·MFA secret을 제거한 뒤 상태를 `DELETED`로, 표시 이름을 `탈퇴한 사용자`로 바꾼다.
이메일 확인 token과 MFA 복구 코드는 삭제하며 같은 수신 이메일의 대기 Workspace 초대는 폐기하고
수신 식별자를 비가역 대체값으로 교체한다. Workspace 콘텐츠와 purge manifest에는 별도 변화가 없다.

탈퇴 API는 로그인 세션, 로그인 성공 시각과 구분되는 명시적 비밀번호 재인증, 재인증 후 10분 이내,
정확한 확인 문구 `계정 탈퇴`를 모두 요구한다. 로그인 자체는 파괴적 작업의 재인증 증명으로 사용하지
않는다. 완료 후 동일 principal의 모든 세션을 무효화하고 `ACCOUNT_WITHDRAWN` 감사 이벤트를 남긴다.
감사 이벤트에는 과거 이메일·로그인 ID·닉네임을 기록하지 않는다.

V217부터 폐쇄 transaction은 provider-neutral `workspace_purge_job`과 MySQL·Object Storage·Oracle
Vector·Oracle NoSQL·Redis checkpoint를 원자적으로 만든다. purge job에는 불투명 Workspace public
key와 내부 ID, 요청자 내부 ID, 유예 시각·상태·blocker만 기록하고 이름·이메일·콘텐츠·object key
원문은 넣지 않는다. live MySQL의 `workspace_id` 테이블 집합이 versioned manifest와 다르면 dry-run을
차단한다. 분류가 끝났다는 사실과 실제 삭제 준비 완료는 다르므로 adapter·재시도·복구가 검증되기 전
checkpoint는 `BLOCKED`다. 파괴적 purge API와 삭제 gRPC는 제공하지 않고, Worker-only
scheduler는 전체 실행 flag 기본 false로 제공한다.

Object Storage dry-run은 S3 호환 port를 통해 `workspaces/{workspaceId}/` 형식의 좁은 prefix만
허용하고 공개·비공개 버킷의 현재 object·이전 version·delete marker·미완료 multipart 수와 bytes를
반환한다. object key와 provider 오류 원문은 purge 상태나 감사 이벤트에 저장하지 않는다. 일부 S3 호환
provider가 slash-terminated multipart prefix를 잘못 처리하므로 multipart 목록만 bucket pagination 뒤
메모리에서 검증된 prefix를 적용한다. 삭제 adapter는 multipart abort 후 모든 version·delete marker와
남은 현재 object를 provider 상한 1,000개 batch로 삭제하고 동일 inventory가 0건인지 확인한다. 삭제
오류에는 key를 포함하지 않으며 재실행 0건을 정상으로 취급한다. 이 adapter는 기본값이 `false`인 별도
feature flag로 다시 차단하고 Worker 오케스트레이터에만 연결한다. 모든 저장소와 복구 rehearsal을
마치기 전에는 Object Storage checkpoint를 `BLOCKED`로 유지한다.

Oracle Vector는 API가 Oracle datasource를 직접 소유하지 않는다. AI Worker만 `experience_vector`와
`study_vector`를 관리하며, API dry-run은 5초 deadline을 가진 읽기 전용 내부 gRPC로 Workspace별 건수만
받는다. `job_posting_vector`는 공용 catalog이므로 이 계약과 삭제 대상에서 제외한다. Worker 내부
delete adapter는 두 Workspace 테이블만 조건 삭제하고 잔여 0건을 재검증하지만 기본값이 `false`인
`WORKSPACE_PURGE_VECTOR_DELETE_ENABLED` 뒤에 두며 AI Worker 내부 오케스트레이터에만 직접 연결한다.
삭제 controller·gRPC는 노출하지 않는다.
따라서 현재 checkpoint는 후보 수를 표시하되 `VECTOR_DELETE_NOT_ENABLED`로 계속 차단한다. provider
오류 원문은 checkpoint에 저장하지 않는다. 현재 gRPC는 ClusterIP/Compose 내부 plaintext inventory
전용이며 콘텐츠나 식별정보를 반환하지 않는다. 향후 파괴적 RPC가 필요해지면 별도 서비스 인증·mTLS와
purge job authorization을 먼저 구현하고, 그 전에는 delete 메서드를 네트워크 계약에 추가하지 않는다.

Redis purge는 Spring Cache의 실제 생성 annotation을 source of truth로 삼는다. 명시적 Workspace key인
`workspace-visitor:summary::{workspaceId}`, `experience-tree:*::{workspaceId}:*`,
`print_template:public::{workspaceId}`만 Workspace scope registry에 둔다. 세션, 플랫폼 방문 통계, 후원,
아키텍처 cache는 제외한다. 과거 Workspace 식별자가 없던 `bff:introduction`, `bff:learning`,
`print_template:public` legacy key는 정확한 소유자를 판별할 수 없으므로 purge 시 해당 파생 cache
namespace 전체를 비운다. 이는 원본 데이터 삭제가 아니며 다른 Workspace의 cache miss만 유발한다.
운영 Redis에서 blocking `KEYS`를 사용하지 않고 cursor `SCAN`으로 중복 제거한 뒤 `UNLINK`하고 0건을
재검증한다. 삭제는 기본값이 `false`인 `WORKSPACE_PURGE_CACHE_DELETE_ENABLED` 뒤에 두고 Worker
오케스트레이터에만 연결한다. 오류 시 key/provider 원문은 checkpoint에 기록하지 않는다.

Oracle NoSQL의 채용공고 read model은 Workspace 데이터가 아니라 Platform shared catalog로 분류한다. 새
기본 테이블 `JobPostingCatalogReadModel`은 공고 ID·회사·제목·상태·지원 URL·갱신 시각만 허용하며
Workspace·사용자 식별자와 `matchScore`·`matchSummary`를 저장하지 않는다. 개인화 매칭은 MySQL의
`workspace_job_application`만 source of truth로 사용한다. purge dry-run은 provider-neutral port를 통해 실제
schema를 code-owned allowlist로 검사한다. 이전 `JobPostingReadModel`이 존재할 수 있으므로 해당 테이블의
행 수를 별도로 검사하고 1건이라도 있으면 소유자를 안전하게 판별할 수 없어 fail-closed한다. 새 catalog
schema가 일치하고 레거시 행이 0건일 때만 NoSQL checkpoint를 후보 0건 `READY`로 표시하며 delete 계약은
제공하지 않는다. provider/schema 오류 원문은 checkpoint에 저장하지 않는다.

MySQL 물리 삭제는 각 도메인 테이블을 임의 순서로 직접 삭제하지 않는다. 실행 직전에 실제
`workspace_id` 테이블 집합과 Workspace 직접 FK의 delete rule을 code-owned manifest와 비교하고, 알 수
없는 테이블·누락·FK drift가 하나라도 있으면 차단한다. 현재 계약은 직접 자식 18개 `CASCADE`, 참여 초대
1개 `NO ACTION`, FK 없는 감사 이벤트와 purge 제어 row다. transaction 안에서 참여 초대를 선삭제하고,
감사 이벤트의 `actor_user_id`, `workspace_id`, `target_id`, `request_id`, `ip_hash`를 `NULL`로 만들어 사건
유형·결과·사유·시각만 보존한 뒤 Workspace를 삭제한다. cascade 후 모든 Workspace row와 감사 연결값이
0건인지 확인하고 purge 제어 row는 보존한다. 이미 삭제가 끝난 Workspace의 재실행은 잔여 0건을 검증해
성공으로 처리한다. 삭제는 기본값 false의 별도 flag 뒤에 두고 Worker에서도 항상 마지막에
호출한다.

Worker 오케스트레이터는 job row를 pessimistic lock으로 짧게 claim한 후 provider 호출을 DB
transaction 밖에서 수행한다. 고정 순서는 NoSQL 공통 catalog 제외 확인, Object Storage,
Oracle Vector, Redis, MySQL이다. 완료 checkpoint는 skip하고 실패 지점에서 재개하며,
각 저장소 실행 전 lease를 갱신하고 2시간 이상 갱신되지 않은 `PURGING`은 stale lease로
재claim한다. claim 시도 번호를 fencing token으로 검증해 이전 Worker의 느린 checkpoint commit을
차단한다. 각 adapter의 0건 재실행을
성공으로 취급해 provider 성공 후 checkpoint commit 전 crash도 복구한다. 첫 외부 삭제 전에 MySQL
manifest·폐쇄·유예 경계를 재검증하고 NoSQL catalog 제외 시점에도 schema·레거시 개인화
0건을 재검증한다. 실행은
`WORKSPACE_PURGE_EXECUTION_ENABLED`및 네 저장소 flag가 모두 true일 때만 가능하고 현재 배포
manifest의 모든 값은 false다.

로컬 복구 rehearsal은 현재 MySQL의 transaction-consistent logical backup을 고유한 disposable clone에
복원한 뒤에만 30일 유예가 지난 fixture를 만든다. clone의 table·Flyway history·Workspace 수가 source와
일치하지 않으면 fail-closed한다. 같은 실행에서 S3 호환 version/delete marker/multipart, Oracle Vector,
Redis 전용 DB와 NoSQL catalog 제외를 통과하고 MySQL을 마지막으로 삭제해 5개 checkpoint 완료·잔여
0건·재실행 멱등성을 검증한다. 2026-08-11 로컬 Compose rehearsal은 통과했지만 이는 현재 logical
backup과 로컬 provider adapter의 증적이다. 운영 backup 보존기간과 OCI provider 복구를 별도 승인하기
전에는 실행 flag를 열지 않는다.

Backup 보존 상한은 Workspace 삭제 유예를 초과하지 않는다. 복원은 외부 트래픽과 purge scheduler가
꺼진 maintenance 환경에서 수행하고, 공개 전에 폐쇄·purge job/checkpoint를 현재 시각 기준으로 다시
조정한다. production overlay에서 purge flag를 열려면 provider-neutral release gate가 암호화·복원·
public/private bucket versioning·보존 상한·복원 후 purge reconciliation 증적을 요구한다. 실제 provider
증적은 role과 내부 참조만 기록하고 Secret·실명·Workspace 원문을 저장하지 않는다.

복원 후 reconciliation은 deterministic repair만 허용한다. `DELETED` Workspace의 누락된 purge
job/checkpoint, 복원된 활성 Membership·초대, 중단된 `PURGING` lease는 정해진 규칙으로 복구하지만 활성
Workspace와 purge job의 공존, terminal job 뒤 남은 Workspace처럼 해석이 여러 개인 모순은 blocker로
중단한다. `APP_RUNTIME_ROLE`을 `api`와 `worker`로 명시해 purge scheduler와 reconciliation runner는
Worker에만 생성한다. reconciliation은 maintenance=true, 실행 flag=false인 Service 비노출 격리
Worker에서만 실행하고 운영 공개 전에 blocker 0과 dry-run을 승인한다. release gate는 장기 실행
Deployment의 maintenance/reconciliation false와 두 runtime role 선언을 함께 검사한다.

## 구현 상태 (2026-08-11)

### 로컬 개발 자원 경계 (2026-08-11)

Docker Compose 프런트 개발 서버는 장기 실행 시 생성되는 cache를 운영 데이터와 분리한다. 관리 route
최초 webpack compile이 2 GiB hard limit에서 OOM 종료되는 것이 확인되어 container limit는 3 GiB,
Node heap은 2.25 GiB로 조정한다. 이는 compile burst 상한이며 평상시 총 사용량을 줄이는 core·
AI/vector·observability Compose profile 분리는 후속 작업으로 추적한다.
Docker 전용 webpack dev mode에서는 filesystem cache를 끄며, production standalone image와 OCI·AWS·
Azure 배포 adapter에는 이 결정을 전파하지 않는다. 정리 절차는 재생성 가능한 image/build cache와
정확히 식별한 프런트 익명 cache volume만 대상으로 하고, Workspace·계정 데이터를 담는 DB volume은
보존한다. 프런트의 `node_modules`와 `.next`도 익명 volume 대신 이름 있는 Compose volume으로 관리해
컨테이너 재생성 시 소유권을 잃은 volume이 반복 생성되지 않게 한다.
로컬 세션 cookie jar와 token 파일은 저장소 경로에 보관하지 않고 Git 제외 대상으로 둔다. 점검 중
cookie·token·Secret 원문을 출력하지 않으며, 임시 파일이 꼭 필요하면 최소 권한과 임시 경로를 사용하고
검증 종료 뒤 제거한다.

완료:

- DB 사용자, Workspace, Membership, 플랫폼 역할과 기존 운영자 bootstrap
- 기본 거부 API 정책, 공개/비공개 프로필 DTO 분리
- 프로필·경력·Study Workspace 소유권, 객체 저장소 key의 Workspace namespace
- 공통 Skill 정의와 Workspace별 숙련도·설명·핵심 여부·노출 순서 분리
- Competency Workspace 소유권과 경력·Study 연결의 동일 Workspace 검증
- 대표 프로젝트 배치는 별도 전역 소유자가 아니라 Experience의 Workspace를 상속하며, 조회·전체
  교체·관리 UI 모두 canonical Workspace context를 사용한다. 요청 목록 전체의 소유권과 상세 경험
  소속을 검증한 뒤에만 기존 편성을 교체한다. V209는 편성 상세 연결에 `experience_id`를 함께
  저장하고 편성·상세 경험 양쪽에 복합 외래키를 적용해 동일 Experience 조건을 DB에서도 강제한다
- 공개 Introduction의 Skill·Competency·대표 프로젝트 Workspace 격리
- 경력 벡터 Workspace 조건과 Oracle 검색 adapter 격리
- Study·Experience 관리 mutation의 명시적 Workspace context와 Membership 인가
- Tag의 Workspace 소유권과 `(workspace_id, slug/name)` 유일성
- 공통 Taxonomy node와 Workspace별 Study 공개 큐레이션 분리
- Study 벡터 저장·삭제·검색의 Workspace 조건
- Skill 연결 조회·수정의 Workspace 조건과 사용 중인 Skill 제거 차단
- Profile·Experience·Study·Skill·Competency 관리 UI의 canonical Workspace API 전환
- Portfolio Case Study의 Workspace 소유권, Workspace별 slug, 프로젝트·Study·상세 근거·파일 key 검증
- PrintTemplate의 Workspace 소유권과 canonical 조회·수정 API. 채용공고 연결은 공고
  catalog/Workspace 지원 overlay 분리 전까지 일반 Workspace API에서 차단
- 일반 Workspace 관리 셸의 Portfolio UI 개방. 미격리 Portfolio AI 입력은 계속 플랫폼 운영자만 사용
- 레거시 Portfolio AI·PDF 초안 엔드포인트는 bootstrap 공개 Workspace로 범위를 제한하고,
  Workspace ID가 없는 임의 케이스스터디·출력 서식 ID 접근을 차단
- LearningResource 공통 catalog와 Workspace별 저장·상태·우선순위·개인 메모·Tag overlay,
  Membership 기반 canonical API
- JobPosting 공통 원본과 Workspace별 저장·지원 상태·메모·관심도·분석·상태 이력 overlay,
  Membership 기반 canonical API
- LearningResource의 Workspace catalog 선택·상태·우선순위·개인 메모 UI
- StudyPlan root Workspace 소유권, 후보·숙련도·AI 프로필 근거 격리와 일반 Workspace 관리 UI
- JobPosting 공통 catalog 선택과 Workspace 지원 상태·메모·관심도·상태 이력 관리 UI. 공고
  수집·AI·자기소개서·PDF 운영 화면은 별도 플랫폼 메뉴로 분리
- V205 자기소개서 문항·답변의 Workspace 지원 건 소유권, revision 상속 검증, 일반 Workspace 수동
  작성 UI와 Workspace 자기소개서 AI 경로
- V206 Workspace별 어필 분석과 Gap 문서 소유권·경력 RAG 격리 및 일반 Workspace UI
- 채용공고 PDF AI 초안의 Workspace 지원 건·이력·벡터·PrintTemplate 격리와 canonical SSE API
- 최종 제출 PDF의 Workspace+scope 검증, 비공개 버킷 라우팅, 만료 서명 다운로드 URL
- JobPosting catalog 벡터와 Workspace 매칭 결과 분리. 재계산은 현재 Workspace Skill만 읽고
  `workspace_job_application`에 저장하며 공용 수집·새로고침은 개인 점수를 계산하지 않음
- 의사결정 온톨로지 공통 catalog와 Workspace Study 연결 overlay 분리. 링크의 Workspace 소유권,
  Study와의 복합 FK, Workspace별 캐시 키, canonical 공개·관리 API와 UI 적용
- 플랫폼 MFA 제한 세션, AES-256-GCM 비밀키 저장, TOTP 로그인
- 운영자 30분 세션, 동시 세션 2개, 전체 기기 로그아웃, 최근 재인증 기반
- IP·기기 HMAC fingerprint 변경 감사
- Workspace 메뉴와 플랫폼 운영 메뉴의 프론트 노출 분리
- 공개 Workspace 방문 통계의 별도 저장·조회, `OWNER`/`ADMIN` 관리 권한과 플랫폼 전체 통계 분리
- 공개 revision 이력 조회, 과거 snapshot을 새 불변 revision으로 복원하는 rollback, 최근 개수와 최소
  기간을 함께 적용하는 보존 정책과 Workspace 관리 UI
- V213 canonical Workspace slug registry, 과거 alias 해석, 공개 페이지 308 redirect, 최근 재인증 기반
  `OWNER`·`ADMIN` 주소 변경 UI와 감사 이벤트
- V214 Workspace 참여 초대의 별도 수명주기·hash token·이메일 수락, `OWNER`/`ADMIN` 역할 경계,
  최근 재인증 기반 멤버 제거·역할 변경과 원자적 소유권 이전 UI·감사 이벤트
- V215 Workspace 참여 초대 거절과 가입·Workspace 초대의 종결 시각 기반 30일 보존·bounded 자동 삭제
- V216 Workspace 이름 변경, 비OWNER 자발적 탈퇴, OWNER 탈퇴 차단, 즉시 접근을 끊는 2단계 폐쇄와
  물리 purge 예정 시각 기록
- V217 Workspace purge job·저장소별 checkpoint·MySQL manifest drift 감지·운영자 dry-run 기반.
  Object Storage·Oracle Vector·Redis inventory와 멱등 삭제 adapter, Worker-only 순차 실행·stale
  lease 재claim·실패 지점 재개까지 구현했다. 로컬 backup clone과 5개 checkpoint 전체 rehearsal도
  통과했다. 복원 maintenance reconciliation과 API/Worker runtime role 격리도 로컬에서 검증했으며
  전체·provider flag는 모두 false
- 로컬 Docker Compose에서 임시 일반 사용자 두 명과 공개 Workspace 두 개를 생성해 실제 세션·CSRF로
  Profile, Study, 핵심 프로젝트 편성, 방문 통계의 교차 조회·수정·삭제·연결을 차단하는 반복 실행 E2E
- Support Access 요청·Workspace OWNER 승인·거절·양측 철회·15~60분 자동 만료·범위별 최소 진단과
  감사 이벤트를 V227 및 canonical API로 구현했다. 플랫폼 운영자는 일반 관리 화면으로 가장하지 않고,
  승인된 범위에서도 설정 여부와 개수만 확인한다. 원문·연락처 값과 쓰기 권한은 제공하지 않는다.
  Compose 재빌드와 V227 적용, backend/frontend 헬스 확인까지 완료했다.
- V226 복구 코드의 1회 소비를 복구 코드 로그인 세션에만 귀속하고, 15분 안에 비밀번호를 다시
  확인한 뒤 새 TOTP를 검증해야만 기존 암호화 secret과 복구 코드 묶음을 한 트랜잭션에서 교체하는
  MFA 재등록 흐름. 완료 시 모든 세션을 무효화하며 중간 단계에서는 기존 MFA를 해제하지 않는다.

운영 배포 차단 조건:

- 운영 private bucket 프로비저닝·기존 최종 PDF 이관, 악성 파일 검사, 삭제 전파 검증
- 모든 인증 수단과 복구 코드를 함께 잃은 계정의 별도 신원 확인·운영 복구 절차 및 운영
  `MFA_ENCRYPTION_KEY` SealedSecret
- 운영 백업/복구 rehearsal
- 운영 SMTP·비밀번호 유출 blocklist provider, 가입·Workspace 초대 보존기간과 cleanup 지표·실패 알림
- 실명 인증 provider와 암호화·접근 감사·보존·삭제 정책

비공개 베타 이후 제품 결정:

- JobPosting catalog vector를 개인 추천에 실제 사용할 경우 후보 범위·거리 임계값·Workspace 결과
  snapshot·삭제 전파 계약과 E2E를 먼저 확정한다. 현재 수동 재매칭 경계는 완료했으며, 비공개 베타에서는
  catalog vector 추천을 출시 범위에 넣지 않는다.
- 온톨로지의 Experience·회고 연결은 기능을 추가할 때 동일한 Workspace overlay·복합 FK 규칙을 적용한다.
- 플랫폼 기본 PrintTemplate catalog와 Workspace 복사본 모델은 유료 템플릿 정책을 정한 뒤 별도 설계한다.
  현재 Workspace PrintTemplate canonical API와 일반 사용자 UI는 구현 완료 상태다.
- Competency vector는 다시 활성화할 때 Workspace vector schema·cache 검증을 추가한다. 현재 Competency AI
  입력의 Workspace 격리는 구현·검증 완료 상태다.
- 역할로 잠긴 `/api/admin/**` 호환 endpoint와 canonical Workspace API가 없는 레거시 도메인의 비공개
  베타 이후 유지·이관·제거 시점을 결정한다.

## Flyway V1 재기준화 결정 (2026-08-15)

- 현재 운영 스키마와 전체 V1~V235 migration을 빈 MySQL 8.0에 재생한 결과를 비교해 새 기준 스키마를
  확정한다. 특정 개발자 로컬 DB나 Hibernate 자동 변경 결과는 기준으로 사용하지 않는다.
- 새 `V1__baseline_schema.sql`은 109개 애플리케이션 테이블의 DDL만 포함한다. 개인 데이터와 seed 데이터는
  포함하지 않으며 기존 데이터는 백업과 기존 DB에 보존한다.
- 새 DB는 V1 SQL migration을 실행한다. 기존 로컬·운영 DB는 V1을 재실행하지 않고 Flyway의 baseline
  version 1만 기록한다. 따라서 다음 공통 변경은 V2부터 시작한다.
- `baseline-on-migrate`는 기존 DB 전환 과정의 일회성 명시 설정이며 상시 활성화하지 않는다.
  `out-of-order`는 비활성화하고 Hibernate는 `validate`만 사용한다.
- 기존 `flyway_schema_history`는 즉시 삭제하지 않고 검증 기간 동안 이름을 바꿔 보존한다. 백업 복원
  rehearsal과 전환 전후 비교가 끝나기 전에는 운영 이력을 변경하지 않는다.
- 기존 140개 migration을 빈 MySQL 8.0에 재생한 스키마와 운영 스키마를 정규화해 비교한 결과 구조 차이가
  없었다. 생성한 V1은 신규 DB의 SQL migration 경로, 기존 DB의 BASELINE 경로, Hibernate `validate`를
  각각 통과했다.
- 과거 migration이 명시한 타입과 엔티티 선언이 달랐던 네 필드는 운영 스키마를 기준으로 엔티티를
  `BINARY(32)`, `CHAR(64)`, `DECIMAL(4,3)`, `TINYINT`에 맞췄다. Hibernate 자동 DDL 보정은 사용하지 않는다.
