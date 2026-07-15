-- study_id/experience_id are nullable: these are unidirectional @OneToMany/@JoinColumn
-- mappings (same style as experience_detail.experience_id), so Hibernate inserts the child
-- row first without the FK and issues a follow-up UPDATE to set it.
CREATE TABLE study_image (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    study_id BIGINT NULL,
    object_key VARCHAR(300) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_study_image_study FOREIGN KEY (study_id) REFERENCES study (id) ON DELETE CASCADE,
    INDEX idx_study_image_study_id (study_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_image (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    experience_id BIGINT NULL,
    object_key VARCHAR(300) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_experience_image_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE,
    INDEX idx_experience_image_experience_id (experience_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
