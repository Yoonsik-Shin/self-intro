-- Workspace 공개본 schema v3는 프로필·경험의 독립 revision을 고정한다.
-- Study와 taxonomy는 전체 공개본 resource snapshot에 포함하며 별도 revision을 만들지 않는다.

ALTER TABLE `workspace_publication_revision`
    ADD COLUMN `profile_revision_id` bigint NULL AFTER `source_revision_number`,
    ADD COLUMN `experience_revision_id` bigint NULL AFTER `profile_revision_id`,
    ADD COLUMN `draft_config_version` int NULL AFTER `experience_revision_id`,
    ADD KEY `idx_workspace_publication_profile_revision` (`profile_revision_id`),
    ADD KEY `idx_workspace_publication_experience_revision` (`experience_revision_id`),
    ADD CONSTRAINT `fk_workspace_publication_profile_revision`
        FOREIGN KEY (`profile_revision_id`) REFERENCES `workspace_public_profile_revision` (`id`)
        ON DELETE RESTRICT,
    ADD CONSTRAINT `fk_workspace_publication_experience_revision`
        FOREIGN KEY (`experience_revision_id`) REFERENCES `workspace_public_experience_revision` (`id`)
        ON DELETE RESTRICT;

ALTER TABLE `workspace_public_profile_revision`
    ADD COLUMN `source_config_version` int NOT NULL DEFAULT 1 AFTER `revision_number`;

ALTER TABLE `workspace_public_experience_revision`
    ADD COLUMN `source_config_version` int NOT NULL DEFAULT 1 AFTER `revision_number`;
