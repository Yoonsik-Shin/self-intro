CREATE TABLE `email_change_token` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `new_email` VARCHAR(255) NOT NULL,
    `new_email_canonical` VARCHAR(255) NOT NULL,
    `token_hash` BINARY(32) NOT NULL,
    `expires_at` DATETIME(6) NOT NULL,
    `used_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_email_change_token_hash` (`token_hash`),
    KEY `idx_email_change_token_user` (`user_id`),
    KEY `idx_email_change_token_retention` (`expires_at`, `used_at`),
    CONSTRAINT `fk_email_change_token_user`
        FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
);
