-- 성능 최적화를 위한 복합 인덱스 신설
-- job_posting: status_changed_at, (status, deadline)
-- learning_resource: (priority_tier, display_order)

ALTER TABLE `job_posting` ADD INDEX `idx_job_posting_status_changed` (`status_changed_at`);
ALTER TABLE `job_posting` ADD INDEX `idx_job_posting_status_deadline` (`status`, `deadline`);
ALTER TABLE `learning_resource` ADD INDEX `idx_learning_resource_priority_order` (`priority_tier`, `display_order`);
