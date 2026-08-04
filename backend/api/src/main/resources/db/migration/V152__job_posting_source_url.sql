-- 같은 채용 공고가 원티드/잡코리아/사람인 등 여러 플랫폼에 올라온 경우, 지금까지는 URL이 다르다는
-- 이유만으로 별개 job_posting 행으로 중복 수집됐다. 회사명+직무명을 정규화해 완전일치하면 같은
-- 공고로 보고 URL만 추가 등록하도록 바꾸기 위한 스키마 작업이다.
--
-- job_posting.posting_url 컬럼은 대표(최초 수집) URL 미러링 용도로 그대로 유지하고, 실제 등록된
-- 모든 URL은 새 job_posting_source_url 테이블에 플랫폼과 함께 저장한다.
--
-- 정규화 컬럼은 기존 행이 전부 NULL인 상태로 시작하므로 이번 마이그레이션에서는 NULLABLE로 두고,
-- 백필(JobPostingBackfillService) 실행 후 별도 마이그레이션(V153)에서 NOT NULL + UNIQUE로 강화한다.

CREATE TABLE `job_posting_source_url` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_posting_id` bigint NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_job_posting_source_url_url` (`url`),
  KEY `idx_job_posting_source_url_posting` (`job_posting_id`, `is_primary` DESC, `created_at` ASC),
  CONSTRAINT `fk_job_posting_source_url_posting`
    FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `job_posting`
  ADD COLUMN `company_name_normalized` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `position_title_normalized` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `position_title`;

CREATE INDEX `idx_job_posting_normalized_match`
  ON `job_posting` (`company_name_normalized`, `position_title_normalized`);
