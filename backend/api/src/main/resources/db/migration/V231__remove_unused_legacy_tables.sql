-- `study_entry`와 `study_entry_skill`은 Markdown 기반 `study` 모델로 대체된 레거시다.
-- `portfolio_case_study_study`는 생성 이후 실제 쓰기 경로 없이
-- `portfolio_case_study.content_json.sourceStudyIds`로 대체되었다.
--
-- 운영 적용 전에는 반드시 전체 DB 백업을 남긴다. 이 migration도 행이 하나라도
-- 남아 있으면 SIGNAL로 중단해 예기치 않은 데이터 삭제를 방지한다.

DROP PROCEDURE IF EXISTS `assert_v231_legacy_tables_empty`;

DELIMITER //
CREATE PROCEDURE `assert_v231_legacy_tables_empty`()
BEGIN
    IF EXISTS (SELECT 1 FROM `study_entry` LIMIT 1)
        OR EXISTS (SELECT 1 FROM `study_entry_skill` LIMIT 1)
        OR EXISTS (SELECT 1 FROM `portfolio_case_study_study` LIMIT 1) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'V231 aborted: legacy tables contain data';
    END IF;
END//
DELIMITER ;

CALL `assert_v231_legacy_tables_empty`();
DROP PROCEDURE `assert_v231_legacy_tables_empty`;

DROP TABLE IF EXISTS `study_entry_skill`;
DROP TABLE IF EXISTS `study_entry`;
DROP TABLE IF EXISTS `portfolio_case_study_study`;
