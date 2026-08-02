ALTER TABLE `job_posting`
  ADD COLUMN `is_always_open` boolean NOT NULL DEFAULT false AFTER `deadline`;
