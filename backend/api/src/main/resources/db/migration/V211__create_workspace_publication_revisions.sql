CREATE TABLE `workspace_publication_revision` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `workspace_id` bigint NOT NULL,
    `revision_number` int NOT NULL,
    `schema_version` int NOT NULL DEFAULT 1,
    `published_by_user_id` bigint NULL,
    `published_at` datetime(6) NOT NULL,
    `created_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_workspace_publication_revision_number`
        (`workspace_id`, `revision_number`),
    KEY `idx_workspace_publication_latest`
        (`workspace_id`, `published_at`, `id`),
    KEY `idx_workspace_publication_publisher` (`published_by_user_id`),
    CONSTRAINT `fk_workspace_publication_revision_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_workspace_publication_revision_publisher`
        FOREIGN KEY (`published_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_publication_resource` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `revision_id` bigint NOT NULL,
    `resource_type` varchar(40) NOT NULL,
    `resource_key` varchar(190) NOT NULL,
    `content_json` longtext NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_workspace_publication_resource`
        (`revision_id`, `resource_type`, `resource_key`),
    KEY `idx_workspace_publication_resource_type`
        (`revision_id`, `resource_type`, `id`),
    CONSTRAINT `fk_workspace_publication_resource_revision`
        FOREIGN KEY (`revision_id`) REFERENCES `workspace_publication_revision` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
