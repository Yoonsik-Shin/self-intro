CREATE TABLE message_outbox (
    id CHAR(36) NOT NULL PRIMARY KEY,
    exchange_name VARCHAR(255) NOT NULL,
    routing_key VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME(6) NOT NULL,
    locked_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    published_at DATETIME(6) NULL,
    dead_lettered_at DATETIME(6) NULL,
    last_error VARCHAR(1000) NULL,
    INDEX idx_message_outbox_relay (status, next_attempt_at, created_at),
    INDEX idx_message_outbox_lock (status, locked_at)
);
