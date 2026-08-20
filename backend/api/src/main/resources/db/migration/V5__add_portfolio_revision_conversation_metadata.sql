-- 포트폴리오 개별 항목의 대화형 AI 개선 이력을 content revision과 함께 재현한다.
-- 사용자 피드백은 결과 AI revision에 연결하며, 기존 revision은 모두 독립 초안으로 유지한다.
ALTER TABLE `portfolio_case_study_revision`
  ADD COLUMN `base_revision_id` bigint DEFAULT NULL AFTER `rendered_markdown`,
  ADD COLUMN `feedback_instruction` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `base_revision_id`,
  ADD COLUMN `ai_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `feedback_instruction`,
  ADD KEY `idx_portfolio_case_study_revision_base` (`base_revision_id`),
  ADD CONSTRAINT `fk_portfolio_case_study_revision_base`
    FOREIGN KEY (`base_revision_id`) REFERENCES `portfolio_case_study_revision` (`id`) ON DELETE SET NULL;
