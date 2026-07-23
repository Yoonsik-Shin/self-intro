ALTER TABLE donation
    ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'KRW' AFTER amount,
    ADD COLUMN is_subscription BOOLEAN NOT NULL DEFAULT FALSE AFTER pay_state,
    ADD COLUMN provider_paid_at DATETIME(6) NULL AFTER paid_at;
