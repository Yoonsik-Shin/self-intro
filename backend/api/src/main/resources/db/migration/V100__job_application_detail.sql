ALTER TABLE `job_application`
  ADD COLUMN `job_description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `memo`,
  ADD COLUMN `required_qualifications` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `job_description`,
  ADD COLUMN `preferred_qualifications` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `required_qualifications`,
  ADD COLUMN `hiring_process` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `preferred_qualifications`,
  ADD COLUMN `application_method` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `hiring_process`,
  ADD COLUMN `compensation_detail` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `application_method`;
