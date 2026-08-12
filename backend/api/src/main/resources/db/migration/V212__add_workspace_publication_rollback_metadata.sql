ALTER TABLE `workspace_publication_revision`
    ADD COLUMN `operation_type` varchar(20) NOT NULL DEFAULT 'PUBLISH'
        AFTER `schema_version`,
    ADD COLUMN `source_revision_number` int NULL
        AFTER `operation_type`,
    ADD KEY `idx_workspace_publication_retention`
        (`workspace_id`, `created_at`, `revision_number`);
