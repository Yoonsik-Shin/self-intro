# 인쇄 편집기: 업로드 폰트 서버(계정별) 저장 — 후속 작업 메모

> 상태: 미구현. 업로드한 폰트 파일은 지금 이 브라우저의 IndexedDB에만 저장된다.
> 다른 기기·다른 브라우저에서는 매번 새로 업로드해야 한다.

## 배경

인쇄(PDF) 편집기의 "문서 설정 → 타이포그래피" 탭에 사용자가 직접 폰트 파일을
업로드해 문서 전체 톤으로 적용하는 기능이 있다
(`frontend-next/lib/customFontStorage.ts`,
`frontend-next/components/print/PrintDocumentSettingsPanel.tsx`). 업로드한
파일은 CSS Font Loading API(`FontFace`)로 즉시 등록해 화면/인쇄에 적용하고,
동시에 브라우저 IndexedDB에 저장해 새로고침해도 다시 올릴 필요가 없게 했다.

워크스페이스 계정에 저장해 어느 기기에서 접속해도 쓸 수 있게 하려면 서버
저장(파일 업로드 API + 오브젝트 스토리지 + 워크스페이스별 폰트 목록 관리)이
필요한데, 이번엔 우선 브라우저 로컬 저장으로 빠르게 동작하게만 해두기로
결정했다(2026-08-19). 서버 저장은 의도적으로 미룬 것이지 빠뜨린 게 아니다.

## 구현 방향 후보

1. 워크스페이스에 폰트 파일 업로드 API 추가 (S3 등 오브젝트 스토리지에 저장,
   `PrintTemplate`과 유사하게 워크스페이스 단위로 목록 관리).
2. 인쇄 편집기 로드 시 워크스페이스의 저장된 폰트 목록을 불러와
   `document.fonts`에 등록(지금 `loadAllCustomFontsIntoDocument`가 IndexedDB
   기준으로 하는 일과 동일한 역할, 소스만 서버로 교체).
3. 브라우저 로컬(IndexedDB) 저장은 오프라인/임시 폰트용으로 계속 남겨두거나,
   서버 저장으로 완전히 대체할지는 그때 판단.

## 변경이 필요한 지점 (구현 착수 시 체크리스트)

- 백엔드: 폰트 파일 업로드/목록/삭제 API, 워크스페이스별 저장소 스키마
- `frontend-next/lib/customFontStorage.ts`: IndexedDB 대신/추가로 서버 API
  호출하는 버전 추가
- `frontend-next/components/print/PrintDocumentSettingsPanel.tsx`: 업로드
  UI가 서버 저장 완료 상태를 보여주도록 수정
- `frontend-next/components/print/PrintCanvas.tsx`의
  `loadAllCustomFontsIntoDocument` 호출부: 서버 목록도 함께 로드
