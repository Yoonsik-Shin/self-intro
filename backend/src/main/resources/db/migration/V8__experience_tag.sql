CREATE TABLE experience_tag (
    experience_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (experience_id, tag_id),
    CONSTRAINT fk_experience_tag_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE,
    CONSTRAINT fk_experience_tag_tag FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
