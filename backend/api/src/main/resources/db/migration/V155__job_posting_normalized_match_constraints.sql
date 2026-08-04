-- V154에서 nullable로 추가했던 정규화 매칭 키를 제약으로 강화한다. 반드시 아래 순서를 지켜서 배포한다:
--   1) V154 배포 (컬럼만 추가, 기존 행은 NULL)
--   2) 애플리케이션 배포 (JobPostingBackfillService가 기존 행을 채우고 중복을 병합할 수 있는 코드 포함)
--   3) POST /api/admin/job-postings/backfill-source-urls 한 번 호출 — 모든 행의 정규화 키가 채워지고
--      중복 공고가 병합됐는지 응답 요약으로 확인
--   4) 이 마이그레이션(V155) 배포
--
-- 백필 전에 이 마이그레이션부터 배포하면 기존 행이 NULL이라 NOT NULL 제약 자체가 실패한다.

ALTER TABLE `job_posting`
  MODIFY COLUMN `company_name_normalized` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY COLUMN `position_title_normalized` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE `job_posting`
  ADD CONSTRAINT `uk_job_posting_normalized_match`
    UNIQUE (`company_name_normalized`, `position_title_normalized`);
