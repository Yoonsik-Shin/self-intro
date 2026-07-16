CREATE TABLE experience_placement_detail (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    placement_id BIGINT NOT NULL,
    experience_detail_id BIGINT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    CONSTRAINT uk_experience_placement_detail UNIQUE (placement_id, experience_detail_id),
    CONSTRAINT fk_placement_detail_placement
        FOREIGN KEY (placement_id) REFERENCES experience_placement (id) ON DELETE CASCADE,
    CONSTRAINT fk_placement_detail_experience_detail
        FOREIGN KEY (experience_detail_id) REFERENCES experience_detail (id) ON DELETE CASCADE,
    INDEX idx_placement_detail_order (placement_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO experience_placement_detail (
    placement_id,
    experience_detail_id,
    display_order,
    created_at
)
SELECT
    placement.id,
    detail.id,
    detail.display_order,
    NOW()
FROM experience_placement placement
JOIN experience_detail detail
    ON detail.experience_id = placement.experience_id
ORDER BY placement.id, detail.display_order, detail.id;
