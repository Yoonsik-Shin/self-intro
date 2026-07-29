# 다중 사용자 지원 시 아키텍처 검토 (조사 문서, 구현 아님)

## 0. 배경

지원 공고 관리 기능(`docs/job-application-tracker-plan.md`)을 다루던 중, "지금 로직이 나
한 사람만 쓴다고 가정하고 짜여 있는데, 여러 명이 쓰게 되면 채용공고 원본 데이터(URL 기준)는
공용 캐시로 두고 '나'와 관련된 데이터는 분리하는 게 낫지 않겠냐"는 질문이 나왔다. 지금 당장
구현하지 않고, 실제로 그럴 필요가 생겼을 때 참고할 수 있도록 현재 구조를 진단하고 목표
아키텍처 후보를 정리해둔다.

**결론 먼저**: 이 사이트는 처음부터 "자기소개서/포트폴리오 + 개인 구직 관리 도구"로 설계되어
있고, 인증부터 스킬·경력 데이터까지 전부 **단일 소유자를 전제**로 짜여 있다. 지원 공고
테이블 하나만 쪼갠다고 다중 사용자가 되지 않는다 — 아래에서 그 이유와, 그럼에도 진짜 필요해질
경우의 두 가지 시나리오별 설계를 정리한다.

---

## 1. 현재 구조 진단 — "단일 사용자 전제"의 증거

### 1.1 인증 자체가 단일 관리자다

`SecurityConfig.java`가 `UserDetailsService`를 `InMemoryUserDetailsManager`로 만들고,
환경변수(`app.admin.username`, `app.admin.password`/`app.admin.password-hash`) 하나로 관리자
계정 **한 명**만 등록한다. `User` 테이블 자체가 DB에 없다. `/api/admin/**`은 전부
`hasRole("ADMIN")`만 검사할 뿐, "어떤 관리자인지"는 애초에 구분하지 않는다.

→ 회원가입/로그인/세션에 "사용자 식별" 개념이 없으므로, 어떤 도메인이든 `user_id`를 붙일
기반 자체가 없다. 이게 선행 과제다.

### 1.2 지원 공고 테이블이 "시장 데이터"와 "내 데이터"를 한 행에 섞어놨다

`job_posting` 한 테이블에 다음이 전부 같이 들어 있다.

| 성격 | 컬럼 예시 |
| --- | --- |
| 공고 자체의 객관적 사실(누가 봐도 같음) | `company_name`, `position_title`, `posting_url`, `deadline`, `is_always_open`, `salary_note`, `location`, `employment_type`, `job_description`, `required_qualifications`, `preferred_qualifications`, `hiring_process`, `application_method`, `compensation_detail` |
| 나의 지원/추적 상태(사용자마다 다를 수 있음) | `status`, `applied_at`, `memo`, `match_score`, `match_reason`, `appeal_analysis`, `appeal_analyzed_at`, `status_changed_at` |

게다가 `posting_url`이 **테이블 전체에서 유니크**하다(`existsByPostingUrl` 체크,
`JobPostingService.ingestUrl`/`create`에서 409 반환). 지금은 사용자가 한 명이라 문제가
안 되지만, 그대로 `user_id`만 얹으면:

- 두 사용자가 같은 공고 URL을 각자 추적하려는 순간 유니크 제약이 깨지거나(스키마를
  `(user_id, posting_url)` 복합 유니크로 바꿔야 함), 먼저 수집한 사람 소유가 되어 다른
  사용자는 "이미 수집된 공고입니다" 409를 받는다.
- 같은 URL을 여러 사용자가 각자 수집하면, 이미 AI로 뽑아놓은 회사명/직무/상세요강을
  재활용하지 못하고 **매번 Playwright 렌더링 + NVIDIA AI 파싱을 처음부터 다시** 돌리게
  된다. 사이트 차단(스크래핑 감지) 위험도, AI 호출 비용도 사용자 수에 비례해 커진다.
- `JobPostingCoverLetterItem`, `JobPostingStatusEvent`가 지금 `job_posting_id` 하나만
  FK로 물고 있는데, 한 공고를 여러 사용자가 공유하게 되면 "누구의 자기소개서 문항인지",
  "누구의 전형 이력인지"를 구분할 방법이 없다.

즉 사용자가 지적한 방향(원본 데이터는 URL 기준 공용 캐시, 나머지는 사용자별 분리)이 정확히
맞는 처방이다.

### 1.3 매칭/어필 분석이 "단일 소유자의 포트폴리오"를 전제로 한다

- `JobMatchingService.evaluate()` → `skillRepository.findAll()`로 **DB에 있는 모든
  Skill**을 "내 보유 기술"로 취급해 매칭 점수를 매긴다. 사용자별 필터가 없다.
- `JobPostingAppealService` → `CareerAppealAnalyzer`가 "지원자의 경력/프로젝트/핵심역량
  데이터"(Experience/Career/Competency 모듈)와 대조해 어필 포인트를 뽑는다. 이 데이터들도
  전부 사용자 구분 없이 전역 테이블이다.

→ 지원 공고를 사용자별로 쪼개도, 매칭 점수와 어필 분석은 여전히 "사이트 주인 한 명의
스킬·경력"만 기준으로 계산된다. **진짜 다중 사용자(각자 자기 이력서 기준으로 매칭)를
만들려면 skill/experience/career/competency/profile/study 모듈까지 전부 사용자별로
쪼개야 한다** — 지원 공고 모듈 하나의 문제가 아니라 사이트 전체 데이터 모델의 문제다.

---

## 2. 시나리오를 먼저 구분해야 한다

"다수가 앱을 사용하게 된다"가 의미하는 바에 따라 필요한 작업량이 완전히 다르다.

### 시나리오 A — 진짜 멀티테넌트 SaaS
남이 각자 회원가입해서, **각자의 이력서/스킬/경력을 입력**하고, 각자 기준으로 매칭 점수를
받고, 각자 지원 현황을 관리한다. (예: 이 프로젝트를 "구직 관리 SaaS 제품"으로 확장)

- 공고 원본(시장 데이터)만 공유 캐시로 두고, 나머지(스킬/경력/역량/자기소개서/지원현황
  전부)는 사용자별로 완전히 분리해야 한다.
- `profile`, `skill`, `experience`, `career`, `competency`, `study` 등 지금 "포트폴리오
  공개 콘텐츠"로 쓰이는 모듈까지 사용자별로 나눌지 결정해야 한다(자기소개서 사이트 자체가
  1인용이라는 제품 정체성이 바뀌는 수준의 변경).
- 작업량이 매우 크다. 지금 당장 할 일은 아니고, "진짜 서비스화" 결정이 선행되어야 한다.

### 시나리오 B — 신뢰할 수 있는 소수의 공동 관리자
가족/멘토 등 몇 명이 로그인 계정만 나눠 갖고, **같은 포트폴리오·같은 스킬·같은 지원 현황을
같이 들여다보고 편집**한다(권한만 나눔, 데이터는 안 나눔).

- `User` 테이블 + 로그인 다중화만 하면 된다. `job_posting` 등 기존 테이블은 **그대로**
  둬도 된다 — 애초에 "내 데이터"라는 개념 자체가 여전히 하나(사이트 소유자 1인분)이기
  때문이다. `created_by`/`updated_by` 정도만 감사 로그용으로 추가하면 충분.
- §1.2에서 지적한 문제(공고 URL 유니크, 캐시 재사용)는 **애초에 발생하지 않는다** — 같은
  공고를 "같이" 보는 거라 중복 수집 자체가 없다.

**진짜로 하고 싶은 게 어느 쪽인지에 따라 그다음 설계가 완전히 달라진다.** 아래 §3~§5는
시나리오 A(진짜 멀티테넌트)를 가정한 목표 아키텍처다. 시나리오 B라면 사실상 별도 작업이
거의 필요 없다.

---

## 3. (시나리오 A 가정) 목표 스키마 — 공용 캐시 / 사용자 데이터 분리

### 3.1 `job_listing` (신규, 공용 "시장 데이터" 캐시)

기존 `job_posting`의 객관적 사실 컬럼만 옮긴다. 사용자 무관.

```
id, source(SARAMIN/URL_INGEST), external_id, posting_url(unique),
company_name, position_title, deadline, is_always_open,
salary_note, location, employment_type,
job_description, required_qualifications, preferred_qualifications,
hiring_process, application_method, compensation_detail,
required_skills_raw,          -- 매칭용 원문(사람인 keyword 등, 공고 자체 속성이라 공용 가능)
last_refreshed_at,            -- 마지막으로 원본 URL에서 다시 읽어온 시각
created_at, updated_at
```

- `posting_url` 유니크 → 같은 URL은 전체 시스템에서 **딱 한 번만** 스크래핑/AI 파싱한다.
- 캐시 정책: 새 사용자가 이미 존재하는 URL을 등록하면 즉시 기존 행을 재사용(무료),
  `last_refreshed_at`이 임계치(예: 24~72시간)보다 오래됐으면 지금 만들어둔
  `JobPostingService.refresh()` 로직을 그대로 재사용해 갱신 후 공유한다. Redis 같은 별도
  캐시 레이어는 이 규모에서는 과함 — DB 유니크 제약 + 타임스탬프만으로 충분하다.

### 3.2 `user_job_application` (신규, 사용자별 추적 데이터)

기존 `job_posting`의 "내 데이터" 컬럼을 옮긴다.

```
id, user_id(FK), job_listing_id(FK),
status, applied_at, memo,
match_score, match_reason,      -- 이 사용자의 스킬 기준 매칭 결과
appeal_analysis, appeal_analyzed_at,  -- 이 사용자의 경력 기준 분석 결과
status_changed_at, created_at, updated_at
UNIQUE(user_id, job_listing_id)  -- 한 사용자가 같은 공고를 두 번 추적하는 것만 방지
```

- `JobPostingCoverLetterItem.job_posting_id` → `user_job_application_id`로 FK 변경
  (자기소개서 문항은 "이 공고에 지원하는 이 사용자"의 것이므로).
- `JobPostingStatusEvent.job_posting_id` → 동일하게 `user_job_application_id`로 변경.

### 3.3 매칭/어필 분석 입력도 사용자별로 스코핑

- `JobMatchingService.evaluate()`가 `skillRepository.findAll()` 대신
  `skillRepository.findAllByUserId(userId)`를 쓰도록(= `Skill`에 `user_id` 추가).
- `CareerAppealAnalyzer`가 참조하는 Experience/Career/Competency도 동일하게 `user_id`
  스코핑 필요.
- 이 부분이 사실상 §1.3에서 지적한 "지원 공고 모듈만의 문제가 아니다"의 실제 작업량이다.

### 3.4 인증

- `InMemoryUserDetailsManager` → 실제 `app_user` 테이블 + `UserDetailsService` 구현으로
  교체. 로그인 시 `Authentication`에 `userId`가 실려야 각 서비스 메서드가
  `SecurityContext`에서 현재 사용자를 꺼내 위 스코핑 쿼리에 넘길 수 있다.
- 가입 방식(공개 회원가입 vs 초대제)은 제품 성격에 달려 있어 여기서 결정하지 않는다.

---

## 4. 마이그레이션 개략

1. `app_user` 테이블 생성, 지금의 단일 관리자를 "사용자 #1"로 시딩.
2. `job_listing` 테이블 생성, 기존 `job_posting`의 객관적 컬럼을 `posting_url` 기준으로
   복사(자연히 중복 없음, 지금은 애초에 URL이 유니크였으므로 1:1 이관).
3. `user_job_application` 테이블 생성, 기존 `job_posting`의 나머지 컬럼 + `user_id = 1`
   + 방금 만든 `job_listing_id`로 복사.
4. `job_posting_cover_letter_item`, `job_posting_status_event`의 FK를
   `user_job_application_id`로 갱신.
5. 애플리케이션 코드가 두 리포지토리(`JobListingRepository`,
   `UserJobApplicationRepository`)를 조합해 지금의 `JobPostingResponse`와 동일한 모양을
   내려주도록 서비스 계층 재작성(프론트 API 계약은 최대한 안 바꾸는 방향).
6. 기존 `job_posting` 테이블 제거.

---

## 5. 지금 당장 결정이 필요한 질문 (구현 전에 답이 있어야 함)

1. **시나리오 A(진짜 멀티테넌트) vs B(공동 관리자)** — 위 §2. 이 답에 따라 작업량이
   10배 이상 차이난다.
2. A라면: 포트폴리오 공개 콘텐츠(profile/skill/experience/career/competency/study)도
   사용자별로 나눌 것인가, 아니면 "포트폴리오는 여전히 1인용, 구직 관리 도구만 여러 사람이
   각자 계정으로 쓰되 매칭 기준 스킬만 별도 입력받을 것인가"?
3. 회원가입을 공개로 열 것인가, 초대/승인제로 할 것인가? (스팸/악용 방지, 사람인 API
   일일 호출 한도(500회/일)를 여러 사용자가 나눠 쓰게 되는 문제도 고려)
4. 캐시 신선도 임계치(§3.1의 `last_refreshed_at` 재사용 기준 시간)는 얼마로 할 것인가 —
   너무 짧으면 캐싱 효과가 없고, 너무 길면 마감일 지난 공고를 다른 사용자에게 그대로
   보여주는 문제가 생긴다.

## 6. 결론 / 권장 다음 단계

- 지금 당장은 구현하지 않는다(요청대로 문서만 정리).
- 다음에 이 주제를 다시 꺼낼 때는 §5의 질문 1번(A vs B)부터 먼저 답을 정하고 시작할 것 —
  그 답이 나머지 전부를 결정한다.
- 만약 A로 간다면, 이 문서의 §3(스키마)·§4(마이그레이션)를 실제 구현 계획의 출발점으로
  쓰면 된다.
