-- Add visible column to experience_detail for selective display
ALTER TABLE experience_detail ADD COLUMN visible BOOLEAN NOT NULL DEFAULT TRUE;
