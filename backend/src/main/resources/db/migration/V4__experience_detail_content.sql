ALTER TABLE experience_detail ADD COLUMN situation TEXT NULL;
ALTER TABLE experience_detail ADD COLUMN action_detail TEXT NULL;
ALTER TABLE experience_detail ADD COLUMN outcome TEXT NULL;

CREATE TABLE experience_detail_skill (
    experience_detail_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    list_order INT NOT NULL,
    PRIMARY KEY (experience_detail_id, skill_id),
    CONSTRAINT fk_exp_detail_skill_detail FOREIGN KEY (experience_detail_id) REFERENCES experience_detail (id) ON DELETE CASCADE,
    CONSTRAINT fk_exp_detail_skill_skill FOREIGN KEY (skill_id) REFERENCES skill (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
