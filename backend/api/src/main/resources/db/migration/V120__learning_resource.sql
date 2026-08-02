CREATE TABLE `learning_resource_category` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `slug` varchar(80) NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_learning_resource_category_name` (`name`),
  UNIQUE KEY `uk_learning_resource_category_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `learning_resource` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `slug` varchar(160) NOT NULL,
  `title` varchar(160) NOT NULL,
  `resource_type` varchar(20) NOT NULL,
  `provider` varchar(120) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `instructor_or_author` varchar(120) DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'WISHLIST',
  `priority_tier` varchar(10) DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `category_id` bigint NOT NULL,
  `summary` varchar(500) DEFAULT NULL,
  `detail_markdown` longtext,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_learning_resource_slug` (`slug`),
  KEY `idx_learning_resource_category_id` (`category_id`),
  KEY `idx_learning_resource_status` (`status`),
  CONSTRAINT `fk_learning_resource_category`
    FOREIGN KEY (`category_id`) REFERENCES `learning_resource_category` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `learning_resource_relation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `source_resource_id` bigint NOT NULL,
  `target_resource_id` bigint NOT NULL,
  `relation_type` varchar(30) NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_learning_resource_relation`
    (`source_resource_id`, `target_resource_id`, `relation_type`),
  KEY `fk_learning_resource_relation_target` (`target_resource_id`),
  CONSTRAINT `fk_learning_resource_relation_source`
    FOREIGN KEY (`source_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_learning_resource_relation_target`
    FOREIGN KEY (`target_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `learning_resource_tag` (
  `learning_resource_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`learning_resource_id`, `tag_id`),
  KEY `fk_learning_resource_tag_tag` (`tag_id`),
  CONSTRAINT `fk_learning_resource_tag_resource`
    FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_learning_resource_tag_tag`
    FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `learning_resource_skill` (
  `learning_resource_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  PRIMARY KEY (`learning_resource_id`, `skill_id`),
  KEY `fk_learning_resource_skill_skill` (`skill_id`),
  CONSTRAINT `fk_learning_resource_skill_resource`
    FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_learning_resource_skill_skill`
    FOREIGN KEY (`skill_id`) REFERENCES `skill` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `learning_resource_category` (`name`, `slug`, `display_order`)
VALUES ('미분류', 'uncategorized', 0);
