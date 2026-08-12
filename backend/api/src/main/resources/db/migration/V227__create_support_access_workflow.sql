CREATE TABLE `support_access_request` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `workspace_id` BIGINT NOT NULL,
    `operator_user_id` BIGINT NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `requested_duration_minutes` INT NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `requested_at` DATETIME(6) NOT NULL,
    `request_expires_at` DATETIME(6) NOT NULL,
    `approved_at` DATETIME(6) NULL,
    `approved_by_user_id` BIGINT NULL,
    `access_expires_at` DATETIME(6) NULL,
    `denied_at` DATETIME(6) NULL,
    `denied_by_user_id` BIGINT NULL,
    `revoked_at` DATETIME(6) NULL,
    `revoked_by_user_id` BIGINT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_support_access_workspace_status` (`workspace_id`, `status`, `requested_at`),
    KEY `idx_support_access_operator_status` (`operator_user_id`, `status`, `requested_at`),
    CONSTRAINT `fk_support_access_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_support_access_operator`
        FOREIGN KEY (`operator_user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_support_access_approved_by`
        FOREIGN KEY (`approved_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_support_access_denied_by`
        FOREIGN KEY (`denied_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_support_access_revoked_by`
        FOREIGN KEY (`revoked_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_support_access_duration`
        CHECK (`requested_duration_minutes` BETWEEN 15 AND 60),
    CONSTRAINT `chk_support_access_status`
        CHECK (`status` IN ('PENDING', 'APPROVED', 'DENIED', 'REVOKED'))
);

CREATE TABLE `support_access_request_scope` (
    `request_id` BIGINT NOT NULL,
    `scope` VARCHAR(40) NOT NULL,
    PRIMARY KEY (`request_id`, `scope`),
    CONSTRAINT `fk_support_access_scope_request`
        FOREIGN KEY (`request_id`) REFERENCES `support_access_request` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_support_access_scope`
        CHECK (`scope` IN ('PROFILE_READ', 'EXPERIENCE_READ', 'STUDY_READ'))
);
