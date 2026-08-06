ALTER TABLE `job_posting` MODIFY COLUMN `deadline_time` TIME DEFAULT '23:59:59';

UPDATE `job_posting` SET `deadline_time` = '23:59:59' WHERE `deadline_time` = '18:00:00';
