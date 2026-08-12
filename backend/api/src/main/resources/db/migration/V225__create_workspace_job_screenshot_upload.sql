CREATE TABLE workspace_job_screenshot_upload (
    id VARCHAR(36) NOT NULL,
    workspace_id BIGINT NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    deleted_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_workspace_job_screenshot_object_key (object_key),
    KEY idx_workspace_job_screenshot_expiry (status, expires_at),
    KEY idx_workspace_job_screenshot_workspace (workspace_id, created_at),
    CONSTRAINT fk_workspace_job_screenshot_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE
);
