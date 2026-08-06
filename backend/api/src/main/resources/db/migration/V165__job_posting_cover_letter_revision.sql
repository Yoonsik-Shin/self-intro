CREATE TABLE IF NOT EXISTS `job_posting_cover_letter_revision` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `cover_letter_item_id` BIGINT NOT NULL,
    `sender_type` VARCHAR(10) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_jp_cl_revision_item_id` (`cover_letter_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
