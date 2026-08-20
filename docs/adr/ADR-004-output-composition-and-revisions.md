# ADR-004: 지원·출력 구성과 원본 기록 분리

## 상태

Accepted — 2026-08-12

## 결정

- Profile·Experience·Competency 원본은 사실 데이터만 보관하며 PDF 포함 여부를 결정하지 않는다.
- `PrintTemplate`을 이력서·PDF 한 건의 출력 구성 초안으로 사용한다.
- 항목 포함·제외, 출력 순서, 간격, 맞춤 문구, 선택 기술은 각 `PrintTemplate`에 저장한다.
- 관리자 출력 편집은 공개 페이지 revision이 아니라 인증된 Workspace 원본 projection을 사용한다.
- 방문자용 공개 인쇄는 계속 활성 공개 publication snapshot과 공개된 템플릿만 사용한다.
- 수동 생성·수정·복원 시 `print_template_revision`에 `SNAPSHOT` revision을 남긴다. 복원도 새
  revision을 만들므로 현재 상태를 잃지 않는다.
- 포트폴리오 개별 항목의 AI 개선은 별도 자유형 채팅 문서를 만들지 않고 content revision에
  `base_revision_id`, `feedback_instruction`, `ai_model`을 기록한다. AI 결과는 기존 revision을
  덮어쓰지 않으며, 대화 타임라인은 이 불변 revision 연결에서 재구성한다.
- 이력서와 포트폴리오를 합친 문서는 새 PDF 모델을 만들지 않고 기존 `PrintTemplate`의
  `customSections`에 선택한 포트폴리오 content revision을 고정한다. AI는 고정된 revision의 문구,
  포함 여부와 기존 section order만 수정하고 Profile·Experience 원본 및 revision source metadata는
  변경하지 않는다. 사용자·AI 대화는 기존 `print_template_revision`에 저장한다.
- 최종 PDF를 연결할 때는 현재 출력 구성을 먼저 `SNAPSHOT` revision으로 고정하고,
  `print_document_artifact`에 해당 revision ID, Workspace ID, 객체 key, 서버가 실제 바이트에서 계산한
  SHA-256·크기·MIME을 불변 기록한다. 브라우저에서 인쇄 후 올린 파일과 외부에서 만든 PDF는 각각
  `BROWSER_UPLOAD`, `EXTERNAL_UPLOAD`로 구분한다.
- 현재 최종 PDF pointer를 해제하거나 다른 파일로 교체해도 이미 등록된 artifact의 객체는 삭제하지
  않는다. 일반 출력 서식 삭제도 artifact가 연결되어 있으면 거부하며, Workspace 폐쇄·보존기간 만료와
  같은 명시적 전체 삭제 수명주기에서만 DB row와 객체를 함께 제거한다.
- `experience_detail.resume_available` 등 레거시 컬럼은 호환 기간 동안 읽기·쓰기 계약에서만
  보존하고 새 UI와 출력 결정에는 사용하지 않는다.

## 이유

공개 웹페이지에 보여 줄 경력과 특정 지원서에 넣을 경력은 목적이 다르다. 공개 composition을 PDF
원본으로 재사용하면 공개하지 않은 근거를 지원서에 쓸 수 없고, 공개 페이지 변경이 기존 지원서에
예상치 못한 영향을 준다. 출력 구성을 템플릿 단위로 분리하면 지원처별 선택과 복구가 가능하다.

## 페이지와 배치 모델

### 현재 구현 범위

- 현재 인쇄 편집기는 출력 atom을 실제 높이로 측정해 A4 페이지 배열로 먼저 분할한다. 각 페이지 안에서
  별도 빈 Row를 먼저 만들지 않는다. 기존 블록을 다른 블록의 왼쪽·오른쪽으로 드래그하면 그 위치에서
  Row와 Column이 생기는 Notion식 직접 조합을 사용한다.
- 각 렌더링 페이지는 별도 DOM 경계와 안정적인 `pageId`를 가지며 `pageIndex`는 화면 순번으로만
  사용한다. 따라서 상하 흐름의 A4 미리보기·인쇄 경계는 분리되어 있다.
- `OutputLayout` schema v2는 page·row·region·placement와 공통 상하좌우 여백을 문구와 분리해 저장한다.
  사용자가 Column으로 옮긴 atom만 placement로 기록하고 나머지는 첫 Row의 자동 flow를 유지한다.
- 새 layout은 로컬 저장과 서버 `PrintTemplate` snapshot에 함께 보존한다. 기존
  v1과 `__forcedPageOverrides` 템플릿은 불러올 때 첫 Row를 가진 v2 layout으로 변환하며, 호환
  projection도 계속 기록한다.
- 서버 저장·템플릿 선택·초기 route 진입·AI 재작성 후 갱신은 같은 parser와 serializer를 사용한다.
- 편집 모드는 같은 출력 atom 위에 편집 UI만 겹쳐야 한다. 같은 문구와 같은 출력 구성이라면 편집
  모드 전환만으로 atom 집합, 측정 높이, 페이지 수가 달라져서는 안 된다.
- 실제 문구를 수정해 줄바꿈이나 높이가 달라진 경우에는 페이지 재계산이 정상 동작이다.

### 2차원 배치 확장 범위

좌우 열과 지그재그 배치는 현재의 1차원 `order + pageIndex`만으로 구현하지 않는다. 다음 모델을 저장
기반으로 사용한다. schema와 레거시 호환, 블록 옆 drop으로 생성되는 다중 Row·1~3열 Column,
2열 폭과 Row 간격, 공통 네 방향 페이지 여백은 구현했다. 자유 위치·row span·중첩 grid 편집은 아직
구현하지 않았다.

- `OutputPage`: 안정적인 page ID, 용지 방향, 페이지별 Row·Region 목록
- `OutputRow`: Page 안의 세로 블록, 1·2·3열 mode, Column 간격
- `OutputRegion`: page ID에 속한 열·그리드 영역과 폭·간격 규칙
- `OutputPlacement`: atom ID, page ID, region ID, region 내부 순서, column/row span,
  명시적인 페이지 고정 여부(`pageLocked`)
- page·region 좌표는 2차원 화면 배치를 뜻하며 자동 paginator를 강제하지 않는다. 사용자가
  `N페이지로 강제`를 실행한 atom만 `pageLocked=true`이고 강제 배치 안내를 표시한다.
- atom의 사실·문구 데이터와 배치 geometry를 분리한다.
- 화면 순번인 `pageIndex`는 렌더링 결과이며 저장 identity로 사용하지 않는다.
- overflow·충돌·빈 영역 처리와 브라우저 인쇄 결과는 같은 결정적 배치 규칙을 사용한다.

2열 전환은 1열 paginator가 확정한 페이지 안에서만 수행한다. 좁은 열에서 다시 측정한 높이를 1열
paginator 입력으로 되먹이지 않아 페이지 수가 왕복하지 않게 하며, 실제 열 DOM이 페이지 높이를
넘으면 편집 화면에 경고한다. 현재 페이지 경계는 세로 A4와 고정 2열 출력에는 유효하지만 자유 폭·span·
지그재그 배치까지 안전하다고 간주하지 않는다.

## 후속 작업

- 기존 템플릿은 다음 저장부터 `SNAPSHOT` revision을 생성한다.
- 로컬 UAT에서 1열/2열 전환, 좌우 drop target, 저장·재로드, overflow 표시와 브라우저 인쇄 결과를
  교차 검증한다.
- 다음 layout 단계에서 Row 순서·높이와 Column 내부 삽입 위치를 직접 조절하고, 필요한 경우
  row/column span과 충돌 해결 규칙을 추가한다.
- 로컬 UAT 후 레거시 `resume_available`, `public_visible`, `visible` 컬럼 제거 migration을 별도
  변경으로 수행한다.
- 현재 PDF 생성은 여전히 브라우저 `window.print()` 또는 외부 PDF 업로드다. 자동 서버 renderer는
  구현하지 않았으며, 도입할 때 같은 artifact 계약에 renderer version, font bundle version, page count를
  채우고 동일 revision 입력에 대한 재현성 검증을 추가한다.
