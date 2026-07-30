-- study_plan_stage.stage_order는 원래 "순번"이었는데, Stage(테마)끼리 병렬 트랙을 표현하려면
-- 같은 stage_order를 가진 Stage가 여러 개 있을 수 있어야 한다(같은 레벨 = 병렬 진행 가능).
-- 기존 유니크 제약이 그걸 구조적으로 막고 있었으므로 일반 인덱스로 교체한다.
ALTER TABLE `study_plan_stage`
  DROP INDEX `uk_study_plan_stage_order`,
  ADD INDEX `idx_study_plan_stage_order` (`study_plan_id`, `stage_order`);

-- 채팅으로 좁힌 학습자료 후보(계획을 생성하기 전 "수집" 단계에서 확정된 목록)를 저장한다.
CREATE TABLE `study_plan_candidate` (
  `study_plan_id` bigint NOT NULL,
  `learning_resource_id` bigint NOT NULL,
  PRIMARY KEY (`study_plan_id`, `learning_resource_id`),
  CONSTRAINT `fk_study_plan_candidate_plan`
    FOREIGN KEY (`study_plan_id`) REFERENCES `study_plan` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_plan_candidate_resource`
    FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
