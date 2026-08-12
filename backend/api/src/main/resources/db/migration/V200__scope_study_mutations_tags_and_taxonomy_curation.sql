-- Study의 사용자 생성 메타데이터와 공개 taxonomy 선택을 Workspace 경계로 이동한다.
SET @bootstrap_workspace_id = (SELECT `id` FROM `workspace` ORDER BY `id` LIMIT 1);

-- 같은 slug를 서로 다른 Workspace에서 사용할 수 있도록 전역 unique를 복합 unique로 바꾼다.
ALTER TABLE `study`
  DROP INDEX `slug`,
  ADD UNIQUE KEY `uk_study_workspace_slug` (`workspace_id`, `slug`);

-- Tag는 사용자가 자유롭게 만드는 값이므로 Platform Shared가 아니라 Workspace가 소유한다.
ALTER TABLE `tag`
  ADD COLUMN `workspace_id` bigint NULL AFTER `id`;

UPDATE `tag`
SET `workspace_id` = @bootstrap_workspace_id
WHERE `workspace_id` IS NULL;

ALTER TABLE `tag`
  DROP INDEX `name`,
  DROP INDEX `slug`,
  MODIFY COLUMN `workspace_id` bigint NOT NULL,
  ADD UNIQUE KEY `uk_tag_workspace_name` (`workspace_id`, `name`),
  ADD UNIQUE KEY `uk_tag_workspace_slug` (`workspace_id`, `slug`),
  ADD KEY `idx_tag_workspace_name` (`workspace_id`, `name`),
  ADD CONSTRAINT `fk_tag_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE;

-- taxonomy_node는 플랫폼 공용 catalog로 유지하고, Workspace별 공개 선택과 순서만 분리한다.
ALTER TABLE `study_taxonomy_curation`
  ADD COLUMN `workspace_id` bigint NULL AFTER `id`;

UPDATE `study_taxonomy_curation`
SET `workspace_id` = @bootstrap_workspace_id
WHERE `workspace_id` IS NULL;

-- 기존 unique index가 taxonomy FK의 보조 index 역할도 하고 있으므로 먼저 전용 index를 만든다.
ALTER TABLE `study_taxonomy_curation`
  ADD KEY `idx_study_taxonomy_curation_node_fk` (`taxonomy_node_id`);

ALTER TABLE `study_taxonomy_curation`
  DROP INDEX `uk_study_taxonomy_curation_node`,
  MODIFY COLUMN `workspace_id` bigint NOT NULL,
  ADD UNIQUE KEY `uk_study_taxonomy_curation_workspace_node`
    (`workspace_id`, `taxonomy_node_id`),
  ADD KEY `idx_study_taxonomy_curation_workspace_order`
    (`workspace_id`, `display_order`),
  ADD CONSTRAINT `fk_study_taxonomy_curation_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE;
