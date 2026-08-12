-- The original migration-only slug exposed that this Workspace belongs to the platform owner.
-- Do not retain it as an alias: the old URL must stop resolving instead of advertising the role.
UPDATE workspace
SET slug = 'w-199d6de326de71385a98',
    updated_at = NOW(6)
WHERE slug = 'owner-personal';

DELETE FROM workspace_slug_alias
WHERE slug = 'owner-personal';
