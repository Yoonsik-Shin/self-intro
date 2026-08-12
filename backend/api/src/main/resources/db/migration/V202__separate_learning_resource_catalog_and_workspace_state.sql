-- LearningResource의 공통 카탈로그와 Workspace별 학습 상태를 분리한다.
-- 기존 컬럼은 아직 플랫폼 전용 StudyPlan 호환 경로가 읽으므로 shadow 컬럼으로 유지하고,
-- 신규 canonical API의 source of truth는 workspace_learning_resource이다.
SET @bootstrap_workspace_id = (SELECT `id` FROM `workspace` ORDER BY `id` LIMIT 1);

CREATE TABLE `workspace_learning_resource` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `learning_resource_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'WISHLIST',
  `priority_tier` varchar(10) DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `personal_summary` varchar(500) DEFAULT NULL,
  `personal_note_markdown` longtext,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_learning_resource_catalog`
    (`workspace_id`, `learning_resource_id`),
  KEY `idx_workspace_learning_resource_workspace_order`
    (`workspace_id`, `display_order`, `id`),
  KEY `idx_workspace_learning_resource_workspace_status`
    (`workspace_id`, `status`, `priority_tier`),
  CONSTRAINT `fk_workspace_learning_resource_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workspace_learning_resource_catalog`
    FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `workspace_learning_resource` (
  `workspace_id`, `learning_resource_id`, `status`, `priority_tier`, `display_order`,
  `personal_summary`, `personal_note_markdown`, `created_at`, `updated_at`
)
SELECT
  @bootstrap_workspace_id, `id`, `status`, `priority_tier`, `display_order`,
  `summary`, `detail_markdown`, `created_at`, `updated_at`
FROM `learning_resource`
WHERE @bootstrap_workspace_id IS NOT NULL;

CREATE TABLE `workspace_learning_resource_tag` (
  `workspace_learning_resource_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`workspace_learning_resource_id`, `tag_id`),
  KEY `idx_workspace_learning_resource_tag_tag` (`tag_id`),
  CONSTRAINT `fk_workspace_learning_resource_tag_overlay`
    FOREIGN KEY (`workspace_learning_resource_id`) REFERENCES `workspace_learning_resource` (`id`)
      ON DELETE CASCADE,
  CONSTRAINT `fk_workspace_learning_resource_tag_tag`
    FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `workspace_learning_resource_tag` (`workspace_learning_resource_id`, `tag_id`)
SELECT wlr.`id`, lrt.`tag_id`
FROM `learning_resource_tag` lrt
JOIN `workspace_learning_resource` wlr
  ON wlr.`workspace_id` = @bootstrap_workspace_id
 AND wlr.`learning_resource_id` = lrt.`learning_resource_id`
JOIN `tag` t
  ON t.`id` = lrt.`tag_id`
 AND t.`workspace_id` = wlr.`workspace_id`;
