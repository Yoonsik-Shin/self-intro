ALTER TABLE `job_application`
  ADD COLUMN `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `salary_note`,
  ADD COLUMN `employment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `location`,
  ADD COLUMN `appeal_analysis` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `compensation_detail`,
  ADD COLUMN `appeal_analyzed_at` datetime(6) DEFAULT NULL AFTER `appeal_analysis`;
