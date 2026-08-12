CREATE TABLE workspace_purge_job (
    id BIGINT NOT NULL AUTO_INCREMENT,
    workspace_id BIGINT NOT NULL,
    workspace_public_key BINARY(16) NOT NULL,
    requested_by_user_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    eligible_at DATETIME(6) NOT NULL,
    last_inspected_at DATETIME(6) NULL,
    started_at DATETIME(6) NULL,
    completed_at DATETIME(6) NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    blocker_count INT NOT NULL DEFAULT 0,
    inventory_version VARCHAR(40) NOT NULL,
    last_error_code VARCHAR(80) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_workspace_purge_job_workspace (workspace_id),
    KEY idx_workspace_purge_job_status_eligible (status, eligible_at)
);

CREATE TABLE workspace_purge_checkpoint (
    id BIGINT NOT NULL AUTO_INCREMENT,
    purge_job_id BIGINT NOT NULL,
    store_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    candidate_count BIGINT NOT NULL DEFAULT 0,
    blocker_code VARCHAR(80) NULL,
    inspection_summary VARCHAR(500) NULL,
    last_inspected_at DATETIME(6) NULL,
    completed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_workspace_purge_checkpoint_store (purge_job_id, store_type),
    CONSTRAINT fk_workspace_purge_checkpoint_job
        FOREIGN KEY (purge_job_id) REFERENCES workspace_purge_job (id) ON DELETE CASCADE
);
