-- Add composite index on (job_posting_id, changed_at) to speed up status history timeline queries and avoid filesort
ALTER TABLE `job_posting_status_event`
  ADD INDEX `idx_job_posting_status_event_posting_changed` (`job_posting_id`, `changed_at`);
