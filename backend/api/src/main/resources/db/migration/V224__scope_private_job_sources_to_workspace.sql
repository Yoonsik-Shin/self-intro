ALTER TABLE job_posting
    ADD COLUMN owner_workspace_id BIGINT NULL AFTER id,
    ADD COLUMN scope_key VARCHAR(80) NOT NULL DEFAULT 'PLATFORM' AFTER owner_workspace_id,
    ADD CONSTRAINT fk_job_posting_owner_workspace
        FOREIGN KEY (owner_workspace_id) REFERENCES workspace(id) ON DELETE CASCADE,
    ADD INDEX idx_job_posting_owner_workspace (owner_workspace_id, updated_at),
    DROP INDEX uk_job_posting_url,
    ADD UNIQUE INDEX uk_job_posting_scope_url (scope_key, posting_url);

ALTER TABLE job_posting_source_url
    ADD COLUMN scope_key VARCHAR(80) NOT NULL DEFAULT 'PLATFORM' AFTER job_posting_id,
    DROP INDEX uk_job_posting_source_url_url,
    ADD UNIQUE INDEX uk_job_posting_source_scope_url (scope_key, url);
