CREATE TABLE study_experience_detail (
    study_id BIGINT NOT NULL,
    experience_detail_id BIGINT NOT NULL,
    PRIMARY KEY (study_id, experience_detail_id),
    CONSTRAINT fk_study_experience_detail_study FOREIGN KEY (study_id) REFERENCES study (id) ON DELETE CASCADE,
    CONSTRAINT fk_study_experience_detail_detail FOREIGN KEY (experience_detail_id) REFERENCES experience_detail (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
