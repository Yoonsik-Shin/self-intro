CREATE TABLE gap_project_document (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_posting_id BIGINT NOT NULL,
    version INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    source_appeal_analyzed_at DATETIME(6) NULL,
    gap_snapshot LONGTEXT NOT NULL,
    content_json LONGTEXT NOT NULL,
    rendered_markdown LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_gap_project_document_version UNIQUE (job_posting_id, version),
    CONSTRAINT fk_gap_project_document_job_posting
        FOREIGN KEY (job_posting_id) REFERENCES job_posting(id) ON DELETE CASCADE
);

CREATE INDEX idx_gap_project_document_job_posting
    ON gap_project_document(job_posting_id, version DESC);
