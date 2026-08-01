ALTER TABLE print_template
    ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' AFTER schema_version,
    ADD COLUMN generation_metadata LONGTEXT NULL AFTER source,
    ADD COLUMN generated_at DATETIME(6) NULL AFTER generation_metadata;
