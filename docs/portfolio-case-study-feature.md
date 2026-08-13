# 포트폴리오 케이스스터디 기능

## 1. 개요

이력서(Print) 기능과 별도로, 프로젝트별 "문제 인식 → 고민한 것/트레이드오프 → 해결 → 성과" 구조의 케이스스터디를 저장·AI 초안 생성·발행하는 기능이다. 이력서와 마찬가지로 **AI 초안 생성**과 **기본 규격 기반 커스텀(WYSIWYG)**을 지원하며, 콘텐츠 근거로 `Experience`/`ExperienceDetail`뿐 아니라 **Study**까지 활용한다. 가로/세로 A4 두 방향 인쇄 레이아웃, 렌더링된 Mermaid 다이어그램·아키텍처 이미지 삽입을 지원한다.

**관리자 전용 기능이다 — 공개 페이지는 없다.** 콘텐츠 조회용 공개 API는 남아있지만(나중에 다른 용도로 쓸 수 있도록) 현재 프론트 라우트/네비게이션에서 연결되지 않는다.

- 관리자 "포트폴리오 관리" 탭 — 콘텐츠(문제/생각/트레이드오프/해결/성과/아키텍처) 작성·AI 초안·발행 전담
- 관리자 "PDF 템플릿 관리" 탭 — 이력서 인쇄 템플릿과 같은 화면에서 포트폴리오 가로/세로 배치(WYSIWYG)를 편집

---

## 2. 데이터 모델

콘텐츠(내용)와 레이아웃(배치)을 분리한 구조이되, **배치는 이력서 인쇄 시스템(`print_template`)과 완전히 같은 테이블/서비스를 공유**한다 — 별도 `portfolio_layout` 테이블을 두지 않는다.

### 2.1 콘텐츠

| 테이블 | 역할 |
| --- | --- |
| `portfolio_case_study` | 케이스스터디 정체성(experience_id, slug, title, status, published_revision_id). Experience 하나당 케이스스터디 여러 개 허용 |
| `portfolio_case_study_revision` | 버전 이력. `content_json`(구조화 본문) + `rendered_markdown`(mermaid/이미지 포함 마크다운) 동시 저장 |
| `content_json.sourceStudyIds` | 근거로 사용한 Study 링크 |

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

`imageUrls`는 응답 시점에만 `StorageService.toPublicUrl`로 해석해 채우는 필드다 — `content_json`에는 `imageObjectKeys`만 저장해 스토리지 설정이 바뀌어도 저장 데이터가 오염되지 않게 했다. 이미지 업로드는 `ImageScope.PORTFOLIO_ARCHITECTURE` 프리사인드 업로드 경로를 쓴다.

### 2.2 레이아웃 — `print_template` 테이블 재사용

이력서 배치와 포트폴리오 배치가 같은 `print_template` 테이블에 섞여 저장된다. `document_type` 컬럼으로 구분한다.

| 컬럼 (신규) | 역할 |
| --- | --- |
| `document_type` | `RESUME`(기본) \| `PORTFOLIO` |
| `portfolio_case_study_id` | PORTFOLIO 타입일 때만 값 있음 — 이력서의 `job_posting_id`에 대응하는 소속 식별자 |
| `orientation` | `PORTRAIT`(기본) \| `LANDSCAPE`. 이력서는 항상 PORTRAIT, 포트폴리오는 케이스스터디 하나당 방향별로 최대 1행(`visible=true`인 것이 "기본 배치") |

`excludedIds`/`sectionOrder`(포트폴리오는 미사용, `"[]"` 고정)/`sectionGaps`/`contentOverrides`는 이력서와 동일한 컬럼을 그대로 쓰되, 포트폴리오는 `contentOverrides`에 다른 모양의 JSON을 담는다:

```json
{ "narrative": { "summary": "...", "problem": "...", ... }, "forcedPageOverrides": { "atom-id": 0 } }
```

**주의**: `PrintTemplateService.listPublic()`/`listAll()`(이력서 목록 조회)은 반드시 `document_type='RESUME'`로 스코프해서 조회한다 — 스코프를 빼먹으면 포트폴리오 배치 행이 이력서 관리 화면에 섞여 나온다.

---

## 3. AI 초안 생성

`PortfolioCaseStudyAiService`(`backend/core/.../portfolio/application/`) — `CompetencyAiService`/`ExperienceAiService`/`StudyAiService`와 동일한 **2단계 생성** 패턴.

1. **사실 추출**: 대상 Experience + 모든 ExperienceDetail(situation/task/actionDetail/outcome/narrative) + 선택한 Skill + 선택한 Study(제목/요약/본문 발췌)를 근거로, 각 사실을 `problem|thought|tradeoff|solution|outcome` 중 하나로 분류하고 `experienceDetailId`/`studyId` 근거를 강제. 근거 없는 사실은 버림(환각 방지)
2. **작성**: 검증된 facts만으로 위 `content_json` 스키마를 작성. 아키텍처 다이어그램은 새로 창작하지 않고 근거 Study에 이미 있는 mermaid 코드를 재사용하도록 프롬프트에 명시

Study 근거는 자동 추천도 지원한다 — `Study` 엔티티가 이미 `Experience`/`ExperienceDetail`과 M:N 조인(`study_experience`)돼 있어, 사용자가 Study를 직접 선택하지 않으면 해당 프로젝트에 연결된 Study를 자동으로 가져와 근거로 쓴다(`StudyRepository.findAllByExperiences_IdOrderByTitleAsc`).

SSE 스트리밍(`stage`/`token`/`facts`/`complete`/`error`)으로 진행 상황을 프론트에 전달 — 관리자 화면은 기존 `AiDraftAssistant`(`components/admin/ai/`)의 진행 표시 컴포넌트를 그대로 재사용한다.

---

## 4. 가로/세로 WYSIWYG 인쇄 레이아웃

이력서 인쇄 시스템(`PrintCanvas`/`pdfLayoutEngine`)은 portrait A4 고정이었다. `pdfLayoutEngine.ts`에 `getPageMetrics(orientation)`을 추가해 landscape 치수 계산을 지원하도록 확장했고(기존 이력서 호출부는 인자 그대로라 동작 변화 없음), `PdfPageLayer.tsx`도 `orientation` prop으로 화면/인쇄 치수를 스왑한다.

`PortfolioPrintCanvas`(`components/portfolio/`)는 이력서 `PrintCanvas`와 동일한 정밀도를 제공한다:

- 강제 페이지 배치, 항목별 간격 조절, 항목 노출/제외(핀 토글)
- 요약/문제/고민/해결/성과 요약 5개 필드 인라인 문구 편집
- 가로/세로 토글

단, 포트폴리오는 "문제→고민→트레이드오프→해결→성과" **고정 내러티브**라 이력서에 있던 섹션 드래그 재정렬·트레이드오프/지표 항목 드래그 재정렬은 넣지 않았다(그 항목들은 구조화 편집 폼에서 순서를 정한다).

인쇄 시 실제 용지 크기까지 맞춘다 — `window.print()` 호출 직전 landscape면 `<style>` 태그를 동적으로 삽입해 `@page { size: A4 landscape; }`로 덮어쓰고, 인쇄 후 제거한다(globals.css의 기본 `@page`는 portrait 고정이라 이 방법이 아니면 가로 인쇄가 불가능).

**진입점은 "PDF 템플릿 관리" 탭이다.** 케이스스터디를 고르면 세로/가로 두 슬롯이 보이고, 각각 "배치 편집" 버튼이 `PortfolioPrintCanvas`를 연다. 저장된 배치가 없는 방향을 열면 `initialOrientation` prop으로 해당 방향부터 시작하고, zustand 스토어(`usePortfolioPrintStore`)는 모듈 싱글턴이라 캔버스가 열릴 때마다 명시적으로 `reset()`/`applyLayout()`해 이전 세션 상태가 새로 여는 세션에 새지 않게 한다.

---

## 5. API

### 콘텐츠 — 관리자 (`/api/admin/portfolio/case-studies/**`, ROLE_ADMIN)

| Method & Path | 역할 |
| --- | --- |
| `GET /` , `GET /{id}` | 목록 / 상세(리비전 이력 포함) |
| `POST /` | 생성(experienceId, slug, title) |
| `PUT /{id}` | slug/title 수정 |
| `DELETE /{id}` | 삭제 |
| `POST /{id}/revisions` | 리비전 저장(content + source: AI\|MANUAL) |
| `POST /{id}/revisions/generate` (SSE) | AI 초안 생성 |
| `POST /{id}/publish`, `POST /{id}/unpublish` | 발행/발행 취소 |

### 콘텐츠 — 공개 (`/api/portfolio/case-studies/**`, 프론트에서 미사용·API만 존재)

| Method & Path | 역할 |
| --- | --- |
| `GET /` | 발행된 케이스스터디 목록 |
| `GET /{slug}` | 상세(content + renderedMarkdown) |
| `GET /by-study/{studyId}` | 특정 Study를 인용한 발행 케이스스터디 목록 |

### 배치(레이아웃) — `print_template` 컨트롤러에 통합 (`/api/admin/print-templates/**`, ROLE_ADMIN)

| Method & Path | 역할 |
| --- | --- |
| `GET /portfolio/{caseStudyId}` | 케이스스터디의 저장된 배치 목록(방향별 최대 1개씩) |
| `GET /portfolio/{caseStudyId}/default?orientation=` | 방향별 기본 배치 — 없으면 404(프론트가 자동 배치로 대체) |
| `POST /portfolio/{caseStudyId}` | 배치 생성(`PortfolioPrintTemplateRequest`) |
| `PUT /portfolio/{caseStudyId}/{id}` | 배치 수정 |
| `DELETE /{id}` | 기존 이력서 삭제 엔드포인트 재사용(문서 종류 구분 없음) |

이력서 전용 엔드포인트(`GET /api/print-templates`, `GET/POST/PUT /api/admin/print-templates`, mark-final 등)는 그대로이며 내부적으로 `document_type='RESUME'`로 스코프돼 포트폴리오 행과 섞이지 않는다.

---

## 6. 프론트엔드 파일 맵

```
frontend-next/
├── components/portfolio/
│   └── PortfolioPrintCanvas.tsx                # 가로/세로 WYSIWYG 인쇄 캔버스 (콘텐츠는 props로 주입받음)
├── components/admin/portfolio/
│   └── PortfolioManagement.tsx                 # 관리자 탭: 목록/생성/AI초안/구조화편집/발행 (레이아웃 편집 없음)
├── components/admin/print-template/
│   └── PrintTemplateManagement.tsx             # 관리자 탭: 이력서 템플릿 목록 + 포트폴리오 배치 편집 진입점
├── store/usePortfolioPrintStore.ts             # 인쇄 캔버스 상태(zoom/excludedIds/gaps/forcedPage 등)
├── lib/pdfLayoutEngine.ts                      # orientation 파라미터화된 A4 페이지 분할 엔진(이력서와 공유)
├── lib/api/portfolio.ts                        # 콘텐츠 API 클라이언트
└── lib/api/printTemplate.ts                    # 배치 API 클라이언트 (이력서 + 포트폴리오 공용)
```

`app/(public)/portfolio/**`, `components/portfolio/PortfolioListClient.tsx`, `PortfolioCaseStudyDetailClient.tsx`는 삭제됨(공개 페이지 제거).

---

## 7. 알려진 제약 / 의도적으로 뺀 것

- 이력서의 `PrintPreviewNav` 사이드바(전체 섹션 트리)는 재사용하지 않음 — 항목 수가 적어 캔버스 내 인라인 핀 버튼으로 대체
- 트레이드오프/성과 지표 항목의 순서는 캔버스 드래그가 아니라 관리자 구조화 편집 폼에서 배열 순서로 결정
- 브라우저 스크린샷 기반 시각 검증은 `chromium-cli`/Playwright가 준비되지 않아 SSR HTML 텍스트 검증 + 실제 AI 호출(NVIDIA NIM) end-to-end 검증으로 대체함
- V231에서 미사용 `portfolio_case_study_study` 조인 테이블을 제거했다. Study 근거는
  `content_json.sourceStudyIds`를 단일 원본으로 사용한다.
- 공개 페이지 없음 — 관리자 전용. 콘텐츠 공개 API만 남겨둠(추후 PDF 등 다른 용도 고려)

---

## 8. 관련 커밋

| 커밋 | 내용 |
| --- | --- |
| `3333ab7` | 백엔드 스캐폴딩(스키마, AI 생성, CRUD) |
| `d24ce77` | (부수) job-posting 마이그레이션 V152 버전 충돌 해소 |
| `171ad6c` | 가로/세로 레이아웃 엔진 + `portfolio_layout` CRUD (이후 통합으로 대체됨) |
| `9342fa1` | `PortfolioPrintCanvas` + 아키텍처 이미지 URL 버그 수정 |
| `f346d85` | 관리자 관리 화면 |
| `d2406d8` | 네비게이션 + Study 역참조 (네비는 이후 제거됨) |
| `564e1cc` | 구버전 리비전 null 안전성 수정 |
| `34b0aed` | 공개 페이지 제거 + `portfolio_layout`→`print_template` 통합(V158) + 탭 역할 재배치 |
