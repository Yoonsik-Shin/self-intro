CREATE TABLE `job_application` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `posting_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` date NOT NULL,
  `deadline` date DEFAULT NULL,
  `current_stage` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salary_note` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `memo` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_application_stage` (`current_stage`),
  KEY `idx_job_application_applied_at` (`applied_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_application_stage_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_application_id` bigint NOT NULL,
  `stage` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `memo` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_application_stage_event_application` (`job_application_id`),
  CONSTRAINT `fk_job_application_stage_event_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_application` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
