ALTER TABLE `workspace_publication_revision`
  ADD COLUMN `pinned` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

ALTER TABLE `workspace_publication_revision`
  ADD KEY `idx_workspace_publication_pinned` (`workspace_id`, `pinned`);
