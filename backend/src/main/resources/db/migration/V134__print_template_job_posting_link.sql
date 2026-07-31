ALTER TABLE `print_template`
  ADD COLUMN `job_posting_id` bigint DEFAULT NULL AFTER `display_order`,
  ADD COLUMN `is_final_submission` tinyint(1) NOT NULL DEFAULT '0' AFTER `job_posting_id`,
  ADD KEY `idx_print_template_job_posting` (`job_posting_id`),
  ADD CONSTRAINT `fk_print_template_job_posting`
    FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE SET NULL;
