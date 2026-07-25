ALTER TABLE `job_posting_candidate`
  ADD COLUMN `external_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `id`,
  ADD COLUMN `required_skills_raw` text COLLATE utf8mb4_unicode_ci AFTER `url`,
  ADD COLUMN `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `required_skills_raw`,
  ADD COLUMN `employment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `location`,
  ADD COLUMN `match_score` int DEFAULT NULL AFTER `status`,
  ADD COLUMN `match_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `match_score`,
  ADD UNIQUE KEY `uk_job_posting_candidate_source_external` (`source`, `external_id`);
