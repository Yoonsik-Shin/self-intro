# AI 학습 계획(Study Plan) 기능

## 0. 이게 뭔지

`learning-resource` 모듈에 쌓여 있던 학습 자료(강의/책/아티클 — 상태·우선순위·소요시간·
선후관계 태깅까지 이미 있었음)를 그냥 목록으로만 보고 있던 걸, AI가 (1) 주당 가용 시간,
(2) 자료들의 선후관계/우선순위, (3) 내 경력·스킬 배경을 조합해 실행 가능한 계획으로
짜주는 기능. 한 번 던지고 끝나는 버튼식이 아니라, 대화하듯 피드백을 주고받으며 다듬다가
"확정"하는 흐름.

## 1. 핵심 설계: "주차" 아니라 "테마 Stage + 순서/병렬"

처음엔 캘린더처럼 주차(week) 단위로 나누려 했으나 빠짐 — 중요한 건 **어떤 순서로
진행해야 하는지**와 **뭘 동시에(병렬로) 진행해도 되는지**임. 위상정렬 레벨을 그대로
1 Stage = 1 Level로 기계적으로 쪼개는 것도 아니고, 사람이 이해할 수 있는 **의미 있는
테마**로 묶인다 — 예: "기본기 다지기", "실전/응용", "신기술 학습".

- **테마 묶음 개수/이름/어떤 자료를 어디에 넣을지**는 AI 재량.
- **순서 무결성은 코드가 절대 보장**한다. `LearningResourceRelation`의 `PREREQUISITE`
  관계를 코드가 미리 계산해 AI에게 제약으로 주고, AI 응답을 파싱한 뒤 모든 선후관계
  쌍이 실제로 지켜졌는지 다시 검증한다. 위반이 있으면 요청을 실패시키는 대신 **결정적으로
  자동 보정**(위반 항목을 자신의 모든 선행자료 중 가장 늦은 Stage 다음으로 재배치)한다.
- 시간(주당 가용 분)은 "이 Stage가 대략 며칠/몇 주 걸릴지" 페이싱 참고값으로만 쓰고
  저장하지 않는다 — 응답 조립 시 `총배분시간 / 주당가용시간`으로 매번 계산.

## 2. 데이터 모델

패키지: `backend/ai-worker/src/main/java/com/selfintro/studyplan/`
마이그레이션: `V126__study_plan.sql`, `V131`, `V132`, `V204__scope_study_plan_to_workspace.sql`

| 테이블                      | 역할                                                                                                                                                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `study_plan`                | Workspace가 소유하는 계획 하나. `workspace_id`, `status`(COLLECTING/DRAFT/CONFIRMED), `weekly_available_minutes`, `focus_goal`, `confirmed_at`                                                                                                                         |
| `study_plan_candidate`      | 계획 생성 후보. 선택 여부·익숙한 개념 여부·Workspace 우선순위 snapshot                                                                                                                                                                                                 |
| `study_plan_stage`          | 순차 단계. `stage_order`, `theme`(필수 — AI가 붙이는 테마 이름)                                                                                                                                                                                                        |
| `study_plan_item`           | Stage 안 항목. `learning_resource_id`(nullable — null이면 복습/버퍼 등 자유 항목, 이땐 `free_text_label` 필수), `allocated_minutes`, **`completed`/`completed_at`(학습 완료)와 `understanding_checked`/`understanding_checked_at`(이해도 점검 완료)가 서로 별개 체크** |
| `study_plan_check_question` | 항목별 자유서술형 이해도 자가점검 질문(`question` + 참고용 `model_answer_hint`, 채점 없음)                                                                                                                                                                             |
| `study_plan_message`        | 대화 이력(USER/ASSISTANT), 재생성 시 AI 컨텍스트로도 재사용                                                                                                                                                                                                            |

`learning_resource_id`는 `ON DELETE SET NULL` — 나중에 원본 자료가 삭제돼도 계획 자체는
안 깨지고 해당 항목만 "삭제된 자료"로 표시됨(프론트에서 `resourceTitle ?? freeTextLabel
?? '삭제된 자료'`로 처리).

## 3. 백엔드 동작

### 3.1 후보 검색과 Workspace 경계 (`StudyPlanRetrievalService`)

- URL의 Workspace Membership을 먼저 검증하고 해당 `workspace_learning_resource` overlay만
  후보로 검색한다. 완료 자료는 제외하고 제목·개인 요약·노트·Workspace Tag·공통 taxonomy/skill을
  검색한다.
- "익숙한 개념"은 같은 Workspace의 `workspace_skill`만 사용한다. 후보 우선순위는 공통 catalog의
  legacy 컬럼이 아니라 후보 행에 Workspace overlay 값을 snapshot한다.
- 계획과 모든 mutation은 `(plan_id, workspace_id)`로 조회하므로 다른 Workspace의 plan ID를 알아도
  조회·수정·삭제할 수 없다.

### 3.2 선후관계 제약과 AI 생성 (`StudyPlanAiService`)

- 선택된 Workspace 후보 중 `durationMinutes != null`인 것만 시간 배분 대상으로 사용한다.
- `PREREQUISITE` 타입 관계만 순서 제약으로 뽑고(`RELATED`/`OVERLAPS`는 무시), 참고용으로
  위상정렬 기반 깊이(depth)도 계산해 후보 목록에 같이 표기 — AI에게 "대략 몇 단계 뒤에
  와야 하는지" 감을 주는 힌트일 뿐, Stage 경계를 강제하진 않음.

### 3.3 AI 호출

- `RelevantProfileDigestService.buildDigest(workspaceId, ...)`로 같은 Workspace의 경력 RAG 근거만
  구성한다. 검색 결과가 없어도 전역 프로필 덤프로 fallback하지 않는다.
- `LlmDispatcher.generateJson(...)` + `AiJsonSupport.parseJson(...)`으로 구조화 JSON을 파싱한다.
- 파싱 후 검증: 존재하지 않는 학습자료 id를 반환하면 502, `allocatedMinutes <= 0`이면 502. 선후관계 위반은 위 1번 항목대로 자동 보정.

### 3.4 재생성(대화형 피드백)과 완료여부 보존

`StudyPlanService.sendMessage(id, content)`:

1. `status == CONFIRMED`면 409("확정된 계획입니다. 잠금 해제 후 다시 시도하세요").
2. 재생성 직전, 현재 계획에서 `learningResource != null`인 항목만
   `resourceId → (completed, completedAt, understandingChecked, understandingCheckedAt)`
   맵으로 스냅샷.
3. AI 재생성 → 전체 Stage/Item을 새로 구성(항상 "완전 대체", diff 아님) → 스냅샷에 있는
   resourceId면 두 체크 상태 모두 이어받음 → `plan.replaceStages(...)`(orphanRemoval로
   기존 행 삭제, 새 행 cascade insert).
4. **자유텍스트 항목(복습/버퍼)은 안정적 식별자가 없어 재생성마다 두 체크 모두 리셋됨** —
   resourceId 매칭 스펙상 자연스러운 동작.

### 3.5 확정(잠금)

`confirm()`으로 `CONFIRMED` + `confirmedAt` 기록. 확정 중엔 `/messages`(AI 재생성)만
막히고, 완료/이해도 체크 토글은 확정 여부와 무관하게 항상 가능.

## 4. API

Base path `/api/worker/workspaces/{workspaceSlug}/study-plans/manage`.

조회는 Workspace `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`, 수정은 `OWNER`, `ADMIN`, `EDITOR`에게
허용한다. `/api/worker/**`의 플랫폼 운영자 제한보다 이 경로의 Workspace 인증 규칙을 먼저 적용한다.

| Method | Path                                        | 설명                                                              |
| ------ | ------------------------------------------- | ----------------------------------------------------------------- |
| GET    | `/`                                         | 요약 목록(최신순)                                                 |
| GET    | `/{id}`                                     | Stage/항목/대화이력 포함 상세                                     |
| POST   | `/`                                         | 후보 수집 계획 생성 (`{weeklyAvailableMinutes, focusGoal?}`)      |
| POST   | `/{id}/messages`                            | 수집 중 후보 조정 또는 계획 재생성 (`{content}`), 확정 상태면 409 |
| POST   | `/{id}/generate`                            | 선택 후보로 최초 Stage/Item 생성                                  |
| POST   | `/{id}/confirm`                             | 확정                                                              |
| POST   | `/{id}/unconfirm`                           | 잠금 해제                                                         |
| PATCH  | `/{id}/items/{itemId}/toggle-completed`     | "학습 완료" 토글                                                  |
| PATCH  | `/{id}/items/{itemId}/toggle-understanding` | "이해도 점검 완료" 토글                                           |
| DELETE | `/{id}`                                     | 버려진 초안 삭제                                                  |

## 5. 프론트엔드

- Admin 사이드바 "콘텐츠 자산" 그룹에 **"AI 학습 계획"** 탭 추가
  (`AdminDashboardShell.tsx`, `LEARNING_RESOURCES` 바로 아래).
- `components/admin/study-plan/StudyPlanManagement.tsx`:
  - 계획 없으면 생성 폼(주당 가용시간 + 목표 텍스트) → "계획 생성" 버튼.
  - 계획 있으면 좌측에 Stage 카드를 순서대로(주제 + "약 N주 소요 예상" 배지 + 항목이
    2개 이상이면 "병렬로 진행해도 됨" 안내), 각 항목에 학습완료/이해도점검 체크박스
    - 접이식 자가점검 질문 목록(모범답안 힌트는 클릭 전까지 안 보임 — 미리 보이면
      자가점검 의미가 없어서).
  - 우측에 대화 패널(메시지 목록 + 피드백 입력창 + 확정/잠금해제 버튼). 확정 상태면
    피드백 입력이 비활성화됨.
  - `lib/api/studyPlan.ts` / `lib/api/types.ts`에 기존 `jobPosting.ts` 패턴 그대로
    클라이언트 추가.

## 6. 알려진 제한

- 선후관계 위반 자동 보정은 **결정적**이지만 완벽하진 않음 — 극단적으로 얽힌 그래프에서는
  Stage 개수가 예상보다 늘어날 수 있음. 사이클이 의심되면 경고 로그만 남기고 방어적으로
  뒤에 배치.
- 여러 개의 `StudyPlan`을 동시에 만들 수 있음(목록 + 피커) — "재생성이 현재 상태를
  덮어쓴다"는 각 plan id 내부에서만 적용되고, 여러 plan row 존재 자체와는 무관.
- V204 로컬 적용 시 기존 계획이 0개여서 실데이터 backfill 사례는 없었다. 운영 데이터가 있는 환경은
  백업 clone에서 `study_plan.workspace_id`와 후보 우선순위 이관 결과를 먼저 검증해야 한다.
