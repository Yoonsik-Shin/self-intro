ALTER TABLE workspace_slug_alias
    ADD COLUMN alias_type VARCHAR(20) NOT NULL DEFAULT 'ALIAS' AFTER slug;

UPDATE workspace_slug_alias alias_entry
JOIN workspace ON workspace.id = alias_entry.workspace_id
SET alias_entry.alias_type = 'CANONICAL',
    alias_entry.retired_at = NULL
WHERE alias_entry.slug = workspace.slug;

INSERT INTO workspace_slug_alias (workspace_id, slug, alias_type, created_at, retired_at)
SELECT workspace.id, workspace.slug, 'CANONICAL', workspace.created_at, NULL
FROM workspace
WHERE NOT EXISTS (
    SELECT 1
    FROM workspace_slug_alias alias_entry
    WHERE alias_entry.slug = workspace.slug
);
