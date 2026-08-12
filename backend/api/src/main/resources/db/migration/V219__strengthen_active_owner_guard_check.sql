ALTER TABLE workspace_member
    DROP CHECK chk_workspace_member_active_owner_guard,
    ADD CONSTRAINT chk_workspace_member_active_owner_guard
        CHECK (
            (
                workspace_role = 'OWNER'
                AND status = 'ACTIVE'
                AND active_owner_workspace_id IS NOT NULL
                AND active_owner_workspace_id = workspace_id
            )
            OR
            (
                (workspace_role <> 'OWNER' OR status <> 'ACTIVE')
                AND active_owner_workspace_id IS NULL
            )
        );
