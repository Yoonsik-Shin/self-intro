-- study_plan_candidate가 그냥 조인 테이블이면 "체크박스로 껐다 켰다"를 표현할 수 없다.
-- 목록엔 남기되 이번 생성엔 빼는 것(selected=false)과, 아예 목록에서 지우는 것(행 삭제)이
-- 서로 다른 개념이라 selected 컬럼이 필요하다. familiar는 수집 시점에 내 스킬과 겹치는지
-- 계산해 저장해두는 "이미 아는 개념" 표시로, 이후 재계산하지 않는다.
-- 이 기능은 아직 실사용 데이터가 없으므로 기존 테이블을 드롭하고 다시 만든다.
DROP TABLE `study_plan_candidate`;

CREATE TABLE `study_plan_candidate` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `study_plan_id` bigint NOT NULL,
  `learning_resource_id` bigint NOT NULL,
  `selected` tinyint(1) NOT NULL DEFAULT 1,
  `familiar` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_study_plan_candidate` (`study_plan_id`, `learning_resource_id`),
  CONSTRAINT `fk_study_plan_candidate_plan`
    FOREIGN KEY (`study_plan_id`) REFERENCES `study_plan` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_plan_candidate_resource`
    FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
