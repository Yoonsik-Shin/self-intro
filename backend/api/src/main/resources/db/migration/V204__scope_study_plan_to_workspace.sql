-- AI 학습 계획은 계정이나 플랫폼 전역 데이터가 아니라 Workspace가 소유한다.
-- 기존 계획은 최초 Workspace로 이관하고, 이후 모든 canonical API는 workspace_id로 조회한다.
SET @bootstrap_workspace_id = (SELECT `id` FROM `workspace` ORDER BY `id` LIMIT 1);

ALTER TABLE `study_plan`
  ADD COLUMN `workspace_id` bigint NULL AFTER `id`;

UPDATE `study_plan`
SET `workspace_id` = @bootstrap_workspace_id
WHERE `workspace_id` IS NULL;

ALTER TABLE `study_plan`
  MODIFY COLUMN `workspace_id` bigint NOT NULL,
  ADD KEY `idx_study_plan_workspace_created` (`workspace_id`, `created_at`, `id`),
  ADD CONSTRAINT `fk_study_plan_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE;

-- 후보 우선순위도 공통 catalog의 legacy shadow 컬럼이 아니라 계획 생성 시점의
-- Workspace overlay 값을 snapshot으로 보존한다.
ALTER TABLE `study_plan_candidate`
  ADD COLUMN `priority_tier` varchar(10) NULL AFTER `familiar`;

UPDATE `study_plan_candidate` candidate
JOIN `study_plan` plan ON plan.`id` = candidate.`study_plan_id`
LEFT JOIN `workspace_learning_resource` overlay
  ON overlay.`workspace_id` = plan.`workspace_id`
 AND overlay.`learning_resource_id` = candidate.`learning_resource_id`
SET candidate.`priority_tier` = overlay.`priority_tier`;
