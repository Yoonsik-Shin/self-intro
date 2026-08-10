ALTER TABLE `decision_study_link`
    ADD COLUMN `managed_by_catalog` tinyint(1) NOT NULL DEFAULT 0 AFTER `display_order`,
    ADD COLUMN `seed_key` varchar(180) NULL AFTER `managed_by_catalog`,
    ADD UNIQUE KEY `uk_decision_study_link_seed_key` (`seed_key`);

ALTER TABLE `decision_study_link`
    DROP FOREIGN KEY `fk_decision_study_link_option`,
    ADD CONSTRAINT `fk_decision_study_link_option_set_null`
        FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE SET NULL;
