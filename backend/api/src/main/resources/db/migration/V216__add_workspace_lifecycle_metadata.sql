ALTER TABLE workspace
    ADD COLUMN deleted_at DATETIME(6) NULL AFTER updated_at,
    ADD COLUMN deletion_requested_by_user_id BIGINT NULL AFTER deleted_at,
    ADD COLUMN purge_after DATETIME(6) NULL AFTER deletion_requested_by_user_id,
    ADD KEY idx_workspace_lifecycle_purge (status, purge_after);
