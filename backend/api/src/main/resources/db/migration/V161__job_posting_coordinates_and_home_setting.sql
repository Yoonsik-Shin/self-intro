ALTER TABLE job_posting
    ADD COLUMN latitude DECIMAL(10, 7) NULL,
    ADD COLUMN longitude DECIMAL(10, 7) NULL;

ALTER TABLE job_posting_setting
    ADD COLUMN home_address VARCHAR(255) NULL,
    ADD COLUMN home_latitude DECIMAL(10, 7) NULL,
    ADD COLUMN home_longitude DECIMAL(10, 7) NULL;
