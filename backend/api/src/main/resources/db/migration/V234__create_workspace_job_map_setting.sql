CREATE TABLE workspace_job_map_setting (
    workspace_id BIGINT NOT NULL,
    home_address VARCHAR(255) NULL,
    home_latitude DECIMAL(10, 7) NULL,
    home_longitude DECIMAL(10, 7) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (workspace_id),
    CONSTRAINT fk_workspace_job_map_setting_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE
);
