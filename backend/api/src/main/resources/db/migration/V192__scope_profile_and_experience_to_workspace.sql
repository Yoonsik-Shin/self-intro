INSERT INTO `workspace` (`name`, `slug`, `workspace_type`, `status`, `created_at`, `updated_at`)
SELECT 'Personal Workspace', 'owner-personal', 'PERSONAL', 'ACTIVE', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `workspace`);

SET @owner_workspace_id = (
  SELECT `id` FROM `workspace` ORDER BY `id` ASC LIMIT 1
);

ALTER TABLE `profile`
  ADD COLUMN `workspace_id` bigint NULL AFTER `id`;
UPDATE `profile` SET `workspace_id` = @owner_workspace_id WHERE `workspace_id` IS NULL;
ALTER TABLE `profile`
  MODIFY COLUMN `workspace_id` bigint NOT NULL,
  ADD UNIQUE KEY `uk_profile_workspace` (`workspace_id`),
  ADD CONSTRAINT `fk_profile_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE;

ALTER TABLE `experience`
  ADD COLUMN `workspace_id` bigint NULL AFTER `id`;
UPDATE `experience` SET `workspace_id` = @owner_workspace_id WHERE `workspace_id` IS NULL;
ALTER TABLE `experience`
  MODIFY COLUMN `workspace_id` bigint NOT NULL,
  ADD KEY `idx_experience_workspace_display` (`workspace_id`, `display_order`),
  ADD CONSTRAINT `fk_experience_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE;
