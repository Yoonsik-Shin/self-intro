-- 공통 기술 정의(skill)와 Workspace별 기술 표현을 분리한다.
-- 기존 단일 Workspace의 기술 레벨/설명/노출 설정은 workspace_skill로 보존한다.
CREATE TABLE `workspace_skill` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `skill_level` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_version` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_comment` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usage_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LEARNING',
  `is_core` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_skill_workspace_catalog` (`workspace_id`, `skill_id`),
  KEY `idx_workspace_skill_workspace_order` (`workspace_id`, `display_order`),
  CONSTRAINT `fk_workspace_skill_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workspace_skill_catalog`
    FOREIGN KEY (`skill_id`) REFERENCES `skill` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @bootstrap_workspace_id = (SELECT `id` FROM `workspace` ORDER BY `id` LIMIT 1);

INSERT INTO `workspace_skill` (
  `workspace_id`, `skill_id`, `skill_level`, `skill_version`, `skill_comment`,
  `usage_type`, `is_core`, `display_order`, `created_at`, `updated_at`
)
SELECT
  @bootstrap_workspace_id, `id`, `skill_level`, `skill_version`, `skill_comment`,
  `usage_type`, `is_core`, `display_order`, NOW(6), NOW(6)
FROM `skill`
WHERE @bootstrap_workspace_id IS NOT NULL;

-- 핵심 역량은 개인의 경력·Study를 근거로 구성하므로 Workspace가 소유한다.
ALTER TABLE `competency`
  ADD COLUMN `workspace_id` bigint NULL AFTER `id`;

UPDATE `competency`
SET `workspace_id` = @bootstrap_workspace_id
WHERE `workspace_id` IS NULL;

ALTER TABLE `competency`
  MODIFY COLUMN `workspace_id` bigint NOT NULL,
  ADD KEY `idx_competency_workspace_display` (`workspace_id`, `display_order`),
  ADD CONSTRAINT `fk_competency_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE;
