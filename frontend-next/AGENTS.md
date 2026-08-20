<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 관리 화면 공통 헤더

- Workspace 및 플랫폼 관리 화면의 최상단 헤더는
  `components/admin/common/AdminPageHeader.tsx`를 재사용한다.
- 별도의 eyebrow·제목·설명 3행 헤더를 화면별로 다시 만들지 않는다.
- 기본 헤더는 compact 크기와 설명 tooltip을 사용한다. 화면에 설명을 항상 노출해야 하는
  명확한 이유가 있을 때만 `compact={false}` 또는 `descriptionMode="inline"`을 명시한다.
- 화면별 주요 동작은 `actions` 슬롯에 배치하고, 헤더 외부에 같은 동작을 중복 배치하지 않는다.
