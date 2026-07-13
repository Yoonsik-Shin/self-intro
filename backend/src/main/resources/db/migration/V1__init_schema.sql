CREATE TABLE study_entry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(1200) NOT NULL,
    category VARCHAR(30) NOT NULL,
    takeaway VARCHAR(800) NOT NULL,
    learned_at DATE NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_entry_skill (
    study_entry_id BIGINT NOT NULL,
    skill VARCHAR(60) NOT NULL,
    CONSTRAINT fk_study_entry_skill_study_entry FOREIGN KEY (study_entry_id) REFERENCES study_entry (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
