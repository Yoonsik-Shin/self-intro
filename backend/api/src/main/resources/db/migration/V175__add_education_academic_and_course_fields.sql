-- Migration: V175__add_education_academic_and_course_fields.sql
-- Description: Add education_type, degree, major, gpa, and graduation_status fields to education table for academic vs course separation.

ALTER TABLE `education`
    ADD COLUMN `education_type` VARCHAR(30) NOT NULL DEFAULT 'ACADEMIC' COMMENT '학력/학습 구분: ACADEMIC (정규 학력), COURSE (교육과정/학습)',
    ADD COLUMN `degree` VARCHAR(50) NULL COMMENT '학력 구분 / 학위 (고등학교, 전문학사, 학사, 석사, 박사 등)',
    ADD COLUMN `major` VARCHAR(100) NULL COMMENT '전공 또는 계열 (예: 컴퓨터공학, 이과계열)',
    ADD COLUMN `gpa` VARCHAR(30) NULL COMMENT '학점 (예: 3.8 / 4.5)',
    ADD COLUMN `graduation_status` VARCHAR(30) NULL COMMENT '졸업 상태 (GRADUATED, ATTENDING, COMPLETED, DROPPED_OUT, ON_LEAVE)';

-- 기존 학력/교육 데이터 업데이트
-- 차의과학대학교 (id=6): 정규 학력 (학사 졸업)
UPDATE `education`
SET `education_type` = 'ACADEMIC',
    `degree` = '학사',
    `major` = '스포츠의학과',
    `graduation_status` = 'GRADUATED'
WHERE `experience_id` = 6;

-- 부트캠프 및 교육과정 (id=7, 8, 9): 교육/학습 과정
UPDATE `education`
SET `education_type` = 'COURSE',
    `graduation_status` = 'COMPLETED'
WHERE `experience_id` IN (7, 8, 9);
