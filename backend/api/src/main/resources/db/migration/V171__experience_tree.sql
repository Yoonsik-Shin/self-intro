ALTER TABLE `study`
    ADD COLUMN `section` varchar(20) NOT NULL DEFAULT 'ETC' AFTER `status`;

UPDATE `study` s
JOIN `study_taxonomy_node` stn ON stn.`study_id` = s.`id`
JOIN `taxonomy_node` tn ON tn.`id` = stn.`taxonomy_node_id`
SET s.`section` = 'RETROSPECT'
WHERE tn.`slug` = 'retrospective';

CREATE INDEX `idx_study_section_status_learned_at`
    ON `study` (`section`, `status`, `learned_at`);

CREATE TABLE `decision_situation` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `stable_key` varchar(160) NOT NULL,
    `parent_id` bigint NULL,
    `domain` varchar(30) NOT NULL,
    `topic` varchar(80) NOT NULL,
    `title` varchar(200) NOT NULL,
    `summary` varchar(1000) NOT NULL,
    `problem` text NOT NULL,
    `context_markdown` text NOT NULL,
    `constraints_markdown` text NOT NULL,
    `verification_status` varchar(20) NOT NULL,
    `content_version` int NOT NULL,
    `content_hash` varchar(64) NOT NULL,
    `verified_at` date NULL,
    `next_review_at` date NULL,
    `display_order` int NOT NULL DEFAULT 0,
    `created_at` datetime(6) NOT NULL,
    `updated_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_decision_situation_stable_key` (`stable_key`),
    KEY `idx_decision_situation_domain_topic` (`domain`, `topic`, `display_order`),
    KEY `idx_decision_situation_parent` (`parent_id`),
    CONSTRAINT `fk_decision_situation_parent`
        FOREIGN KEY (`parent_id`) REFERENCES `decision_situation` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `decision_option` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `situation_id` bigint NOT NULL,
    `stable_key` varchar(160) NOT NULL,
    `title` varchar(200) NOT NULL,
    `summary` varchar(1000) NOT NULL,
    `mechanism` text NOT NULL,
    `applicable_when` text NOT NULL,
    `avoid_when` text NOT NULL,
    `advantages` text NOT NULL,
    `disadvantages` text NOT NULL,
    `operational_notes` text NOT NULL,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_decision_option_stable_key` (`stable_key`),
    KEY `idx_decision_option_situation` (`situation_id`, `display_order`),
    CONSTRAINT `fk_decision_option_situation`
        FOREIGN KEY (`situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `decision_tradeoff` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `option_id` bigint NOT NULL,
    `criterion` varchar(40) NOT NULL,
    `level` varchar(30) NOT NULL,
    `explanation` varchar(1200) NOT NULL,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_decision_tradeoff_option_criterion` (`option_id`, `criterion`),
    CONSTRAINT `fk_decision_tradeoff_option`
        FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `decision_warning` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `situation_id` bigint NOT NULL,
    `option_id` bigint NULL,
    `stable_key` varchar(160) NOT NULL,
    `classification` varchar(30) NOT NULL,
    `reason_type` varchar(30) NOT NULL,
    `title` varchar(200) NOT NULL,
    `description` text NOT NULL,
    `failure_condition` text NOT NULL,
    `consequence` text NOT NULL,
    `correction` text NOT NULL,
    `severity` varchar(20) NOT NULL,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_decision_warning_stable_key` (`stable_key`),
    KEY `idx_decision_warning_situation` (`situation_id`, `display_order`),
    CONSTRAINT `fk_decision_warning_situation`
        FOREIGN KEY (`situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_decision_warning_option`
        FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `decision_source` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `situation_id` bigint NOT NULL,
    `option_id` bigint NULL,
    `warning_id` bigint NULL,
    `source_type` varchar(40) NOT NULL,
    `title` varchar(300) NOT NULL,
    `url` varchar(1000) NOT NULL,
    `publisher` varchar(200) NOT NULL,
    `applicable_version` varchar(120) NULL,
    `accessed_at` date NOT NULL,
    `note` varchar(1000) NOT NULL,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_decision_source_situation` (`situation_id`, `display_order`),
    CONSTRAINT `fk_decision_source_situation`
        FOREIGN KEY (`situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_decision_source_option`
        FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_decision_source_warning`
        FOREIGN KEY (`warning_id`) REFERENCES `decision_warning` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `decision_situation_relation` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `source_situation_id` bigint NOT NULL,
    `target_situation_id` bigint NOT NULL,
    `relation_type` varchar(30) NOT NULL,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_decision_situation_relation`
        (`source_situation_id`, `target_situation_id`, `relation_type`),
    CONSTRAINT `fk_decision_relation_source`
        FOREIGN KEY (`source_situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_decision_relation_target`
        FOREIGN KEY (`target_situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `decision_study_link` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `situation_id` bigint NOT NULL,
    `option_id` bigint NULL,
    `option_scope_key` varchar(160) NOT NULL,
    `study_id` bigint NOT NULL,
    `relation_type` varchar(30) NOT NULL,
    `note` varchar(1000) NOT NULL DEFAULT '',
    `display_order` int NOT NULL DEFAULT 0,
    `created_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_decision_study_link`
        (`situation_id`, `option_scope_key`, `study_id`, `relation_type`),
    KEY `idx_decision_study_link_study` (`study_id`),
    CONSTRAINT `fk_decision_study_link_situation`
        FOREIGN KEY (`situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_decision_study_link_option`
        FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_decision_study_link_study`
        FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
