-- 원본 기록의 공개 flag를 Workspace 공개 페이지 구성 draft로 분리한다.
-- 레거시 column은 호환 검증이 끝날 때까지 유지하고 신규 canonical API만 이 표를 변경한다.

ALTER TABLE `experience`
    ADD UNIQUE KEY `uk_experience_id_workspace_public_config` (`id`, `workspace_id`);

ALTER TABLE `competency`
    ADD UNIQUE KEY `uk_competency_id_workspace_public_config` (`id`, `workspace_id`);

ALTER TABLE `workspace_skill`
    ADD UNIQUE KEY `uk_workspace_skill_id_workspace_public_config` (`id`, `workspace_id`);

ALTER TABLE `portfolio_case_study`
    ADD UNIQUE KEY `uk_portfolio_case_id_workspace_public_config` (`id`, `workspace_id`);

CREATE TABLE `workspace_public_page_draft` (
    `workspace_id` bigint NOT NULL,
    `config_version` int NOT NULL DEFAULT 1,
    `dirty_since` datetime(6) NULL,
    `updated_by_user_id` bigint NULL,
    `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`workspace_id`),
    KEY `idx_public_page_draft_updater` (`updated_by_user_id`),
    CONSTRAINT `fk_public_page_draft_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_page_draft_updater`
        FOREIGN KEY (`updated_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_profile_config` (
    `workspace_id` bigint NOT NULL,
    `show_name` tinyint(1) NOT NULL DEFAULT 1,
    `show_name_en` tinyint(1) NOT NULL DEFAULT 1,
    `show_job_title` tinyint(1) NOT NULL DEFAULT 1,
    `show_bio` tinyint(1) NOT NULL DEFAULT 1,
    `show_core_stack_summary` tinyint(1) NOT NULL DEFAULT 1,
    `show_status_badge` tinyint(1) NOT NULL DEFAULT 1,
    `show_github` tinyint(1) NOT NULL DEFAULT 1,
    `show_email` tinyint(1) NOT NULL DEFAULT 0,
    `show_phone` tinyint(1) NOT NULL DEFAULT 0,
    `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`workspace_id`),
    CONSTRAINT `fk_public_profile_config_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_skill_selection` (
    `workspace_id` bigint NOT NULL,
    `workspace_skill_id` bigint NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `featured` tinyint(1) NOT NULL DEFAULT 0,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`workspace_id`, `workspace_skill_id`),
    CONSTRAINT `fk_public_skill_selection_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_skill_selection_owned_skill`
        FOREIGN KEY (`workspace_skill_id`, `workspace_id`)
        REFERENCES `workspace_skill` (`id`, `workspace_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_competency_selection` (
    `workspace_id` bigint NOT NULL,
    `competency_id` bigint NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`workspace_id`, `competency_id`),
    CONSTRAINT `fk_public_competency_selection_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_competency_selection_owned_competency`
        FOREIGN KEY (`competency_id`, `workspace_id`)
        REFERENCES `competency` (`id`, `workspace_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_experience_selection` (
    `workspace_id` bigint NOT NULL,
    `experience_id` bigint NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `display_order` int NOT NULL DEFAULT 0,
    `show_on_timeline` tinyint(1) NOT NULL DEFAULT 1,
    `timeline_label` varchar(60) NULL,
    PRIMARY KEY (`workspace_id`, `experience_id`),
    CONSTRAINT `fk_public_experience_selection_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_experience_selection_owned_experience`
        FOREIGN KEY (`experience_id`, `workspace_id`)
        REFERENCES `experience` (`id`, `workspace_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_experience_detail_selection` (
    `workspace_id` bigint NOT NULL,
    `experience_id` bigint NOT NULL,
    `experience_detail_id` bigint NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`workspace_id`, `experience_detail_id`),
    KEY `idx_public_experience_detail_parent`
        (`workspace_id`, `experience_id`, `display_order`),
    CONSTRAINT `fk_public_experience_detail_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_experience_detail_owned_experience`
        FOREIGN KEY (`experience_id`, `workspace_id`)
        REFERENCES `experience` (`id`, `workspace_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_experience_detail_owned_detail`
        FOREIGN KEY (`experience_detail_id`, `experience_id`)
        REFERENCES `experience_detail` (`id`, `experience_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_experience_placement` (
    `workspace_id` bigint NOT NULL,
    `experience_id` bigint NOT NULL,
    `placement_type` varchar(40) NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`workspace_id`, `experience_id`, `placement_type`),
    KEY `idx_public_experience_placement_type`
        (`workspace_id`, `placement_type`, `enabled`, `display_order`),
    CONSTRAINT `fk_public_experience_placement_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_experience_placement_owned_experience`
        FOREIGN KEY (`experience_id`, `workspace_id`)
        REFERENCES `experience` (`id`, `workspace_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_portfolio_selection` (
    `workspace_id` bigint NOT NULL,
    `portfolio_case_study_id` bigint NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`workspace_id`, `portfolio_case_study_id`),
    CONSTRAINT `fk_public_portfolio_selection_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_portfolio_selection_owned_case`
        FOREIGN KEY (`portfolio_case_study_id`, `workspace_id`)
        REFERENCES `portfolio_case_study` (`id`, `workspace_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_study_selection` (
    `workspace_id` bigint NOT NULL,
    `study_id` bigint NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 0,
    `display_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`workspace_id`, `study_id`),
    CONSTRAINT `fk_public_study_selection_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_study_selection_owned_study`
        FOREIGN KEY (`study_id`, `workspace_id`)
        REFERENCES `study` (`id`, `workspace_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_taxonomy_selection` (
    `workspace_id` bigint NOT NULL,
    `taxonomy_node_id` bigint NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `display_order` int NOT NULL DEFAULT 0,
    `display_label` varchar(100) NULL,
    PRIMARY KEY (`workspace_id`, `taxonomy_node_id`),
    KEY `idx_public_taxonomy_selection_order`
        (`workspace_id`, `enabled`, `display_order`, `taxonomy_node_id`),
    CONSTRAINT `fk_public_taxonomy_selection_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_taxonomy_selection_node`
        FOREIGN KEY (`taxonomy_node_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_profile_revision` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `workspace_id` bigint NOT NULL,
    `revision_number` int NOT NULL,
    `content_json` longtext NOT NULL,
    `created_by_user_id` bigint NULL,
    `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_public_profile_revision_number` (`workspace_id`, `revision_number`),
    KEY `idx_public_profile_revision_creator` (`created_by_user_id`),
    CONSTRAINT `fk_public_profile_revision_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_profile_revision_creator`
        FOREIGN KEY (`created_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_public_experience_revision` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `workspace_id` bigint NOT NULL,
    `revision_number` int NOT NULL,
    `content_json` longtext NOT NULL,
    `created_by_user_id` bigint NULL,
    `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_public_experience_revision_number` (`workspace_id`, `revision_number`),
    KEY `idx_public_experience_revision_creator` (`created_by_user_id`),
    CONSTRAINT `fk_public_experience_revision_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_public_experience_revision_creator`
        FOREIGN KEY (`created_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기존 Workspace가 보던 화면을 그대로 초안으로 옮긴다.
INSERT INTO `workspace_public_page_draft` (`workspace_id`, `config_version`)
SELECT `id`, 1 FROM `workspace`;

INSERT INTO `workspace_public_profile_config`
    (`workspace_id`, `show_email`, `show_phone`)
SELECT w.`id`, COALESCE(p.`public_email`, 0), COALESCE(p.`public_phone`, 0)
FROM `workspace` w
LEFT JOIN `profile` p ON p.`workspace_id` = w.`id`;

INSERT INTO `workspace_public_skill_selection`
    (`workspace_id`, `workspace_skill_id`, `enabled`, `featured`, `display_order`)
SELECT ws.`workspace_id`, ws.`id`, 1, ws.`is_core`, ws.`display_order`
FROM `workspace_skill` ws;

INSERT INTO `workspace_public_competency_selection`
    (`workspace_id`, `competency_id`, `enabled`, `display_order`)
SELECT c.`workspace_id`, c.`id`, c.`is_visible`, c.`display_order`
FROM `competency` c;

INSERT INTO `workspace_public_experience_selection`
    (`workspace_id`, `experience_id`, `enabled`, `display_order`, `show_on_timeline`, `timeline_label`)
SELECT e.`workspace_id`, e.`id`, 1, e.`display_order`, e.`show_on_timeline`, e.`timeline_label`
FROM `experience` e;

INSERT INTO `workspace_public_experience_detail_selection`
    (`workspace_id`, `experience_id`, `experience_detail_id`, `enabled`, `display_order`)
SELECT e.`workspace_id`, e.`id`, d.`id`, (d.`visible` AND d.`public_visible`), d.`display_order`
FROM `experience_detail` d
JOIN `experience` e ON e.`id` = d.`experience_id`;

INSERT INTO `workspace_public_experience_placement`
    (`workspace_id`, `experience_id`, `placement_type`, `enabled`, `display_order`)
SELECT e.`workspace_id`, ep.`experience_id`, ep.`placement_type`, ep.`enabled`, ep.`display_order`
FROM `experience_placement` ep
JOIN `experience` e ON e.`id` = ep.`experience_id`;

INSERT INTO `workspace_public_portfolio_selection`
    (`workspace_id`, `portfolio_case_study_id`, `enabled`, `display_order`)
SELECT pcs.`workspace_id`, pcs.`id`, (pcs.`status` = 'PUBLISHED'), 0
FROM `portfolio_case_study` pcs;

INSERT INTO `workspace_public_study_selection`
    (`workspace_id`, `study_id`, `enabled`, `display_order`)
SELECT s.`workspace_id`, s.`id`, (s.`status` = 'PUBLISHED'),
       ROW_NUMBER() OVER (PARTITION BY s.`workspace_id` ORDER BY s.`learned_at` DESC, s.`id` DESC) - 1
FROM `study` s;

INSERT INTO `workspace_public_taxonomy_selection`
    (`workspace_id`, `taxonomy_node_id`, `enabled`, `display_order`)
SELECT c.`workspace_id`, c.`taxonomy_node_id`, 1, c.`display_order`
FROM `study_taxonomy_curation` c;
