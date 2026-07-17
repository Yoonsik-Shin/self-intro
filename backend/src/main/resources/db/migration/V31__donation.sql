CREATE TABLE donation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    client_token CHAR(36) NOT NULL,
    amount INT NOT NULL,
    message VARCHAR(200) NULL,
    status VARCHAR(20) NOT NULL,
    mul_no VARCHAR(64) NULL,
    pay_state VARCHAR(10) NULL,
    created_at DATETIME(6) NOT NULL,
    paid_at DATETIME(6) NULL,
    canceled_at DATETIME(6) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_donation_client_token UNIQUE (client_token),
    CONSTRAINT uk_donation_mul_no UNIQUE (mul_no),
    INDEX idx_donation_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
