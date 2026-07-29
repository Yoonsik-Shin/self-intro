ALTER TABLE `job_posting`
  ADD COLUMN `status_changed_at` datetime(6) DEFAULT NULL AFTER `appeal_analyzed_at`;

UPDATE `job_posting` posting
SET `status_changed_at` = COALESCE(
  (
    SELECT MAX(event.`changed_at`)
    FROM `job_posting_status_event` event
    WHERE event.`job_posting_id` = posting.`id`
      AND event.`status` = posting.`status`
  ),
  posting.`created_at`
);

ALTER TABLE `job_posting`
  MODIFY COLUMN `status_changed_at` datetime(6) NOT NULL;
