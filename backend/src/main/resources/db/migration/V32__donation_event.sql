CREATE TABLE donation_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    donation_id BIGINT NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    actor VARCHAR(20) NOT NULL,
    pay_state VARCHAR(10) NULL,
    detail VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_donation_event_donation FOREIGN KEY (donation_id) REFERENCES donation (id),
    INDEX idx_donation_event_donation (donation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
