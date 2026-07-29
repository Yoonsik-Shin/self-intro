-- "아직 지원 안 한 후보"(job_posting_candidate)와 "이미 지원한 공고"(job_application)를 하나의
-- 생애주기 테이블(job_posting)로 통합한다. 두 테이블이 사실상 같은 공고의 서로 다른 시점을
-- 나타낼 뿐이라, 상태값 하나(job_posting.status)가 NEW→SAVED→...→APPLIED→...→OFFER까지
-- 이어지도록 하고, 지원 전환 시 새 행을 만들고 필드를 복사하던 것도 없앤다.
--
-- 데이터 이전 순서:
--   1) job_posting/job_posting_status_event 테이블 생성 (이전 중에만 쓰는 legacy_* 임시 컬럼 포함)
--   2) CONVERTED 상태가 아닌 후보(아직 지원 전) → job_posting에 그대로 이전
--   3) 지원 공고(job_application) → job_posting에 이전. job_posting_candidate_id로 연결된
--      원본 후보가 있으면 그 후보의 필드(수집 당시 정보)와 지원 공고의 필드(그 이후 수정분)를
--      합쳐 한 행으로 만든다 — 지원 공고 쪽 값을 우선하고, 지원 공고에 없는 필드(매칭 점수 등)만
--      후보 쪽에서 채운다.
--   4) job_application_stage_event → job_posting_status_event로 이전(legacy_application_id로 매칭)
--   5) 임시 컬럼/구 테이블 정리

CREATE TABLE `job_posting` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `posting_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection_method` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` date DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `salary_note` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `memo` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `required_skills_raw` text COLLATE utf8mb4_unicode_ci,
  `job_description` text COLLATE utf8mb4_unicode_ci,
  `required_qualifications` text COLLATE utf8mb4_unicode_ci,
  `preferred_qualifications` text COLLATE utf8mb4_unicode_ci,
  `hiring_process` text COLLATE utf8mb4_unicode_ci,
  `application_method` text COLLATE utf8mb4_unicode_ci,
  `compensation_detail` text COLLATE utf8mb4_unicode_ci,
  `match_score` int DEFAULT NULL,
  `match_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `appeal_analysis` text COLLATE utf8mb4_unicode_ci,
  `appeal_analyzed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_job_posting_url` (`posting_url`),
  KEY `idx_job_posting_status` (`status`),
  KEY `idx_job_posting_applied_at` (`applied_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_posting_status_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_posting_id` bigint NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `memo` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_posting_status_event_posting` (`job_posting_id`),
  CONSTRAINT `fk_job_posting_status_event_posting`
    FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `job_posting`
  ADD COLUMN `legacy_candidate_id` bigint DEFAULT NULL,
  ADD COLUMN `legacy_application_id` bigint DEFAULT NULL;

-- 1) 전환되지 않은 후보(아직 지원 전) 그대로 이전
INSERT INTO `job_posting` (
  company_name, position_title, posting_url, external_id, collection_method, source, status,
  applied_at, deadline, salary_note, location, employment_type, memo,
  required_skills_raw, job_description, required_qualifications, preferred_qualifications,
  hiring_process, application_method, compensation_detail,
  match_score, match_reason, appeal_analysis, appeal_analyzed_at,
  created_at, updated_at, legacy_candidate_id
)
SELECT
  c.company_name, c.title, c.url, c.external_id, c.source,
  CASE c.source WHEN 'SARAMIN' THEN '사람인' ELSE 'URL 수집' END,
  c.status,
  NULL, c.deadline, c.salary_note, c.location, c.employment_type, NULL,
  c.required_skills_raw, c.job_description, c.required_qualifications, c.preferred_qualifications,
  c.hiring_process, c.application_method, c.compensation_detail,
  c.match_score, c.match_reason, c.appeal_analysis, c.appeal_analyzed_at,
  c.fetched_at, c.updated_at, c.id
FROM `job_posting_candidate` c
WHERE c.status <> 'CONVERTED';

-- 2) 지원 공고(전환된 후보가 있으면 그 후보 정보와 합쳐서) 이전
INSERT INTO `job_posting` (
  company_name, position_title, posting_url, external_id, collection_method, source, status,
  applied_at, deadline, salary_note, location, employment_type, memo,
  required_skills_raw, job_description, required_qualifications, preferred_qualifications,
  hiring_process, application_method, compensation_detail,
  match_score, match_reason, appeal_analysis, appeal_analyzed_at,
  created_at, updated_at, legacy_application_id, legacy_candidate_id
)
SELECT
  a.company_name, a.position_title, a.posting_url,
  c.external_id,
  COALESCE(c.source, 'MANUAL'),
  a.source,
  a.current_stage,
  a.applied_at, a.deadline, a.salary_note,
  COALESCE(a.location, c.location), COALESCE(a.employment_type, c.employment_type),
  a.memo,
  c.required_skills_raw,
  COALESCE(a.job_description, c.job_description),
  COALESCE(a.required_qualifications, c.required_qualifications),
  COALESCE(a.preferred_qualifications, c.preferred_qualifications),
  COALESCE(a.hiring_process, c.hiring_process),
  COALESCE(a.application_method, c.application_method),
  COALESCE(a.compensation_detail, c.compensation_detail),
  c.match_score, c.match_reason,
  COALESCE(a.appeal_analysis, c.appeal_analysis),
  COALESCE(a.appeal_analyzed_at, c.appeal_analyzed_at),
  a.created_at, a.updated_at, a.id, a.job_posting_candidate_id
FROM `job_application` a
LEFT JOIN `job_posting_candidate` c ON c.id = a.job_posting_candidate_id;

-- 3) 전형/상태 변경 이력 이전
INSERT INTO `job_posting_status_event` (job_posting_id, status, memo, changed_at)
SELECT jp.id, e.stage, e.memo, e.changed_at
FROM `job_application_stage_event` e
JOIN `job_posting` jp ON jp.legacy_application_id = e.job_application_id;

-- 4) 이전용 임시 컬럼과 구 테이블 정리
ALTER TABLE `job_posting`
  DROP COLUMN `legacy_candidate_id`,
  DROP COLUMN `legacy_application_id`;

DROP TABLE `job_application_stage_event`;
DROP TABLE `job_application`;
DROP TABLE `job_posting_candidate`;
