-- experience_skill and experience_detail_skill back List<Skill> collections mapped with @OrderColumn.
-- Hibernate synchronizes @OrderColumn lists by issuing
--   UPDATE join_table SET skill_id = ? WHERE parent_id = ? AND list_order = ?
-- per changed slot. With the primary key on (parent_id, skill_id), that UPDATE can transiently collide
-- with another row that still holds the target skill_id at a different list_order (not yet updated in
-- the same flush), raising a duplicate-key error even when the resulting collection is a valid
-- permutation of unique skills. The primary key for an @OrderColumn join table must be the
-- (parent_id, list_order) slot identity instead. Each table already carries a separate named key on
-- skill_id for the FK (fk_exp_skill_skill / fk_exp_detail_skill_skill), so lookup performance is
-- unaffected by the primary key change.

ALTER TABLE experience_skill
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (experience_id, list_order);

ALTER TABLE experience_detail_skill
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (experience_detail_id, list_order);
