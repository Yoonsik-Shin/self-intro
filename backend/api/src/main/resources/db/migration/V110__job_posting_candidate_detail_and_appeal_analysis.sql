-- URL 자동수집 시점에 AI가 이미 추출하고 있었지만 저장하지 않고 버려지던 상세 필드
-- (jobDescription 등, job_application과 동일한 컬럼 구성)를 job_posting_candidate에도 저장한다.
-- 아울러 "이 공고에 지원할 때 어필하면 좋은 포인트"를 온디맨드로 분석해 저장할 컬럼을 추가한다.

ALTER TABLE `job_posting_candidate`
  ADD COLUMN `job_description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `salary_note`,
  ADD COLUMN `required_qualifications` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `job_description`,
  ADD COLUMN `preferred_qualifications` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `required_qualifications`,
  ADD COLUMN `hiring_process` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `preferred_qualifications`,
  ADD COLUMN `application_method` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `hiring_process`,
  ADD COLUMN `compensation_detail` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `application_method`,
  ADD COLUMN `appeal_analysis` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `match_reason`,
  ADD COLUMN `appeal_analyzed_at` datetime(6) DEFAULT NULL AFTER `appeal_analysis`;
