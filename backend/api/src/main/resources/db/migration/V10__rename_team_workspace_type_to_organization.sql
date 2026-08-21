UPDATE workspace
SET workspace_type = 'ORGANIZATION', updated_at = CURRENT_TIMESTAMP(6)
WHERE workspace_type = 'TEAM';
