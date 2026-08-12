CREATE TABLE `mfa_recovery_code` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `code_hash` BINARY(32) NOT NULL,
    `created_at` DATETIME(6) NOT NULL,
    `consumed_at` DATETIME(6) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_mfa_recovery_code_user_hash` (`user_id`, `code_hash`),
    KEY `idx_mfa_recovery_code_user_active` (`user_id`, `consumed_at`),
    CONSTRAINT `fk_mfa_recovery_code_user`
        FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
);
