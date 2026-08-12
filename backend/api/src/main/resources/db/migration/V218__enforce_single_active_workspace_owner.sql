ALTER TABLE workspace_member
    ADD COLUMN active_owner_workspace_id BIGINT NULL AFTER status;

UPDATE workspace_member
SET active_owner_workspace_id = workspace_id
WHERE workspace_role = 'OWNER'
  AND status = 'ACTIVE';

ALTER TABLE workspace_member
    ADD UNIQUE KEY uk_workspace_member_single_active_owner (active_owner_workspace_id),
    ADD CONSTRAINT chk_workspace_member_active_owner_guard
        CHECK (
            (
                workspace_role = 'OWNER'
                AND status = 'ACTIVE'
                AND active_owner_workspace_id = workspace_id
            )
            OR
            (
                (workspace_role <> 'OWNER' OR status <> 'ACTIVE')
                AND active_owner_workspace_id IS NULL
            )
        );
