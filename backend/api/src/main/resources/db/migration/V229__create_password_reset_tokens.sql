CREATE TABLE `password_reset_token` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `token_hash` BINARY(32) NOT NULL,
    `expires_at` DATETIME(6) NOT NULL,
    `used_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_password_reset_token_hash` (`token_hash`),
    KEY `idx_password_reset_token_user` (`user_id`),
    KEY `idx_password_reset_token_retention` (`expires_at`, `used_at`),
    CONSTRAINT `fk_password_reset_token_user`
        FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
);
