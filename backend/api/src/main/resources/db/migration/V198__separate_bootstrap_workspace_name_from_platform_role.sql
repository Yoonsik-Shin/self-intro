UPDATE workspace
SET name = '경력 관리 워크스페이스',
    updated_at = NOW(6)
WHERE slug = 'w-199d6de326de71385a98'
  AND name IN ('Platform Owner', 'Personal Workspace');
