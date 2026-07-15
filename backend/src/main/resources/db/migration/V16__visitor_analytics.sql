CREATE TABLE visitor_daily_visit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visitor_hash CHAR(64) NOT NULL,
    visited_date DATE NOT NULL,
    first_visited_at DATETIME(6) NOT NULL,
    last_visited_at DATETIME(6) NOT NULL,
    page_views BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT uk_visitor_daily_visit_hash_date UNIQUE (visitor_hash, visited_date),
    INDEX idx_visitor_daily_visit_date (visited_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
