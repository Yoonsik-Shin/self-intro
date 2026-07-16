CREATE TABLE experience_placement (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    experience_id BIGINT NOT NULL,
    placement_type VARCHAR(40) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT uk_experience_placement UNIQUE (experience_id, placement_type),
    CONSTRAINT fk_experience_placement_experience
        FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE,
    INDEX idx_experience_placement_public (placement_type, enabled, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO experience_placement (
    experience_id,
    placement_type,
    display_order,
    enabled,
    created_at,
    updated_at
)
SELECT
    id,
    'CORE_PROJECT',
    display_order,
    TRUE,
    NOW(),
    NOW()
FROM experience
WHERE type IN ('CAREER', 'PROJECT');
