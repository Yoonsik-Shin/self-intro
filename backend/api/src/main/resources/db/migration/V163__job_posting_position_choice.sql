-- 2지망 이상만 저장한다(1지망은 job_posting.position_title이 dedup 정체성 키로 계속 담당).
CREATE TABLE `job_posting_position_choice` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `job_posting_id` bigint NOT NULL,
    `rank_order` int NOT NULL,
    `position_title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
    `created_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_job_posting_position_choice_rank` (`job_posting_id`, `rank_order`),
    CONSTRAINT `fk_job_posting_position_choice_posting`
        FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
