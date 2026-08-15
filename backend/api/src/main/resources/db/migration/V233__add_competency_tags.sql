CREATE TABLE competency_tag (
    competency_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (competency_id, tag_id),
    KEY idx_competency_tag_tag_id (tag_id),
    CONSTRAINT fk_competency_tag_competency
        FOREIGN KEY (competency_id) REFERENCES competency(id) ON DELETE CASCADE,
    CONSTRAINT fk_competency_tag_tag
        FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
