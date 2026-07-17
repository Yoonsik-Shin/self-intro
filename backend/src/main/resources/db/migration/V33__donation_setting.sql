CREATE TABLE donation_setting (
    id BIGINT NOT NULL PRIMARY KEY,
    donation_enabled BOOLEAN NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO donation_setting (id, donation_enabled, updated_at) VALUES (1, TRUE, NOW(6));
