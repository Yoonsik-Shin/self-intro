ALTER TABLE study
    ADD COLUMN workspace_id BIGINT NULL AFTER id;

UPDATE study
SET workspace_id = (
    SELECT id FROM workspace WHERE slug = 'w-199d6de326de71385a98' LIMIT 1
)
WHERE workspace_id IS NULL;

ALTER TABLE study
    MODIFY COLUMN workspace_id BIGINT NOT NULL,
    ADD KEY idx_study_workspace_status_learned (workspace_id, status, learned_at),
    ADD CONSTRAINT fk_study_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE;
