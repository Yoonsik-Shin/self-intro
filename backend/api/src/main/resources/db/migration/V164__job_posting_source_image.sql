-- URL 파싱이 불가능한 공고를 JD 스크린샷으로 등록할 때, 파싱에 쓴 원본 이미지를 영구 보관해
-- 나중에 사람이 파싱 정확도를 재확인할 수 있게 한다. job_posting_source_url과 동일하게
-- 공고 하나에 여러 장(스크롤 캡처)이 붙을 수 있다.
CREATE TABLE `job_posting_source_image` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `job_posting_id` bigint NOT NULL,
    `object_key` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
    `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
    `display_order` int NOT NULL DEFAULT 0,
    `created_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_job_posting_source_image_posting` (`job_posting_id`, `display_order`),
    CONSTRAINT `fk_job_posting_source_image_posting`
        FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
