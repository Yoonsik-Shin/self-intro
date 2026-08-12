CREATE TABLE `workspace_visitor_daily_visit` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `workspace_id` bigint NOT NULL,
    `visitor_hash` varchar(64) NOT NULL,
    `visited_date` date NOT NULL,
    `first_visited_at` datetime(6) NOT NULL,
    `last_visited_at` datetime(6) NOT NULL,
    `page_views` bigint NOT NULL DEFAULT 1,
    `user_agent` varchar(255) NULL,
    `is_bot` tinyint(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_workspace_visitor_daily_scope`
        (`workspace_id`, `visitor_hash`, `visited_date`),
    KEY `idx_workspace_visitor_daily_date` (`workspace_id`, `visited_date`),
    CONSTRAINT `fk_workspace_visitor_daily_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_visitor_hourly_visit` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `workspace_id` bigint NOT NULL,
    `visitor_hash` varchar(64) NOT NULL,
    `visited_date` date NOT NULL,
    `visited_hour` int NOT NULL,
    `page_views` bigint NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_workspace_visitor_hourly_scope`
        (`workspace_id`, `visitor_hash`, `visited_date`, `visited_hour`),
    KEY `idx_workspace_visitor_hourly_date` (`workspace_id`, `visited_date`),
    CONSTRAINT `fk_workspace_visitor_hourly_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
