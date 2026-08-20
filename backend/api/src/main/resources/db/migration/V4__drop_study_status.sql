-- `study.status`(DRAFT/PUBLISHED)는 공개 노출과 무관한 죽은 워크플로우 라벨이었다.
-- 실제 노출 여부는 workspace_public_study_selection(발행 이력) 및 발행 스냅샷으로만 결정된다.
DROP INDEX `idx_study_status_learned_at` ON `study`;
DROP INDEX `idx_study_section_status_learned_at` ON `study`;
DROP INDEX `idx_study_workspace_status_learned` ON `study`;

ALTER TABLE `study` DROP COLUMN `status`;

ALTER TABLE `study` ADD KEY `idx_study_section_learned_at` (`section`, `learned_at`);
ALTER TABLE `study` ADD KEY `idx_study_workspace_learned` (`workspace_id`, `learned_at`);
