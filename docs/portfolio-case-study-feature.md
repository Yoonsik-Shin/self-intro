# 포트폴리오 케이스스터디 기능

## 1. 개요

이력서(Print) 기능과 별도로, 프로젝트별 "문제 인식 → 고민한 것/트레이드오프 → 해결 → 성과" 구조의 케이스스터디를 저장·AI 초안 생성·발행하는 기능이다. 이력서와 마찬가지로 **AI 초안 생성**과 **기본 규격 기반 커스텀(WYSIWYG)**을 지원하며, 콘텐츠 근거로 `Experience`/`ExperienceDetail`뿐 아니라 **Study**까지 활용한다. 가로/세로 A4 두 방향 인쇄 레이아웃, 렌더링된 Mermaid 다이어그램·아키텍처 이미지 삽입을 지원한다.

- 공개 목록: `/portfolio`
- 공개 상세: `/portfolio/[slug]`
- 관리자: 대시보드 "포트폴리오 관리" 탭

---

## 2. 데이터 모델

콘텐츠(내용)와 레이아웃(배치)을 분리한 구조 — 이력서 시스템의 `Experience`/`ExperienceDetail`(내용) vs `PrintTemplate`(배치) 구조와 동일한 설계 원칙을 따른다.

### 2.1 콘텐츠

| 테이블 | 역할 |
| --- | --- |
| `portfolio_case_study` | 케이스스터디 정체성(experience_id, slug, title, status, published_revision_id). Experience 하나당 케이스스터디 여러 개 허용 |
| `portfolio_case_study_revision` | 버전 이력. `content_json`(구조화 본문) + `rendered_markdown`(mermaid/이미지 포함 마크다운) 동시 저장 |
| `portfolio_case_study_study` | 근거로 사용한 Study 링크(현재 스키마만 존재, 조회는 `content_json.sourceStudyIds` 기반으로 처리) |

`content_json` 스키마 (`PortfolioCaseStudyContent`):

```json
{
  "summary": "한줄 요약",
  "problem": "문제 인식",
  "thoughtProcess": "고민한 것, 검토한 후보안",
  "tradeoffs": [{ "option": "", "pros": "", "cons": "", "chosenBecause": "" }],
  "solution": "실제 해결 방법",
  "outcome": { "summary": "", "metrics": [{ "label": "", "before": "", "after": "" }] },
  "architecture": { "mermaidSource": "...", "imageObjectKeys": ["..."], "imageUrls": ["..."] },
  "sourceStudyIds": [1, 2],
  "sourceExperienceDetailIds": [5]
}
```

`imageUrls`는 응답 시점에만 `StorageService.toPublicUrl`로 해석해 채우는 필드다 — `content_json`에는 `imageObjectKeys`만 저장해 스토리지 설정이 바뀌어도 저장 데이터가 오염되지 않게 했다.

### 2.2 레이아웃

| 테이블 | 역할 |
| --- | --- |
| `portfolio_layout` | 케이스스터디 하나당 방향(PORTRAIT/LANDSCAPE)별로 여러 레이아웃 저장 가능, 방향별 기본값(`is_default`) 하나 지정. 필드 구성은 `print_template`과 동일하게 override들을 불투명 JSON 문자열로 저장 |

---

## 3. AI 초안 생성

`PortfolioCaseStudyAiService`(`backend/core/.../portfolio/application/`) — `CompetencyAiService`/`ExperienceAiService`/`StudyAiService`와 동일한 **2단계 생성** 패턴.

1. **사실 추출**: 대상 Experience + 모든 ExperienceDetail(situation/task/actionDetail/outcome/narrative) + 선택한 Skill + 선택한 Study(제목/요약/본문 발췌)를 근거로, 각 사실을 `problem|thought|tradeoff|solution|outcome` 중 하나로 분류하고 `experienceDetailId`/`studyId` 근거를 강제. 근거 없는 사실은 버림(환각 방지)
2. **작성**: 검증된 facts만으로 위 `content_json` 스키마를 작성. 아키텍처 다이어그램은 새로 창작하지 않고 근거 Study에 이미 있는 mermaid 코드를 재사용하도록 프롬프트에 명시

Study 근거는 자동 추천도 지원한다 — `Study` 엔티티가 이미 `Experience`/`ExperienceDetail`과 M:N 조인(`study_experience`)돼 있어, 사용자가 Study를 직접 선택하지 않으면 해당 프로젝트에 연결된 Study를 자동으로 가져와 근거로 쓴다(`StudyRepository.findAllByExperiences_IdOrderByTitleAsc`).

SSE 스트리밍(`stage`/`token`/`facts`/`complete`/`error`)으로 진행 상황을 프론트에 전달 — 관리자 화면은 기존 `AiDraftAssistant`(`components/admin/ai/`)의 진행 표시 컴포넌트를 그대로 재사용한다.

---

## 4. 가로/세로 WYSIWYG 인쇄 레이아웃

이력서 인쇄 시스템(`PrintCanvas`/`pdfLayoutEngine`)은 portrait A4 고정이었다. 이번에 `pdfLayoutEngine.ts`에 `getPageMetrics(orientation)`을 추가해 landscape 치수 계산을 지원하도록 확장했고(기존 이력서 호출부는 인자 그대로라 동작 변화 없음), `PdfPageLayer.tsx`도 `orientation` prop으로 화면/인쇄 치수를 스왑한다.

`PortfolioPrintCanvas`(`components/portfolio/`)는 이력서 `PrintCanvas`와 동일한 정밀도를 제공한다:

- 강제 페이지 배치, 항목별 간격 조절, 항목 노출/제외(핀 토글)
- 요약/문제/고민/해결/성과 요약 5개 필드 인라인 문구 편집
- 가로/세로 토글

단, 포트폴리오는 "문제→고민→트레이드오프→해결→성과" **고정 내러티브**라 이력서에 있던 섹션 드래그 재정렬·트레이드오프/지표 항목 드래그 재정렬은 넣지 않았다(그 항목들은 구조화 편집 폼에서 순서를 정한다).

인쇄 시 실제 용지 크기까지 맞춘다 — `window.print()` 호출 직전 landscape면 `<style>` 태그를 동적으로 삽입해 `@page { size: A4 landscape; }`로 덮어쓰고, 인쇄 후 제거한다(globals.css의 기본 `@page`는 portrait 고정이라 이 방법이 아니면 가로 인쇄가 불가능).

---

## 5. API

### 관리자 (`/api/admin/portfolio/case-studies/**`, ROLE_ADMIN)

| Method & Path | 역할 |
| --- | --- |
| `GET /` , `GET /{id}` | 목록 / 상세(리비전 이력 포함) |
| `POST /` | 생성(experienceId, slug, title) |
| `PUT /{id}` | slug/title 수정 |
| `DELETE /{id}` | 삭제 |
| `POST /{id}/revisions` | 리비전 저장(content + source: AI\|MANUAL) |
| `POST /{id}/revisions/generate` (SSE) | AI 초안 생성 |
| `POST /{id}/publish`, `POST /{id}/unpublish` | 발행/발행 취소 |
| `GET/POST/PUT/DELETE /{caseStudyId}/layouts/**` | 레이아웃 CRUD |

### 공개 (`/api/portfolio/case-studies/**`)

| Method & Path | 역할 |
| --- | --- |
| `GET /` | 발행된 케이스스터디 목록 |
| `GET /{slug}` | 상세(content + renderedMarkdown) |
| `GET /{slug}/layout?orientation=` | 방향별 기본 레이아웃(없으면 404 → 프론트가 자동 배치로 대체) |
| `GET /by-study/{studyId}` | 특정 Study를 인용한 발행 케이스스터디 목록(Study 상세 페이지 역참조용) |

---

## 6. 프론트엔드 파일 맵

```
frontend-next/
├── app/(public)/portfolio/page.tsx           # 목록 페이지
├── app/(public)/portfolio/[slug]/page.tsx     # 상세 페이지
├── components/portfolio/
│   ├── PortfolioListClient.tsx                # 목록 카드 그리드
│   ├── PortfolioCaseStudyDetailClient.tsx      # 상세 리더 + "인쇄용 보기" 진입점
│   └── PortfolioPrintCanvas.tsx                # 가로/세로 WYSIWYG 인쇄 캔버스
├── components/admin/portfolio/
│   └── PortfolioManagement.tsx                 # 관리자 탭: 목록/생성/AI초안/구조화편집/발행/레이아웃편집
├── store/usePortfolioPrintStore.ts             # 인쇄 캔버스 상태(zoom/excludedIds/gaps/forcedPage 등)
├── lib/pdfLayoutEngine.ts                      # orientation 파라미터화된 A4 페이지 분할 엔진(이력서와 공유)
└── lib/api/portfolio.ts                        # API 클라이언트
```

---

## 7. 알려진 제약 / 의도적으로 뺀 것

- 이력서의 `PrintPreviewNav` 사이드바(전체 섹션 트리)는 재사용하지 않음 — 항목 수가 적어 캔버스 내 인라인 핀 버튼으로 대체
- 트레이드오프/성과 지표 항목의 순서는 캔버스 드래그가 아니라 관리자 구조화 편집 폼에서 배열 순서로 결정
- 브라우저 스크린샷 기반 시각 검증은 `chromium-cli`/Playwright가 준비되지 않아 SSR HTML 텍스트 검증 + 실제 AI 호출(NVIDIA NIM) end-to-end 검증으로 대체함
- `portfolio_case_study_study` 조인 테이블은 스키마만 만들어두고 실제 쓰기는 안 함(현재는 `content_json.sourceStudyIds`만으로 충분)

---

## 8. 관련 커밋

| 커밋 | 내용 |
| --- | --- |
| `3333ab7` | 백엔드 스캐폴딩(스키마, AI 생성, CRUD) |
| `d24ce77` | (부수) job-posting 마이그레이션 V152 버전 충돌 해소 |
| `171ad6c` | 가로/세로 레이아웃 엔진 + `portfolio_layout` CRUD |
| `9342fa1` | `PortfolioPrintCanvas` + 아키텍처 이미지 URL 버그 수정 |
| `f346d85` | 관리자 관리 화면 |
| `d2406d8` | 네비게이션 + Study 역참조 |
| `564e1cc` | 구버전 리비전 null 안전성 수정 |
