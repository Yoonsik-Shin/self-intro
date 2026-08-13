# Workspace 콘텐츠 안정화 계획

- 기준일: 2026-08-12
- 상위 변경 세트: `04-workspace-content`
- 원칙: Account는 로그인 주체이고 Profile·Experience·Study·Portfolio·PrintTemplate 같은 개인 콘텐츠의
  소유 경계는 Workspace다. 전역 catalog와 Workspace overlay를 구분한다.

## 1. 하위 경계

상위 inventory 기준 Workspace 콘텐츠 변경은 143개다. 세 AI 초안 controller·service·test를
Workspace 경계에 포함하면서 기존 137개보다 6개 늘었다. 하위 표는 원래 137개 기준의 세부 감사 단위를
보존하고, 추가 6개는 Experience·Study·Skill·Competency와 교차 gate에 포함한다.

| 순서 | 경계 | 경로 수 | 핵심 검증 |
| ---: | --- | ---: | --- |
| 0 | 공개 발행·BFF | 19 | draft 직접 노출 금지, revision snapshot만 공개 |
| 1 | Profile | 7 | 연락처 기본 비공개, Workspace별 단일 Profile |
| 2 | Experience | 22 | ID·slug·배치·연결의 Workspace 일치 |
| 3 | Experience tree | 7 | situation·Study link 교차 연결 차단 |
| 4 | Study·Taxonomy | 16 | 전역 taxonomy와 Workspace Study·curation 분리 |
| 5 | Skill·Competency | 16 | 전역 Skill catalog와 Workspace 표현·연결 분리 |
| 6 | Learning resource | 9 | 전역 자료 catalog와 Workspace overlay 분리 |
| 7 | Portfolio·Print·Storage | 24 | case study·template·object key scope 일치 |
| 8 | Visitor·Donation | 16 | Workspace 방문 통계와 플랫폼 후원 운영 분리 |
| 9 | 교차 Workspace gate | 1 | 두 사용자·두 Workspace 실제 세션 E2E |

수동 미분류 경로는 0개다.

## 2. 데이터 소유권 기준

- 전역 catalog: Taxonomy node, Skill 정의, LearningResource 원본, JobPosting catalog
- Workspace 원본: Profile, Experience, Study, Competency, PortfolioCaseStudy, PrintTemplate
- Workspace overlay: WorkspaceSkill, WorkspaceLearningResource, StudyTaxonomyCuration
- 공개 projection: WorkspacePublicationRevision과 resource snapshot
- 플랫폼 운영: 전역 catalog 편집, 초대, 전체 방문 통계, purge 상태

전역 catalog endpoint에는 플랫폼 역할이 필요하다. Workspace 원본·overlay endpoint에는 URL의 slug와
활성 Membership을 다시 확인하며, 단독 entity ID나 플랫폼 역할만으로 Workspace 데이터를 선택하지 않는다.

## 3. 이번 라운드에서 확인·수정한 사항

Workspace 관리 셸의 `PDF 템플릿 관리`가 Workspace 화면 안에서도 legacy
`/api/admin/print-templates`와 전역 포트폴리오·BFF·지원 공고 API를 사용하고 있었다. 다음 경로를
명시적 Workspace API로 전환했다.

- 목록·수정·삭제·포트폴리오 배치·revision:
  `/api/workspaces/{slug}/print-templates/manage/**`
- 케이스스터디: `/api/workspaces/{slug}/portfolio/case-studies/manage/**`
- 소개 원본: `/api/bff/workspaces/{slug}/introduction`
- 지원 현황: `/api/workspaces/{slug}/job-applications/manage`

React Query key에도 Workspace slug를 포함해 Workspace를 전환했을 때 이전 사용자의 템플릿·포트폴리오
응답을 재사용하지 않는다. 전역 Worker 기반 PDF AI 버튼과 revision chat은 명시적 Workspace 계약이
없으므로 플랫폼 역할 여부와 무관하게 Workspace 관리 화면에서 노출하지 않는다.

Experience·Study·Competency의 AI 초안은 더 이상 관리 UI에서 `/api/admin/**`를 호출하지 않는다.
각각 `/api/workspaces/{slug}/experiences/manage/ai`, `/studies/manage/ai`, `/competencies/ai`를 사용하며
서버는 URL Workspace의 `OWNER`, `ADMIN`, `EDITOR` Membership을 확인한다. 선택 ID뿐 아니라 선택이 없는
전체 후보도 현재 Workspace repository로 제한하고, 요청 ID가 다른 Workspace 소유면 provider 호출 전에
400으로 거부한다. 다른 Workspace Membership으로 endpoint 자체를 호출하면 404로 숨긴다.

PrintTemplate 편집·출력 설정은 이미 canonical Workspace API만 사용하므로 일반 Workspace의 `페이지
구성` 메뉴로 이동했다. 포트폴리오 AI revision은 canonical Workspace endpoint가 없어 관리 셸에서
비활성화하며, 템플릿 CRUD 자체는 Workspace `OWNER`, `ADMIN`, `EDITOR`가 사용한다.

관리 셸의 실시간 미리보기도 플랫폼 운영자 여부와 무관하게 현재 URL의 Workspace를 기준으로 읽는다.
기존에는 플랫폼 운영자에게만 미리보기를 열면서 default 공개 Workspace의 BFF와 전역 Skill API를
사용했기 때문에, 운영자가 다른 Workspace를 관리할 때 미리보기 데이터가 섞일 수 있었다. 현재는 다음
두 query를 모두 slug로 namespace한다.

- 소개 snapshot: `/api/bff/workspaces/{slug}/introduction`
- Workspace Skill overlay: `/api/workspaces/{slug}/skills`

`/ops` 라우트의 초대 운영 화면은 Workspace 관리 셸에서도 재사용하지만, Next.js page 모듈은 default
component만 export하도록 유지한다. 이 규칙을 위반해 발생하던 production build type 오류도 함께
수정했다.

## 4. 검증 결과

- `npx tsc --noEmit`: 통과
- `npm run build` (`next build --webpack`): 통과
- `SaasSecurityFoundationIntegrationTest`, `PrintTemplateServiceTest`: 통과
- Workspace AI 서비스 3종 단위 테스트와 비멤버 404 통합 테스트: 통과
- 최신 backend Compose image의 9단계 교차 Workspace E2E: 통과
- 전체 `:api:test`: 통과
- `docker compose up -d --build frontend-next`: 최신 backend/frontend 구성으로 기동
- `scripts/e2e/workspace-isolation-compose.sh`: 9단계 전부 통과

Compose gate는 두 사용자·두 Workspace의 실제 세션을 사용해 Profile, 공개 snapshot/revision/rollback,
Study, Experience Tree 연결, Skill overlay, Competency, 핵심 프로젝트 편성, 방문 통계,
Membership·소유권 이전·폐쇄·purge checkpoint 경계를 검증한다. Workspace 일반
계정의 플랫폼 전체 방문 통계·후원 내역 접근은 403으로 차단하고, 후원 버튼 공개 설정만
익명 조회를 허용한다. 잘못된 검증 토큰의 Ko-fi Webhook은 400으로 거부되며 DB에 후원
행을 남기지 않는다.

Study와 Experience Tree의 활성 관리 UI는 canonical Workspace API만 사용한다. Compose gate는 다른
Workspace의 Study ID로 온톨로지 링크 생성, 링크 ID 수정·삭제, 관리 인덱스 조회를 모두 404로 숨기고
원본 링크가 보존되는지 확인한다.

Competency의 Skill 연결은 전역 catalog 존재 여부만으로 허용하지 않는다. 요청 Skill ID 전체가 현재
Workspace의 `workspace_skill` overlay에 있어야 하며, overlay를 추가하지 않은 다른 Workspace가 같은
catalog Skill ID를 연결하면 400으로 거부한다. 같은 catalog Skill을 각 Workspace가 독립 overlay로
추가한 뒤에는 서로 다른 Competency에서 정상 사용할 수 있다.

JobPosting은 전역 catalog지만 지원 상태와 PrintTemplate은 Workspace 소유다. Compose gate는 동일
JobPosting을 두 Workspace가 독립 지원 건으로 저장한 뒤, 각 Workspace에서 발급한 최종 PDF key가
`workspaces/{workspaceId}/print-template/final-pdf/**`로 분리되는지 확인한다. 다른 Workspace의 object
key 연결은 400, PrintTemplate ID 조작과 지원 건 템플릿 목록 조회는 404이며 원본 최종본은 보존된다.

Profile·Experience의 관리 UI는 이미 canonical Workspace API만 사용했고 legacy client 메서드의
실제 호출처는 0개였다. 따라서 `/api/profile`, `/api/profile/admin`, `/api/admin/experiences`와
`/api/experiences` 아래의 create/update/delete/timeline mutation을 제거했다. `/api/experiences` GET은
플랫폼 공개 페이지 호환을 위해 읽기 전용으로 유지하고, AI 운영 API는 플랫폼 역할 경계를
그대로 유지한다. RequestMapping 통합 테스트가 모호한 mutation handler의 재등장을 차단한다.

Compose gate는 backend 재기동 직후 502를 테스트 실패로 오인하지 않도록 60초 내
`/actuator/health == UP`을 먼저 기다린 뒤 fixture를 생성한다.

default Workspace BFF 감사에서 `/api/bff/learning`과 관련 client·DTO는 실제 호출처가 0개여서
제거했다. 인쇄 route를 `/workspace/{slug}/print`로 이관하고 RESUME 소개, 공개·관리
PrintTemplate, revision, 저장 API가 모두 같은 slug를 사용하게 했다. 이에 따라 전역 `/print`
route와 `/api/bff/introduction` default endpoint를 제거했다. canonical slug가 바뀐 경우 query를
보존하며 canonical Workspace 인쇄 URL로 redirect한다.

제거된 endpoint 요청이 Spring 정적 리소스 탐색으로 넘어갈 때 발생하는
`NoResourceFoundException`도 404로 정규화했다. 일반 500 처리로 빠져 내부 오류처럼 보이지 않도록
예외 계약 테스트를 추가했고, Compose gate에서 default BFF 404, canonical Workspace 인쇄 200,
전역 `/print` 404를 함께 검증한다.

## 5. 다음 검토 순서

Visitor·Donation 경계 검증과 Profile·Experience의 legacy current/default Workspace mutation 제거를
완료했다. 인쇄·BFF default Workspace 경로도 slug 계약으로 전환했으므로 Workspace 콘텐츠
변경 세트의 구현 범위는 완료됐다. backend health gate를 포함한 Compose 9단계 회귀에서 두 사용자·두
Workspace의 교차 접근 차단, default BFF 404, canonical 인쇄 200, legacy 인쇄 404까지 모두 통과했다.
다음 변경 세트는 `05-jobs-ai-vector`다.

실제 stage·commit과 운영 배포는 전체 경계 검토 및 회귀 gate 완료 후 별도 승인으로 진행한다.
