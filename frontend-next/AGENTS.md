<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 관리 화면 공통 헤더

- Workspace 및 플랫폼 관리 화면의 최상단 헤더는
  `components/admin/common/AdminPageHeader.tsx`를 재사용한다.
- 별도의 eyebrow·제목·설명 3행 헤더를 화면별로 다시 만들지 않는다.
- 기본 헤더는 compact 크기와 설명 tooltip을 사용한다. 화면에 설명을 항상 노출해야 하는
  명확한 이유가 있을 때만 `compact={false}` 또는 `descriptionMode="inline"`을 명시한다.
- 화면별 주요 동작은 `actions` 슬롯에 배치하고, 헤더 외부에 같은 동작을 중복 배치하지 않는다.

## 관리 화면 높이와 스크롤

- 관리 셸 바깥의 문서 스크롤을 만들지 않는다. 최상위 관리 컴포넌트는 셸이 제공하는 잔여
  화면 높이를 모두 사용한다.
- 단일 열 화면은 해당 콘텐츠 열 내부에서만 스크롤한다. 공통 헤더는 열 상단에 유지한다.
- 공통 헤더와 첫 콘텐츠 사이의 최상위 간격은 `space-y-4` 또는 `gap-4`(16px)로 통일하고,
  `AdminPageHeader`에 별도 하단 padding을 중복해서 추가하지 않는다.
- 목록·편집기·미리보기처럼 여러 열을 사용하는 화면은 각 열에 `min-h-0`와 적절한
  `overflow-y-auto`를 적용해 열마다 독립적으로 스크롤한다.
- `100vh` 기반 임의 높이 계산보다 관리 셸의 `h-full`/`min-h-0` flex·grid 높이 전달을
  우선 사용한다.
