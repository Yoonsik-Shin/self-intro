-- 기존 '이력서' 및 새로 시딩된 템플릿들의 display_order를 중복 없도록 1, 2, 3, 4 순차 재정렬

UPDATE print_template SET display_order = 1 WHERE name = '이력서';
UPDATE print_template SET display_order = 2 WHERE name = '[기본] 1장 요약 이력서';
UPDATE print_template SET display_order = 3 WHERE name = '[상세] 백엔드 개발자 경력기술서';
UPDATE print_template SET display_order = 4 WHERE name = '[시각화] 아키텍처 포트폴리오';
