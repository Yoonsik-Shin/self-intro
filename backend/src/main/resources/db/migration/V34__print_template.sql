CREATE TABLE print_template (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    excluded_ids  TEXT         NOT NULL,
    section_order TEXT         NOT NULL,
    section_gaps  TEXT         NOT NULL,
    visible       BOOLEAN      NOT NULL DEFAULT TRUE,
    display_order INT          NOT NULL DEFAULT 0,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
