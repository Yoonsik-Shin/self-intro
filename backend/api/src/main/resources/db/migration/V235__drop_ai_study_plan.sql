-- AI 학습 계획 기능은 재기획 보류가 아니라 제품 범위에서 완전히 제거한다.
-- 과거 migration은 신규 환경 재현을 위해 유지하고, 이 migration에서 최종 상태를 정리한다.
DROP TABLE IF EXISTS `study_plan_check_question`;
DROP TABLE IF EXISTS `study_plan_message`;
DROP TABLE IF EXISTS `study_plan_candidate`;
DROP TABLE IF EXISTS `study_plan_item`;
DROP TABLE IF EXISTS `study_plan_stage`;
DROP TABLE IF EXISTS `study_plan`;
