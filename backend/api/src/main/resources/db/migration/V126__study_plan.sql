CREATE TABLE `study_plan` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `weekly_available_minutes` int NOT NULL,
  `focus_goal` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `confirmed_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_plan_stage` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `study_plan_id` bigint NOT NULL,
  `stage_order` int NOT NULL,
  `theme` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_study_plan_stage_order` (`study_plan_id`, `stage_order`),
  CONSTRAINT `fk_study_plan_stage_plan`
    FOREIGN KEY (`study_plan_id`) REFERENCES `study_plan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_plan_item` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `study_plan_stage_id` bigint NOT NULL,
  `learning_resource_id` bigint DEFAULT NULL,
  `free_text_label` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allocated_minutes` int NOT NULL,
  `display_order` int NOT NULL,
  `completed` boolean NOT NULL DEFAULT false,
  `completed_at` datetime(6) DEFAULT NULL,
  `understanding_checked` boolean NOT NULL DEFAULT false,
  `understanding_checked_at` datetime(6) DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_study_plan_item_stage` (`study_plan_stage_id`),
  CONSTRAINT `fk_study_plan_item_stage`
    FOREIGN KEY (`study_plan_stage_id`) REFERENCES `study_plan_stage` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_plan_item_resource`
    FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_plan_check_question` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `study_plan_item_id` bigint NOT NULL,
  `question` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_answer_hint` text COLLATE utf8mb4_unicode_ci,
  `display_order` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_study_plan_check_question_item` (`study_plan_item_id`),
  CONSTRAINT `fk_study_plan_check_question_item`
    FOREIGN KEY (`study_plan_item_id`) REFERENCES `study_plan_item` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_plan_message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `study_plan_id` bigint NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_study_plan_message_plan` (`study_plan_id`),
  CONSTRAINT `fk_study_plan_message_plan`
    FOREIGN KEY (`study_plan_id`) REFERENCES `study_plan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
