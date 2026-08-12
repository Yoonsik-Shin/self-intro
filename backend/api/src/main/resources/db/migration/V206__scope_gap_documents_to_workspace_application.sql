-- 보완 프로젝트 문서는 공고 catalog가 아니라 Workspace의 지원 건이 소유한다.
-- job_posting_id는 기존 플랫폼 운영 경로 호환을 위한 shadow column으로 유지한다.
ALTER TABLE `gap_project_document`
  ADD COLUMN `workspace_job_application_id` bigint NULL AFTER `id`;

SET @bootstrap_workspace_id = (SELECT `id` FROM `workspace` ORDER BY `id` LIMIT 1);

UPDATE `gap_project_document` document
JOIN `workspace_job_application` application
  ON application.`workspace_id` = @bootstrap_workspace_id
 AND application.`job_posting_id` = document.`job_posting_id`
SET document.`workspace_job_application_id` = application.`id`;

-- 기존 unique index가 job_posting FK도 지원하므로 대체 index를 먼저 만든다.
ALTER TABLE `gap_project_document`
  ADD KEY `idx_gap_project_document_posting_shadow` (`job_posting_id`);

ALTER TABLE `gap_project_document`
  MODIFY COLUMN `workspace_job_application_id` bigint NOT NULL,
  DROP INDEX `uk_gap_project_document_version`,
  ADD UNIQUE KEY `uk_gap_project_document_application_version`
    (`workspace_job_application_id`, `version`),
  ADD KEY `idx_gap_project_document_application`
    (`workspace_job_application_id`, `version` DESC),
  ADD CONSTRAINT `fk_gap_project_document_workspace_application`
    FOREIGN KEY (`workspace_job_application_id`)
      REFERENCES `workspace_job_application` (`id`) ON DELETE CASCADE;
