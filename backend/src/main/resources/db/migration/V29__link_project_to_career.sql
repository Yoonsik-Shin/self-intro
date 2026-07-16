ALTER TABLE project
    ADD COLUMN career_experience_id BIGINT NULL AFTER experience_id,
    MODIFY COLUMN contribution_rate INT NULL,
    ADD CONSTRAINT fk_project_career
        FOREIGN KEY (career_experience_id) REFERENCES career (experience_id) ON DELETE RESTRICT,
    ADD INDEX idx_project_career (career_experience_id);
