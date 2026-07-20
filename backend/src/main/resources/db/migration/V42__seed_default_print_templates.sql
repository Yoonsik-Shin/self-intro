INSERT INTO print_template (name, excluded_ids, section_order, section_gaps, visible, display_order, created_at, updated_at)
VALUES 
(
  '[기본] 1장 요약 이력서',
  '["competencies", "projects", "architecture-components", "architecture-diagram"]',
  '["intro-profile", "skills", "career", "credentials"]',
  '{"skills": 16, "career": 24, "credentials": 20}',
  TRUE,
  1,
  NOW(),
  NOW()
),
(
  '[상세] 백엔드 개발자 경력기술서',
  '[]',
  '["intro-profile", "competencies", "skills", "career", "projects", "credentials"]',
  '{"competencies": 20, "skills": 20, "career": 24, "projects": 24, "credentials": 20}',
  TRUE,
  2,
  NOW(),
  NOW()
),
(
  '[시각화] 아키텍처 포트폴리오',
  '["competencies"]',
  '["intro-profile", "skills", "career", "projects", "architecture-diagram", "credentials"]',
  '{"skills": 16, "career": 24, "projects": 24, "architecture-diagram": 28}',
  TRUE,
  3,
  NOW(),
  NOW()
);
