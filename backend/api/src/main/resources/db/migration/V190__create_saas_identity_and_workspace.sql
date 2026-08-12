CREATE TABLE `app_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `login_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_user_login_id` (`login_id`),
  UNIQUE KEY `uk_app_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workspace_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_member` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `workspace_role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `joined_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_member_workspace_user` (`workspace_id`, `user_id`),
  KEY `idx_workspace_member_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_workspace_member_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workspace_member_user`
    FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_platform_role` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `platform_role` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_platform_role_user_role` (`user_id`, `platform_role`),
  CONSTRAINT `fk_user_platform_role_user`
    FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `security_audit_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` bigint DEFAULT NULL,
  `workspace_id` bigint DEFAULT NULL,
  `target_type` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_hash` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_security_audit_actor_created` (`actor_user_id`, `created_at`),
  KEY `idx_security_audit_workspace_created` (`workspace_id`, `created_at`),
  KEY `idx_security_audit_type_created` (`event_type`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
