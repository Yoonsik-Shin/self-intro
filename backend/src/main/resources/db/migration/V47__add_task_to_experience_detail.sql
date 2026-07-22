-- V47: Add task column to experience_detail for STAR framework normalization (Idempotent)
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'experience_detail' 
      AND COLUMN_NAME = 'task'
);

SET @ddl = IF(@column_exists = 0, 
    'ALTER TABLE experience_detail ADD COLUMN task TEXT AFTER situation', 
    'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
