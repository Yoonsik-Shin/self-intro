CREATE TABLE `job_posting_setting` (
  `id` bigint NOT NULL,
  `saramin_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `search_keywords` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `search_count` int NOT NULL DEFAULT '20',
  `search_sort` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pd',
  `location_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collector_scheduled_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `matching_keyword_threshold` int NOT NULL DEFAULT '2',
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
