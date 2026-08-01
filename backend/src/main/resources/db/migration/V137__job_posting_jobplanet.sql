ALTER TABLE job_posting
    ADD COLUMN jobplanet_rating DECIMAL(2, 1) NULL AFTER appeal_analyzed_at,
    ADD COLUMN jobplanet_review_count INT NULL AFTER jobplanet_rating,
    ADD COLUMN jobplanet_company_name VARCHAR(120) NULL AFTER jobplanet_review_count,
    ADD COLUMN jobplanet_company_url VARCHAR(500) NULL AFTER jobplanet_company_name,
    ADD COLUMN jobplanet_checked_at DATETIME(6) NULL AFTER jobplanet_company_url;
