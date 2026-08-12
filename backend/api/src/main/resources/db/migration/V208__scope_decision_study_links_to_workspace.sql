ALTER TABLE `study`
    ADD UNIQUE KEY `uk_study_id_workspace` (`id`, `workspace_id`);

ALTER TABLE `decision_study_link`
    ADD COLUMN `workspace_id` bigint NULL AFTER `id`,
    ADD KEY `idx_decision_study_link_situation` (`situation_id`);

UPDATE `decision_study_link` link
JOIN `study` study ON study.`id` = link.`study_id`
SET link.`workspace_id` = study.`workspace_id`
WHERE link.`workspace_id` IS NULL;

ALTER TABLE `decision_study_link`
    DROP FOREIGN KEY `fk_decision_study_link_study`,
    DROP INDEX `uk_decision_study_link`,
    DROP INDEX `uk_decision_study_link_seed_key`,
    MODIFY COLUMN `workspace_id` bigint NOT NULL,
    ADD UNIQUE KEY `uk_decision_study_link_workspace`
        (`workspace_id`, `situation_id`, `option_scope_key`, `study_id`, `relation_type`),
    ADD UNIQUE KEY `uk_decision_study_link_workspace_seed` (`workspace_id`, `seed_key`),
    ADD KEY `idx_decision_study_link_workspace_situation`
        (`workspace_id`, `situation_id`, `display_order`),
    ADD CONSTRAINT `fk_decision_study_link_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    ADD CONSTRAINT `fk_decision_study_link_study_workspace`
        FOREIGN KEY (`study_id`, `workspace_id`)
        REFERENCES `study` (`id`, `workspace_id`) ON DELETE CASCADE;
