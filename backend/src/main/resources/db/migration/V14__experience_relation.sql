CREATE TABLE experience_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_experience_id BIGINT NOT NULL,
    target_experience_id BIGINT NOT NULL,
    relation_type VARCHAR(30) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_experience_relation UNIQUE (source_experience_id, target_experience_id, relation_type),
    CONSTRAINT fk_experience_relation_source FOREIGN KEY (source_experience_id) REFERENCES experience (id) ON DELETE CASCADE,
    CONSTRAINT fk_experience_relation_target FOREIGN KEY (target_experience_id) REFERENCES experience (id) ON DELETE CASCADE,
    CONSTRAINT chk_experience_relation_not_self CHECK (source_experience_id <> target_experience_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_experience_relation_target ON experience_relation (target_experience_id);
