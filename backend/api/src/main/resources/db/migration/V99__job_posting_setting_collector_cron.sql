ALTER TABLE `job_posting_setting`
  ADD COLUMN `collector_cron` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0 0 8 * * *' AFTER `matching_keyword_threshold`;
