CREATE TABLE IF NOT EXISTS `print_template_revision` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `print_template_id` BIGINT NOT NULL,
    `sender_type` VARCHAR(10) NOT NULL,
    `content` TEXT NOT NULL,
    `ai_model` VARCHAR(50),
    `created_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_print_template_revision_template_id` (`print_template_id`),
    CONSTRAINT `fk_print_template_revision_template`
        FOREIGN KEY (`print_template_id`) REFERENCES `print_template` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
