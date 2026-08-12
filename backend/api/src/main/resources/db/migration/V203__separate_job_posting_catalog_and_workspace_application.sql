-- 채용공고 원문/회사/직무는 공통 catalog로 유지하고, 사용자의 지원 활동은 Workspace가 소유한다.
-- 기존 job_posting의 상태 컬럼은 플랫폼 수집·AI 호환 경로를 위한 shadow로 유지한다.
SET @bootstrap_workspace_id = (SELECT `id` FROM `workspace` ORDER BY `id` LIMIT 1);

CREATE TABLE `workspace_job_application` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `job_posting_id` bigint NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'SAVED',
  `applied_at` date DEFAULT NULL,
  `memo` text,
  `interest_level` tinyint DEFAULT NULL,
  `match_score` int DEFAULT NULL,
  `match_reason` varchar(500) DEFAULT NULL,
  `appeal_analysis` text,
  `appeal_analyzed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `status_changed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_job_application_posting` (`workspace_id`, `job_posting_id`),
  KEY `idx_workspace_job_application_status`
    (`workspace_id`, `status`, `status_changed_at`),
  CONSTRAINT `fk_workspace_job_application_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workspace_job_application_catalog`
    FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_workspace_job_application_interest`
    CHECK (`interest_level` IS NULL OR (`interest_level` BETWEEN 1 AND 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `workspace_job_application` (
  `workspace_id`, `job_posting_id`, `status`, `applied_at`, `memo`,
  `match_score`, `match_reason`, `appeal_analysis`, `appeal_analyzed_at`,
  `created_at`, `updated_at`, `status_changed_at`
)
SELECT
  @bootstrap_workspace_id, `id`, `status`, `applied_at`, `memo`,
  `match_score`, `match_reason`, `appeal_analysis`, `appeal_analyzed_at`,
  `created_at`, `updated_at`, `status_changed_at`
FROM `job_posting`
WHERE @bootstrap_workspace_id IS NOT NULL;

CREATE TABLE `workspace_job_application_status_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_job_application_id` bigint NOT NULL,
  `status` varchar(30) NOT NULL,
  `memo` varchar(1000) DEFAULT NULL,
  `changed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_workspace_job_application_event_application`
    (`workspace_job_application_id`, `changed_at`),
  CONSTRAINT `fk_workspace_job_application_event_application`
    FOREIGN KEY (`workspace_job_application_id`) REFERENCES `workspace_job_application` (`id`)
      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `workspace_job_application_status_event` (
  `workspace_job_application_id`, `status`, `memo`, `changed_at`
)
SELECT wja.`id`, e.`status`, e.`memo`, e.`changed_at`
FROM `job_posting_status_event` e
JOIN `workspace_job_application` wja
  ON wja.`workspace_id` = @bootstrap_workspace_id
 AND wja.`job_posting_id` = e.`job_posting_id`;
