ALTER TABLE `print_template`
    ADD COLUMN `line_height` DECIMAL(4, 3) NOT NULL DEFAULT 1.625 COMMENT '본문 줄간격 배수';
