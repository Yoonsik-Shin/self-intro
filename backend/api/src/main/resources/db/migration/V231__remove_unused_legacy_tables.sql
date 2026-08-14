-- `study_entry`와 `study_entry_skill`은 Markdown 기반 `study` 모델로 대체된 레거시다.
-- `portfolio_case_study_study`는 생성 이후 실제 쓰기 경로 없이
-- `portfolio_case_study.content_json.sourceStudyIds`로 대체되었다.
--
-- 운영 적용 전에는 반드시 전체 DB 백업을 남긴다. 이 migration도 행이 하나라도
-- 남아 있으면 CHECK 제약으로 중단해 예기치 않은 데이터 삭제를 방지한다.
-- 임시 검사 테이블을 사용해 애플리케이션 DB 계정에 CREATE ROUTINE 권한을 요구하지 않는다.

DROP TABLE IF EXISTS `_v231_legacy_table_guard`;
CREATE TABLE `_v231_legacy_table_guard` (
    `row_count` BIGINT NOT NULL,
    CONSTRAINT `chk_v231_legacy_tables_empty` CHECK (`row_count` = 0)
);

INSERT INTO `_v231_legacy_table_guard` (`row_count`)
SELECT
    (SELECT COUNT(*) FROM `study_entry`)
    + (SELECT COUNT(*) FROM `study_entry_skill`)
    + (SELECT COUNT(*) FROM `portfolio_case_study_study`);

DROP TABLE `_v231_legacy_table_guard`;

DROP TABLE IF EXISTS `study_entry_skill`;
DROP TABLE IF EXISTS `study_entry`;
DROP TABLE IF EXISTS `portfolio_case_study_study`;
