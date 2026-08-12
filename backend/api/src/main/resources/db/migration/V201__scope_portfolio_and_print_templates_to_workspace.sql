-- PortfolioCaseStudy와 PrintTemplate은 사용자가 작성하는 Workspace 자산이다.
-- 기존 PortfolioCaseStudy는 연결된 Experience의 Workspace를 따르고,
-- 기존 Resume PrintTemplate은 단일 사용자 시절의 기본 Workspace로 이관한다.
SET @bootstrap_workspace_id = (SELECT `id` FROM `workspace` ORDER BY `id` LIMIT 1);

ALTER TABLE `portfolio_case_study`
  ADD COLUMN `workspace_id` bigint NULL AFTER `id`;

UPDATE `portfolio_case_study` pcs
JOIN `experience` e ON e.`id` = pcs.`experience_id`
SET pcs.`workspace_id` = e.`workspace_id`
WHERE pcs.`workspace_id` IS NULL;

UPDATE `portfolio_case_study`
SET `workspace_id` = @bootstrap_workspace_id
WHERE `workspace_id` IS NULL;

ALTER TABLE `portfolio_case_study`
  DROP INDEX `uk_portfolio_case_study_slug`,
  MODIFY COLUMN `workspace_id` bigint NOT NULL,
  ADD UNIQUE KEY `uk_portfolio_case_study_workspace_slug` (`workspace_id`, `slug`),
  ADD KEY `idx_portfolio_case_study_workspace_updated` (`workspace_id`, `updated_at`),
  ADD CONSTRAINT `fk_portfolio_case_study_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE;

ALTER TABLE `print_template`
  ADD COLUMN `workspace_id` bigint NULL AFTER `id`;

UPDATE `print_template` pt
JOIN `portfolio_case_study` pcs ON pcs.`id` = pt.`portfolio_case_study_id`
SET pt.`workspace_id` = pcs.`workspace_id`
WHERE pt.`workspace_id` IS NULL;

UPDATE `print_template`
SET `workspace_id` = @bootstrap_workspace_id
WHERE `workspace_id` IS NULL;

ALTER TABLE `print_template`
  MODIFY COLUMN `workspace_id` bigint NOT NULL,
  ADD KEY `idx_print_template_workspace_document_order`
    (`workspace_id`, `document_type`, `display_order`),
  ADD KEY `idx_print_template_workspace_job_posting`
    (`workspace_id`, `job_posting_id`, `display_order`),
  ADD CONSTRAINT `fk_print_template_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE;
