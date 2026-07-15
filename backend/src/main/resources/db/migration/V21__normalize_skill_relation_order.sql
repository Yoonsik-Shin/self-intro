-- Hibernate @OrderColumn requires contiguous zero-based positions. V19 appended new relations
-- with catalog-derived values (200+), which makes Hibernate materialize null list slots.
CREATE TEMPORARY TABLE normalized_experience_skill AS
SELECT experience_id,
       skill_id,
       ROW_NUMBER() OVER (PARTITION BY experience_id ORDER BY list_order, skill_id) - 1 AS list_order
FROM experience_skill;

DELETE FROM experience_skill;

INSERT INTO experience_skill (experience_id, skill_id, list_order)
SELECT experience_id, skill_id, list_order
FROM normalized_experience_skill;

DROP TEMPORARY TABLE normalized_experience_skill;

CREATE TEMPORARY TABLE normalized_experience_detail_skill AS
SELECT experience_detail_id,
       skill_id,
       ROW_NUMBER() OVER (PARTITION BY experience_detail_id ORDER BY list_order, skill_id) - 1 AS list_order
FROM experience_detail_skill;

DELETE FROM experience_detail_skill;

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT experience_detail_id, skill_id, list_order
FROM normalized_experience_detail_skill;

DROP TEMPORARY TABLE normalized_experience_detail_skill;
