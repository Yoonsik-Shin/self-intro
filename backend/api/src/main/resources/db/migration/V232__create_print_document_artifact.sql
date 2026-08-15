CREATE TABLE `print_document_artifact` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `workspace_id` BIGINT NOT NULL,
    `print_template_id` BIGINT NOT NULL,
    `print_template_revision_id` BIGINT NOT NULL,
    `job_posting_id` BIGINT NULL,
    `object_key` VARCHAR(300) NOT NULL,
    `sha256_checksum` CHAR(64) NOT NULL,
    `content_length` BIGINT NOT NULL,
    `content_type` VARCHAR(100) NOT NULL,
    `origin` VARCHAR(30) NOT NULL,
    `renderer_version` VARCHAR(100) NULL,
    `font_bundle_version` VARCHAR(100) NULL,
    `page_count` INT NULL,
    `status` VARCHAR(20) NOT NULL,
    `generated_at` DATETIME(6) NOT NULL,
    `created_at` DATETIME(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_print_document_artifact_object_key` (`object_key`),
    KEY `idx_print_document_artifact_workspace_template`
        (`workspace_id`, `print_template_id`, `id`),
    KEY `idx_print_document_artifact_revision` (`print_template_revision_id`),
    KEY `idx_print_document_artifact_job_posting` (`workspace_id`, `job_posting_id`),
    CONSTRAINT `fk_print_document_artifact_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_print_document_artifact_template`
        FOREIGN KEY (`print_template_id`) REFERENCES `print_template` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_print_document_artifact_revision`
        FOREIGN KEY (`print_template_revision_id`) REFERENCES `print_template_revision` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `chk_print_document_artifact_content_length`
        CHECK (`content_length` > 0),
    CONSTRAINT `chk_print_document_artifact_origin`
        CHECK (`origin` IN ('BROWSER_UPLOAD', 'EXTERNAL_UPLOAD')),
    CONSTRAINT `chk_print_document_artifact_status`
        CHECK (`status` IN ('READY')),
    CONSTRAINT `chk_print_document_artifact_page_count`
        CHECK (`page_count` IS NULL OR `page_count` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
