# 지원 공고 관리 & 유사 공고 수집 기능

## 1. 개요
지원한 채용 공고와 전형 진행 상황을 관리하는 기능(Phase 1)과, 내 기술 스택 데이터를 기반으로
유사한 채용 공고를 자동으로 수집·추천하는 기능(Phase 2)을 구현했다.

두 기능 모두 공개 포트폴리오 콘텐츠가 아닌 **개인 관리용 비공개 데이터**이므로, 전 API를
`/api/admin/**` 하위에 두어 GET을 포함한 모든 요청에 `ROLE_ADMIN` 인증을 강제한다
(`SecurityConfig`에서 `/api/admin/**`만 메서드 무관하게 인증을 요구하는 규칙을 그대로 활용).

**현재 상태(2026-07-25 기준)**: Phase 1, Phase 2 모두 구현 완료. 사람인 Open API는 실제 연동
완료, 워크넷/고용24는 개인 자격으로는 채용정보 API 자체를 쓸 수 없어 대상에서 제외했다(§3.1 참고).

---

## 2. Phase 1 — 지원 공고 & 전형 진행도 관리 (구현 완료)

### 2.1 DB 스키마 (`V2__job_application.sql`)

**`job_application`**: id, company_name, position_title, posting_url, source, applied_at, deadline,
current_stage, salary_note, memo, job_posting_candidate_id(nullable FK, Phase 2 후보에서 전환된 경우
역참조), created_at/updated_at.

**`job_application_stage_event`** (전형 진행 이력, append-only): id, job_application_id, stage,
memo, changed_at.

### 2.2 전형 단계 (`JobApplicationStage` enum)
```
APPLIED(지원완료)
CODING_TEST(코딩테스트)
ASSIGNMENT(과제전형)
APTITUDE_TEST(인적성검사)
INTERVIEW_1(1차면접)
INTERVIEW_2(2차면접)
FINAL_INTERVIEW(최종면접)
OFFER(합격)
REJECTED(불합격)
WITHDRAWN(지원포기)
```
`DOCUMENT_SCREENING`(서류전형)은 의도적으로 두지 않았다 — 지원하는 순간부터 이미 서류 심사
대기 상태이므로 `APPLIED`와 사실상 중복이라는 판단(사용자 피드백 반영). 회사마다 실제로 거치는
단계가 달라 보드에서 특정 컬럼을 그냥 건너뛰어도 되도록 단계 순서를 강제하지 않는다.

### 2.3 백엔드 — `com.selfintro.modules.jobapplication`

- `domain/entity`: `JobApplication`, `JobApplicationStageEvent`
- `domain/enums/JobApplicationStage`
- `domain/repository`: `JobApplicationRepository`, `JobApplicationStageEventRepository`
- `application/JobApplicationService`
  - CRUD, `create(request, jobPostingCandidateId)` 오버로드(후보 전환용)
  - `changeStage(id, newStage, memo)` — `JobApplicationStageEvent` 자동 적재
- `presentation/JobApplicationController` (`/api/admin/job-applications`)
  - `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}`
  - `PATCH /{id}/stage` — 단계 전환 (body: `{stage, memo}`)
  - `GET /{id}/stage-events` — 전형 진행 타임라인
  - `POST /parse-url` — 채용공고 URL을 AI로 분석해 회사명/직무명/마감일/연봉메모를 추출,
    등록 폼 자동 채움용(`JobApplicationUrlParseService`, `app.ai.job-application.enabled` 게이팅)

### 2.4 프론트엔드 — `JobApplicationManagement.tsx`

리스트/보드/캘린더 3가지 뷰를 토글로 전환:

- **리스트**: 회사/직무/출처/지원일/마감일/현재단계 테이블, 행 클릭 시 수정 드로어
- **보드**: 전형 단계별 컬럼(뷰포트 높이에 맞춰 늘어남, 컬럼 자체는 창 너비에 맞게 균등 分배),
  카드 드래그로 단계 전환, 맨 왼쪽에 Phase 2 "수집됨" 컬럼도 함께 표시
- **캘린더**: 월 단위로 지원 공고 마감일(파란색) + 수집된 공고 마감일(점선)을 함께 표시
- 등록/수정 드로어에 "공고 URL + AI 자동분석" 버튼으로 폼 자동 채움
- `AdminDashboardShell.tsx`에 "커리어 관리" 사이드바 그룹 + `JOB_APPLICATIONS` 탭

---

## 3. Phase 2 — 유사 공고 수집 (구현 완료, 사람인만)

### 3.1 데이터 수집 방식 — 최종 결정

두 채널이 확정되었고, 워크넷/고용24는 제외되었다.

1. **사람인 Open API** — 실제 연동 완료. `https://oapi.saramin.co.kr/job-search` (공식 개발자
   문서 기준 스펙 확인 후 구현). access-key 발급: [oapi.saramin.co.kr/join](https://oapi.saramin.co.kr/join)
   신청 → 승인 → Application 앱 등록 → access-key 확인.
2. **URL 붙여넣기 + AI 파싱** — 사람인 외 사이트(원티드/잡코리아 등)는 공식 API 없이, 사용자가
   URL 1건을 입력하면 서버가 그 페이지만 단건으로 가져와 AI가 구조화. 벌크 크롤링이 아니라 사람이
   열람을 결정한 페이지 1건을 가져오는 것이라 ToS 리스크가 낮다.
3. **워크넷/고용24 — 제외 결정**. 워크넷 API는 고용24(work24.go.kr)로 통합되었고, 신청 화면에
   "개인회원으로 채용정보API 신청시 채용행사, 공채속보, 공채기업정보 API만 이용 가능하며,
   채용정보목록·채용정보상세 API는 이용 불가"라고 명시되어 있다. 즉 개인 자격으로는 우리가 필요한
   채용공고 상세/목록 자체를 받을 수 없다(사업자등록증 + 직업정보제공사업 신고확인증이 있는
   민간(직업소개, 직업정보제공기관)만 가능). 이 때문에 워크넷 연동은 만들지 않기로 결정
   (`JobPostingSource`에 `WORKNET` 값도 없음, 코드베이스에서 완전히 제거됨).

### 3.2 DB 스키마 (`job_posting_candidate`, `V3__job_posting_candidate.sql` + `V4__job_posting_candidate_matching.sql`)

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | bigint PK | |
| external_id | varchar, nullable | 사람인 공고 id (URL_INGEST는 null) |
| title | varchar | 공고 제목(직무명) |
| company_name | varchar | 회사명 |
| url | varchar, unique | 원본 공고 링크 |
| required_skills_raw | text | 직무코드명 + 사람인 keyword 태그 조합 |
| location | varchar, nullable | 근무지 |
| employment_type | varchar, nullable | 고용형태 |
| source | varchar | `URL_INGEST` / `SARAMIN` |
| deadline | date, nullable | 마감일 |
| salary_note | varchar, nullable | 연봉 정보 |
| status | varchar | `NEW` / `SAVED` / `DISMISSED` / `CONVERTED` / `EXPIRED` |
| match_score | int, nullable | AI가 산출한 매칭 점수(0~100) |
| match_reason | varchar, nullable | AI가 생성한 매칭 근거 |
| fetched_at / updated_at | timestamp | |

- Unique: `url`(전체), `(source, external_id)` — 사람인 재수집 시 중복 방지
- `job_application.job_posting_candidate_id` — 전환 이력 역참조

### 3.3 매칭 파이프라인 (2단계, `JobMatchingService`)

1. **키워드 사전 필터** — 내 `Skill` 이름과 공고 제목+`required_skills_raw`를 단순 텍스트 매칭,
   최소 매치 개수(`app.job-posting.matching.keyword-threshold`, 기본 2) 미달 시 AI 호출 생략.
2. **AI 최종 스코어링** — 임계치 통과 시에만 `NvidiaNimClient`로 `{"score":0-100,"reason":""}`
   생성 (`app.ai.job-posting-matching.enabled`로 게이팅, 기본 false).

### 3.4 사람인 클라이언트 (`SaraminJobPostingClient`)

- `GET https://oapi.saramin.co.kr/job-search` (`Accept: application/json`)
- 파라미터: `access-key`(필수), `keywords`(비우면 보유 Skill 상위 5개로 자동 구성),
  `count`(기본 20, 최대 110), `sort`(기본 `pd`=게시일역순), `loc_cd`/`job_cd`/`ind_cd`(선택)
- 에러 코드 매핑: 1=키 미입력, 2=유효하지 않은 키, 3=잘못된 파라미터, 4=일일 호출한도 초과(500회/일),
  99=알 수 없는 오류 — 각각 적절한 HTTP 상태로 변환
- `active != 1`인 공고(마감/비활성)는 수집 단계에서 제외
- 응답 필드: 회사명, 공고제목, 지역, 고용형태, 직무코드+keyword 태그(→ `required_skills_raw`),
  연봉(`salary.name`), `expiration-timestamp`(→ `deadline`)

### 3.5 수집 트리거 — 수동 버튼 + 스케줄러

- **수동**: `POST /api/admin/job-postings/collect` — `AtomicBoolean`으로 중복 실행 가드
- **자동**: `@Scheduled(cron = app.job-posting.collector.cron)` — `app.job-posting.collector.scheduled-enabled`
  로 opt-in (기본 false)
- 둘 다 실행 후 만료 배치(§3.6)도 함께 수행

### 3.6 만료 처리

- 매 수집 배치 실행 시 `deadline < 오늘`이고 상태가 `NEW`/`SAVED`인 후보를 실제로 `EXPIRED`
  상태로 저장 (삭제하지 않고 이력 보존)
- 목록 조회(`GET /api/admin/job-postings`)는 `NEW`/`SAVED`만 반환, `EXPIRED`는 자동 제외

### 3.7 백엔드 — `com.selfintro.modules.jobapplication` (Phase 1과 같은 모듈에 위치)

- `domain/entity/JobPostingCandidate`, `domain/enums/JobPostingSource`(`URL_INGEST`/`SARAMIN`),
  `domain/enums/JobPostingCandidateStatus`
- `domain/repository/JobPostingCandidateRepository`
- `application/SaraminJobPostingClient` — 사람인 HTTP 호출 + 파싱(§3.4)
- `application/JobMatchingService` — 매칭 파이프라인(§3.3)
- `application/JobPostingCollectorService` — 수집 오케스트레이션 + 만료 배치(§3.5, §3.6)
- `application/JobPostingService` — `ingestUrl`(URL 단건 수집), `save`, `dismiss`,
  `convertToApplication`, `list`
- `presentation/JobPostingController` (`/api/admin/job-postings`)
  - `GET /`, `POST /ingest-url`, `POST /collect`, `PATCH /{id}/save`, `PATCH /{id}/dismiss`,
    `POST /{id}/convert-to-application`
- 설정(`application.yml`):

  ```yaml
  app.job-posting:
    saramin:
      enabled: ${SARAMIN_API_ENABLED:false}
      access-key: ${SARAMIN_ACCESS_KEY:}
      keywords: ${SARAMIN_SEARCH_KEYWORDS:}
      count: ${SARAMIN_SEARCH_COUNT:20}
      sort: ${SARAMIN_SEARCH_SORT:pd}
      loc-cd: ${SARAMIN_SEARCH_LOC_CD:}
      job-cd: ${SARAMIN_SEARCH_JOB_CD:}
      ind-cd: ${SARAMIN_SEARCH_IND_CD:}
    collector:
      scheduled-enabled: ${JOB_POSTING_COLLECTOR_SCHEDULED_ENABLED:false}
      cron: ${JOB_POSTING_COLLECTOR_CRON:0 0 8 * * *}
    matching:
      keyword-threshold: ${JOB_POSTING_MATCHING_KEYWORD_THRESHOLD:2}
  app.ai:
    job-application:
      enabled: ${JOB_APPLICATION_AI_ENABLED:false}   # URL 자동분석
    job-posting-matching:
      enabled: ${JOB_POSTING_MATCHING_AI_ENABLED:false}   # 매칭 AI 스코어링
  ```

  실제 사용하려면 `.env`에 `SARAMIN_ACCESS_KEY`, `SARAMIN_API_ENABLED=true` 추가 후
  `docker compose up -d --build backend`로 재시작.

### 3.8 프론트엔드

- `lib/api/jobPosting.ts` — `list`, `ingestUrl`, `collect`, `save`, `dismiss`, `convertToApplication`
- `JobApplicationManagement.tsx`에 통합(별도 페이지 아님):
  - 헤더에 "지금 수집"(`collect`) / "공고 수집"(URL 단건 `ingestUrl`) 버튼
  - 보드 맨 왼쪽 "수집됨" 컬럼 — 소스 배지, D-day, 매칭 점수 배지, 저장/무시/지원하기 액션
  - 캘린더 뷰에 후보 마감일도 함께 표시

---

## 4. 로드맵 요약

1. **Phase 1** — 완료
2. **Phase 2** — 완료 (사람인만; 워크넷은 개인 자격 API 제한으로 제외)
3. **Phase 3** (미착수): 매칭 점수 기반 알림, 원티드/잡코리아 등 추가 URL 파싱 소스 확장,
   워크넷 파트너/사업자 자격을 얻게 되면 그때 재검토
