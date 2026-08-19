# 인쇄 편집기: 전체 이력 한 번에 fetch하는 구조 — 확장성 후속 검토 메모

> 상태: 최적화 안 함(의도적 보류). 지금 데이터 규모(개인 커리어 이력, 많아야
> 수십 개 항목)에서는 문제없다고 판단해 보류했다. 항목이 수백 개 단위로
> 늘어나면 아래 방향을 검토할 것.

## 배경

`frontend-next/components/print/PrintCanvas.tsx` 기반 인쇄 편집기는
워크스페이스의 경력/프로젝트/자격증/핵심역량 전체를 `introData` 하나로 한
번에 불러온다(`getWorkspaceIntroduction`/`workspaceOutputSource`). "구성
관리" 패널에서 검색으로 찾아 문서에 추가하는 기능이 있으므로, 애초에 전체
목록이 프론트에 다 있어야 검색이 되는 구조 자체는 맞다.

2026-08-19에 "경력/경험이 쌓이면 성능 문제 없을지"에 대한 질문이 있었고,
현재 규모에서는 브라우저가 전체를 한 번에 불러오고 검색/렌더링해도 체감
성능 문제가 없다고 판단해 지금 시점의 최적화는 보류하기로 했다.

## 트리거 조건

경력/프로젝트 항목 수가 수백 개 단위로 쌓여서 인쇄 편집기 첫 로딩이나
"구성 관리" 검색이 눈에 띄게 느려지는 시점.

## 구현 방향 후보

- 목록/검색용으로는 id·제목·기간 정도만 담은 가벼운 별도 API 응답을 쓰고,
- 실제로 문서에 포함된(제외되지 않은) 항목만 상세 콘텐츠를 fetch하는 구조로
  분리한다.

관련: [print-custom-font-server-storage-todo.md](./print-custom-font-server-storage-todo.md) —
"지금은 작아서 미룬 최적화/확장" 계열 항목.

## 변경이 필요한 지점 (구현 착수 시 체크리스트)

- 백엔드: 경량 목록용 API(요약 필드만) 신설
- `frontend-next/components/print/PrintCanvas.tsx`: `printableAtoms`/
  `orderedCareerCards` 등 파생 로직이 요약 데이터와 상세 데이터 두 소스를
  구분해 다루도록 리팩터
- `frontend-next/components/print/PrintPreviewNav.tsx`: 검색은 경량 목록
  기준으로 동작하도록 확인
- 상세 fetch 캐싱/로딩 상태 UI 추가
