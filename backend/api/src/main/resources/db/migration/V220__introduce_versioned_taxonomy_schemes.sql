-- 공통 taxonomy를 하나의 개발자 분류 트리에서 버전이 있는 다중 도메인 template로 확장한다.
-- 기록의 분류와 공개 페이지의 노출 선택은 계속 별도 관계로 유지한다.

CREATE TABLE `taxonomy_scheme` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `scope_type` varchar(20) NOT NULL,
    `scope_key` varchar(80) NOT NULL,
    `workspace_id` bigint NULL,
    `family_key` varchar(80) NOT NULL,
    `version` int NOT NULL,
    `name` varchar(100) NOT NULL,
    `description` varchar(500) NULL,
    `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_taxonomy_scheme_scope_family_version`
        (`scope_key`, `family_key`, `version`),
    KEY `idx_taxonomy_scheme_workspace_status` (`workspace_id`, `status`),
    KEY `idx_taxonomy_scheme_catalog` (`scope_type`, `status`, `family_key`, `version`),
    CONSTRAINT `fk_taxonomy_scheme_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `ck_taxonomy_scheme_scope`
        CHECK (
            (`scope_type` = 'PLATFORM' AND `workspace_id` IS NULL AND `scope_key` = 'PLATFORM')
            OR
            (`scope_type` = 'WORKSPACE' AND `workspace_id` IS NOT NULL)
        ),
    CONSTRAINT `ck_taxonomy_scheme_version` CHECK (`version` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `taxonomy_scheme`
    (`scope_type`, `scope_key`, `workspace_id`, `family_key`, `version`, `name`, `description`, `status`)
VALUES
    ('PLATFORM', 'PLATFORM', NULL, 'software-engineering', 1,
     '소프트웨어 엔지니어링',
     '기존 개발·백엔드·인프라·AI 학습 기록을 분류하는 플랫폼 기본 template',
     'ACTIVE');

SET @software_engineering_scheme_id = (
    SELECT `id`
    FROM `taxonomy_scheme`
    WHERE `scope_key` = 'PLATFORM'
      AND `family_key` = 'software-engineering'
      AND `version` = 1
);

ALTER TABLE `taxonomy_node`
    ADD COLUMN `scheme_id` bigint NULL AFTER `id`,
    ADD COLUMN `stable_key` varchar(80) NULL AFTER `slug`,
    ADD COLUMN `description` varchar(500) NULL AFTER `stable_key`,
    ADD COLUMN `status` varchar(20) NOT NULL DEFAULT 'ACTIVE' AFTER `description`;

UPDATE `taxonomy_node`
SET `scheme_id` = @software_engineering_scheme_id,
    `stable_key` = `slug`
WHERE `scheme_id` IS NULL;

ALTER TABLE `taxonomy_node`
    DROP INDEX `uk_taxonomy_node_name`,
    DROP INDEX `uk_taxonomy_node_slug`,
    MODIFY COLUMN `scheme_id` bigint NOT NULL,
    MODIFY COLUMN `stable_key` varchar(80) NOT NULL,
    ADD UNIQUE KEY `uk_taxonomy_node_scheme_slug` (`scheme_id`, `slug`),
    ADD UNIQUE KEY `uk_taxonomy_node_scheme_stable_key` (`scheme_id`, `stable_key`),
    ADD KEY `idx_taxonomy_node_scheme_order` (`scheme_id`, `display_order`, `id`),
    ADD CONSTRAINT `fk_taxonomy_node_scheme`
        FOREIGN KEY (`scheme_id`) REFERENCES `taxonomy_scheme` (`id`) ON DELETE RESTRICT;

CREATE TABLE `workspace_taxonomy_scheme_subscription` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `workspace_id` bigint NOT NULL,
    `scheme_id` bigint NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `primary_scheme` tinyint(1) NOT NULL DEFAULT 0,
    `display_order` int NOT NULL DEFAULT 0,
    `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_workspace_taxonomy_scheme_subscription` (`workspace_id`, `scheme_id`),
    KEY `idx_workspace_taxonomy_subscription_order`
        (`workspace_id`, `enabled`, `display_order`, `id`),
    KEY `idx_workspace_taxonomy_subscription_scheme` (`scheme_id`),
    CONSTRAINT `fk_workspace_taxonomy_subscription_workspace`
        FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_workspace_taxonomy_subscription_scheme`
        FOREIGN KEY (`scheme_id`) REFERENCES `taxonomy_scheme` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기존 Workspace는 현재 보던 분류 체계를 그대로 유지한다. 신규 Workspace의 기본 구독은
-- onboarding application service가 명시적으로 생성하며 DB trigger에 숨기지 않는다.
INSERT INTO `workspace_taxonomy_scheme_subscription`
    (`workspace_id`, `scheme_id`, `enabled`, `primary_scheme`, `display_order`)
SELECT w.`id`, @software_engineering_scheme_id, 1, 1, 0
FROM `workspace` w;
