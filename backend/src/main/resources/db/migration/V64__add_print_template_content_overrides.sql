ALTER TABLE print_template
    ADD COLUMN target_role VARCHAR(60) NOT NULL DEFAULT 'GENERAL' AFTER section_gaps,
    ADD COLUMN content_overrides LONGTEXT NULL AFTER target_role,
    ADD COLUMN base_content_fingerprint VARCHAR(64) NULL AFTER content_overrides,
    ADD COLUMN schema_version INT NOT NULL DEFAULT 2 AFTER base_content_fingerprint;

UPDATE print_template
SET content_overrides = '{}'
WHERE content_overrides IS NULL OR content_overrides = '';

ALTER TABLE print_template
    MODIFY COLUMN content_overrides LONGTEXT NOT NULL;
