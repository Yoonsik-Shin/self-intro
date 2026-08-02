ALTER TABLE `job_posting_setting` ALTER COLUMN `matching_keyword_threshold` SET DEFAULT 0;
UPDATE `job_posting_setting` SET `matching_keyword_threshold` = 0 WHERE `id` = 1;
