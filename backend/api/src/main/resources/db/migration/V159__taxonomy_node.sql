CREATE TABLE `taxonomy_node` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `parent_id` bigint NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_taxonomy_node_name` (`name`),
  UNIQUE KEY `uk_taxonomy_node_slug` (`slug`),
  KEY `idx_taxonomy_node_parent` (`parent_id`),
  CONSTRAINT `fk_taxonomy_node_parent` FOREIGN KEY (`parent_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_taxonomy_node` (
  `study_id` bigint NOT NULL,
  `taxonomy_node_id` bigint NOT NULL,
  PRIMARY KEY (`study_id`, `taxonomy_node_id`),
  KEY `idx_study_taxonomy_node_node` (`taxonomy_node_id`),
  CONSTRAINT `fk_study_taxonomy_node_study` FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_taxonomy_node_node` FOREIGN KEY (`taxonomy_node_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `learning_resource_taxonomy_node` (
  `learning_resource_id` bigint NOT NULL,
  `taxonomy_node_id` bigint NOT NULL,
  PRIMARY KEY (`learning_resource_id`, `taxonomy_node_id`),
  KEY `idx_lr_taxonomy_node_node` (`taxonomy_node_id`),
  CONSTRAINT `fk_lr_taxonomy_node_resource` FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lr_taxonomy_node_node` FOREIGN KEY (`taxonomy_node_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_taxonomy_curation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `taxonomy_node_id` bigint NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_study_taxonomy_curation_node` (`taxonomy_node_id`),
  CONSTRAINT `fk_study_taxonomy_curation_node` FOREIGN KEY (`taxonomy_node_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기존 study_category 7행을 taxonomy_node 최상위 노드로 이관
INSERT INTO `taxonomy_node` (`name`, `slug`, `display_order`, `parent_id`)
SELECT `name`, `slug`, `display_order`, NULL FROM `study_category`;

-- 기존 learning_resource_category 행을 이관. "인프라/DevOps"처럼 study_category와 이름이
-- 겹치는 항목은 새로 만들지 않고 이미 이관된 taxonomy_node를 공유한다.
INSERT INTO `taxonomy_node` (`name`, `slug`, `display_order`, `parent_id`)
SELECT lrc.`name`, lrc.`slug`, lrc.`display_order`, NULL
FROM `learning_resource_category` lrc
WHERE NOT EXISTS (SELECT 1 FROM `taxonomy_node` tn WHERE tn.`name` = lrc.`name`);

-- study의 기존 단일 category를 다중 attach의 초기값으로 이관
INSERT INTO `study_taxonomy_node` (`study_id`, `taxonomy_node_id`)
SELECT s.`id`, tn.`id`
FROM `study` s
JOIN `study_category` sc ON sc.`id` = s.`category_id`
JOIN `taxonomy_node` tn ON tn.`name` = sc.`name`;

-- learning_resource의 기존 단일 category를 다중 attach의 초기값으로 이관
INSERT INTO `learning_resource_taxonomy_node` (`learning_resource_id`, `taxonomy_node_id`)
SELECT lr.`id`, tn.`id`
FROM `learning_resource` lr
JOIN `learning_resource_category` lrc ON lrc.`id` = lr.`category_id`
JOIN `taxonomy_node` tn ON tn.`name` = lrc.`name`;

-- 공개 /study 페이지 노출 큐레이션: 기존 7개 study 카테고리를 그대로 초기값으로 노출
INSERT INTO `study_taxonomy_curation` (`taxonomy_node_id`, `display_order`)
SELECT tn.`id`, sc.`display_order`
FROM `study_category` sc
JOIN `taxonomy_node` tn ON tn.`name` = sc.`name`;

-- 구 스키마 제거
ALTER TABLE `study` DROP FOREIGN KEY `fk_study_category`, DROP COLUMN `category_id`;
ALTER TABLE `learning_resource` DROP FOREIGN KEY `fk_learning_resource_category`, DROP COLUMN `category_id`;
DROP TABLE `study_category`;
DROP TABLE `learning_resource_category`;
