# ADR-003: 공개 페이지 구성·revision과 다중 도메인 taxonomy

- 상태: Accepted, schema v3·canonical 공개 구성 구현 완료·레거시 컬럼 제거 대기
- 결정일: 2026-08-12
- 관련 문서: [제품 기능 지도](../product/feature-map.md),
  [SaaS 운영 가이드](../operations/saas-operations-guide.md)

## 배경

초기 모델은 `Profile.publicEmail`, `Experience.showOnTimeline`, `Study.PUBLISHED`처럼 원본 기록에
공개 여부를 함께 저장했다. 이 방식은 사용자가 기록을 수정하는 일과 방문자에게 노출할 내용을 편집하는
일을 혼동하게 하고, 하나의 공개 revision이 실제 선택·순서·taxonomy 상태를 온전히 설명하지 못한다.

또한 현재 taxonomy는 개발자 중심의 전역 트리 하나다. 디자인·마케팅·데이터 분석 등 다른 직군이
가입하면 같은 트리에 모든 분류를 섞거나 플랫폼 운영자가 사용자별 분류를 직접 만들어야 한다.

## 결정

### 1. 원본 기록은 공개 상태를 소유하지 않는다

`내 기록`의 Profile·Experience·Study·Skill 등은 사실과 근거만 저장한다. 공개 여부, 공개 순서,
표시 이름과 강조 방식은 `공개 페이지`의 Workspace별 구성에서만 관리한다.

레거시 공개 컬럼은 backfill 검증이 끝날 때까지 읽기 호환용으로 남기되 신규 UI와 canonical API는
새 공개 구성만 변경한다. 제거는 별도 migration과 회귀 테스트를 거친다.

### 2. 공개 페이지는 세 영역으로 구성한다

- `프로필 구성`: 기본 정보·연락처·대표 기술·대표 역량
- `경험 구성`: 경험·세부 성과·타임라인·대표 프로젝트·포트폴리오·경험 온톨로지
- `학습 구성`: 공개할 Study와 순서, 공개 탐색에 쓸 taxonomy/category

프로필과 경험은 편집 단위 자체의 이력이 중요하므로 각각 불변 revision을 갖는다. Study는 별도의
편집 revision을 만들지 않는다. 대신 Workspace 전체 공개본을 발행할 때 선택된 Study 본문·순서와
taxonomy 표시 상태를 snapshot으로 고정한다.

### 3. 전체 공개본이 하위 상태를 고정한다

`WorkspacePublicationRevision` schema v3는 다음을 함께 고정한다.

- `profileRevisionId`
- `experienceRevisionId`
- 공개 Study content snapshot
- 공개 taxonomy scheme/node snapshot
- 공개 페이지가 사용하는 나머지 projection resource

원본이나 공개 구성 초안을 바꿔도 새 공개본을 발행하기 전에는 방문자 응답이 바뀌지 않는다. rollback은
과거 전체 revision을 다시 활성화하며 현재 초안을 덮어쓰지 않는다.

### 4. taxonomy는 버전이 있는 domain template다

플랫폼은 `software-engineering`, `design`, `marketing`, `data-analysis` 같은 scheme family를 버전별로
제공할 수 있다. Workspace는 필요한 scheme을 여러 개 구독하고 하나를 기본값으로 정할 수 있다.

Workspace 고유 분류가 필요하면 플랫폼 원본을 수정하지 않고 Workspace 소유 custom scheme 또는
override를 만든다. 플랫폼 scheme의 새 버전은 기존 버전을 제자리 수정하지 않고 새 version으로 배포한다.
Workspace가 명시적으로 전환하기 전까지 기존 기록과 공개 revision은 이전 node stable key를 유지한다.

### 5. 기록 분류와 공개 탐색 선택은 별도다

- `study_taxonomy_node`: 원본 Study가 어떤 node에 분류되는지
- 공개 학습 구성: 어떤 Study와 taxonomy node를 방문자에게 보여줄지
- `workspace_taxonomy_scheme_subscription`: Workspace 편집 화면에서 사용할 scheme

분류했다고 자동 공개되지 않고, 공개 taxonomy를 선택했다고 해당 분류의 모든 Study가 자동 공개되지
않는다.

## 권한과 보안

- 플랫폼 scheme 원본 생성·version 발행·폐기는 플랫폼 운영자만 수행한다.
- Workspace scheme 구독과 공개 구성은 해당 Workspace `OWNER`, `ADMIN`, `EDITOR`가 편집한다.
- 전체 공개본 발행·공개 중지·rollback은 `OWNER`, `ADMIN`만 수행한다.
- 플랫폼 역할만으로 다른 Workspace의 원본·초안·revision을 읽거나 수정할 수 없다.
- public API는 활성 publication revision에 포함된 snapshot만 반환한다.

## 이행 순서

1. versioned taxonomy scheme와 Workspace 구독을 도입하고 기존 트리를
   `software-engineering` v1로 backfill한다.
2. 프로필·경험·학습 공개 구성 draft와 기존 공개 플래그 backfill을 추가한다.
3. canonical Workspace 공개 구성 API와 관리 UI를 만든다.
4. publication schema v3 projection과 category revision을 적용한다.
5. old UI mutation을 차단하고 검증 후 레거시 공개 컬럼·endpoint를 제거한다.

## 현재 구현 상태

- V220: `taxonomy_scheme`, Workspace scheme 구독, 기존 software engineering tree v1 backfill
- V221: 세 공개 구성 draft와 프로필·경험 category revision 저장소, 레거시 선택값 backfill
- V222: 전체 publication의 profile/experience revision pointer와 draft config version
- 전체 발행 schema v3: 프로필·경험 category revision 생성, Study·taxonomy resource snapshot,
  draft dirty marker 정리, 과거 schema와 public response 호환 유지
- Workspace `학습 구성`에서 여러 scheme을 구독하고 대표 scheme을 지정하는 UI를 제공한다. scheme을
  바꾸면 해당 구독에 속한 node만 공개 탐색 카테고리 후보로 다시 불러온다.
- 원본 Profile 화면의 연락처 공개 mutation과 플랫폼 taxonomy 화면의 구형 Study 공개 curation UI는
  제거했다. 공개 연락처·학습 카테고리 선택은 공개 페이지 구성에서만 변경한다.
- Experience·Competency 원본 화면의 공개·숨김/타임라인/세부 항목 노출 제어와 canonical 전용 mutation
  endpoint를 제거했다. canonical create는 레거시 공개 플래그를 안전한 기본값으로 만들고 update는 기존
  값을 보존하므로 source request로 공개 상태를 바꿀 수 없다.
- Study의 레거시 `DRAFT/PUBLISHED` 저장값은 migration 호환을 위해 유지하되 관리 UI에서는 공개 상태가
  아닌 `작성 중/작성 완료` 편집 상태로만 표현한다. Study와 taxonomy의 실제 공개 선택은 `학습 구성`,
  방문자 상세 응답은 활성 publication resource snapshot만 사용한다.
- Workspace Study 원본 화면과 canonical API에서 구형 taxonomy curation을 제거했다. scheme 구독과 공개
  탐색 node 선택은 `공개 페이지 > 학습 구성`에서만 변경한다.
- 남은 단계: 회귀 검증 후 레거시 공개 컬럼과 bootstrap `/api/admin/**` 공개 mutation의 제거 migration

## 기각한 대안

- 원본 엔티티의 boolean 공개 플래그 유지: 수정과 발행의 경계가 계속 섞이고 revision 재현성이 없다.
- 모든 직군을 전역 트리 하나에 추가: 이름 충돌과 권한·탐색 복잡도가 커진다.
- Study별 독립 revision 생성: Markdown 원본 이력과 공개본 snapshot이 중복되고 사용자 흐름이 과도하게
  복잡해진다.
- 플랫폼 scheme을 Workspace가 직접 수정: 다른 Workspace와 과거 revision의 의미가 함께 바뀐다.
