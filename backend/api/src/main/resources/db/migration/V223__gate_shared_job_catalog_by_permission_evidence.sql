-- 플랫폼 운영자의 주관적 승인만으로는 공고 원문 재노출 권한이 생기지 않는다.
-- 기존 전역 공고는 모두 REVIEW_REQUIRED로 격리하고, 근거가 검증된 행만 공통 카탈로그에 노출한다.
ALTER TABLE `job_posting`
    ADD COLUMN `permission_basis` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN `permission_review_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REVIEW_REQUIRED',
    ADD COLUMN `permission_evidence_reference` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    ADD COLUMN `permission_grantor_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    ADD COLUMN `permission_grantor_authority` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    ADD COLUMN `permission_scope_note` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    ADD COLUMN `permission_terms_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    ADD COLUMN `permission_revocation_contact` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    ADD COLUMN `permission_expires_at` datetime(6) DEFAULT NULL,
    ADD COLUMN `permission_reviewed_by_user_id` bigint DEFAULT NULL,
    ADD COLUMN `permission_reviewed_at` datetime(6) DEFAULT NULL,
    ADD KEY `idx_job_posting_permission_catalog` (`permission_review_status`, `permission_expires_at`);

CREATE TABLE `job_posting_permission_review_event` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `job_posting_id` bigint NOT NULL,
    `review_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
    `permission_basis` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
    `evidence_reference` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `grantor_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `grantor_authority` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `permission_scope_note` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `terms_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `revocation_contact` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `expires_at` datetime(6) DEFAULT NULL,
    `reviewed_by_user_id` bigint NOT NULL,
    `reviewed_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_job_permission_event_posting_time` (`job_posting_id`, `reviewed_at`),
    CONSTRAINT `fk_job_permission_event_posting`
        FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
