ALTER TABLE `experience_placement`
    ADD UNIQUE KEY `uk_experience_placement_id_experience` (`id`, `experience_id`);

ALTER TABLE `experience_detail`
    ADD UNIQUE KEY `uk_experience_detail_id_experience` (`id`, `experience_id`);

ALTER TABLE `experience_placement_detail`
    ADD COLUMN `experience_id` bigint NULL AFTER `placement_id`;

UPDATE `experience_placement_detail` mapping
JOIN `experience_placement` placement ON placement.`id` = mapping.`placement_id`
SET mapping.`experience_id` = placement.`experience_id`
WHERE mapping.`experience_id` IS NULL;

ALTER TABLE `experience_placement_detail`
    DROP FOREIGN KEY `fk_placement_detail_placement`,
    DROP FOREIGN KEY `fk_placement_detail_experience_detail`,
    MODIFY COLUMN `experience_id` bigint NOT NULL,
    ADD KEY `idx_placement_detail_placement_experience` (`placement_id`, `experience_id`),
    ADD KEY `idx_placement_detail_detail_experience` (`experience_detail_id`, `experience_id`),
    ADD CONSTRAINT `fk_placement_detail_placement_experience`
        FOREIGN KEY (`placement_id`, `experience_id`)
        REFERENCES `experience_placement` (`id`, `experience_id`) ON DELETE CASCADE,
    ADD CONSTRAINT `fk_placement_detail_detail_experience`
        FOREIGN KEY (`experience_detail_id`, `experience_id`)
        REFERENCES `experience_detail` (`id`, `experience_id`) ON DELETE CASCADE;
