-- 자기소개서 문항/답변은 공고 catalog가 아니라 Workspace의 지원 건이 소유한다.
-- job_posting_id는 기존 플랫폼 운영 API 호환을 위해 shadow column으로 유지한다.
ALTER TABLE `job_posting_cover_letter_item`
  ADD COLUMN `workspace_job_application_id` bigint NULL AFTER `id`;

SET @bootstrap_workspace_id = (SELECT `id` FROM `workspace` ORDER BY `id` LIMIT 1);

UPDATE `job_posting_cover_letter_item` item
JOIN `workspace_job_application` application
  ON application.`workspace_id` = @bootstrap_workspace_id
 AND application.`job_posting_id` = item.`job_posting_id`
SET item.`workspace_job_application_id` = application.`id`;

-- 기존 unique index가 job_posting FK의 supporting index이기도 하므로 먼저 대체 index를 만든다.
ALTER TABLE `job_posting_cover_letter_item`
  ADD KEY `idx_cover_letter_item_posting_shadow` (`job_posting_id`);

ALTER TABLE `job_posting_cover_letter_item`
  MODIFY COLUMN `workspace_job_application_id` bigint NOT NULL,
  DROP INDEX `uk_cover_letter_item_posting_order`,
  ADD UNIQUE KEY `uk_cover_letter_item_application_order`
    (`workspace_job_application_id`, `display_order`),
  ADD KEY `idx_cover_letter_item_application` (`workspace_job_application_id`),
  ADD CONSTRAINT `fk_cover_letter_item_workspace_application`
    FOREIGN KEY (`workspace_job_application_id`)
      REFERENCES `workspace_job_application` (`id`) ON DELETE CASCADE;

-- Revision은 item을 통해 Workspace 소유권을 상속하며 item 삭제 시 함께 정리한다.
DELETE revision
FROM `job_posting_cover_letter_revision` revision
LEFT JOIN `job_posting_cover_letter_item` item
  ON item.`id` = revision.`cover_letter_item_id`
WHERE item.`id` IS NULL;

ALTER TABLE `job_posting_cover_letter_revision`
  ADD CONSTRAINT `fk_cover_letter_revision_item`
    FOREIGN KEY (`cover_letter_item_id`)
      REFERENCES `job_posting_cover_letter_item` (`id`) ON DELETE CASCADE;
