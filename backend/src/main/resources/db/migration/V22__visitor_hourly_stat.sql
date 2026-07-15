CREATE TABLE visitor_hourly_visit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visitor_hash CHAR(64) NOT NULL,
    visited_date DATE NOT NULL,
    visited_hour INT NOT NULL,
    page_views BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT uk_visitor_hourly_visit_hash_date_hour UNIQUE (visitor_hash, visited_date, visited_hour),
    INDEX idx_visitor_hourly_visit_date (visited_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
