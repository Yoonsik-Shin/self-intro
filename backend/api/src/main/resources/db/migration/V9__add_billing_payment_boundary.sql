ALTER TABLE workspace_subscription
  ADD COLUMN price_monthly_krw int DEFAULT NULL AFTER plan_code,
  ADD COLUMN price_annual_krw int DEFAULT NULL AFTER price_monthly_krw,
  ADD COLUMN payment_method_id bigint DEFAULT NULL AFTER billing_cycle,
  ADD COLUMN renewal_failure_count int NOT NULL DEFAULT 0 AFTER grace_period_ends_at,
  ADD COLUMN renewal_lease_until datetime(6) DEFAULT NULL AFTER renewal_failure_count,
  ADD CONSTRAINT ck_workspace_subscription_renewal_failures CHECK (renewal_failure_count BETWEEN 0 AND 3);

UPDATE workspace_subscription s
JOIN billing_plan p ON p.code = s.plan_code
SET s.price_monthly_krw = p.monthly_price_krw,
    s.price_annual_krw = p.annual_price_krw;

CREATE TABLE billing_customer (
  id bigint NOT NULL AUTO_INCREMENT,
  workspace_id bigint NOT NULL,
  provider varchar(30) NOT NULL,
  provider_customer_key varchar(300) NOT NULL,
  billing_email_hash char(64) DEFAULT NULL,
  status varchar(30) NOT NULL,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_billing_customer_workspace_provider (workspace_id, provider),
  UNIQUE KEY uk_billing_customer_provider_key (provider, provider_customer_key),
  CONSTRAINT fk_billing_customer_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_payment_method (
  id bigint NOT NULL AUTO_INCREMENT,
  billing_customer_id bigint NOT NULL,
  provider varchar(30) NOT NULL,
  secret_reference varchar(500) NOT NULL,
  provider_method_key_hash char(64) NOT NULL,
  method_type varchar(30) NOT NULL,
  issuer_code varchar(30) DEFAULT NULL,
  masked_number varchar(40) DEFAULT NULL,
  status varchar(30) NOT NULL,
  owner_confirmed_at datetime(6) NOT NULL,
  activated_at datetime(6) DEFAULT NULL,
  revoked_at datetime(6) DEFAULT NULL,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_billing_payment_method_key_hash (provider, provider_method_key_hash),
  KEY idx_billing_payment_method_customer (billing_customer_id, status),
  CONSTRAINT fk_billing_payment_method_customer FOREIGN KEY (billing_customer_id) REFERENCES billing_customer (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE workspace_subscription
  ADD CONSTRAINT fk_workspace_subscription_payment_method FOREIGN KEY (payment_method_id) REFERENCES billing_payment_method (id) ON DELETE SET NULL;

CREATE TABLE billing_charge (
  id bigint NOT NULL AUTO_INCREMENT,
  public_id binary(16) NOT NULL,
  workspace_id bigint NOT NULL,
  subscription_id bigint DEFAULT NULL,
  charge_type varchar(30) NOT NULL,
  product_code varchar(60) NOT NULL,
  billing_cycle varchar(20) DEFAULT NULL,
  quantity int NOT NULL DEFAULT 1,
  points_to_grant int NOT NULL DEFAULT 0,
  amount_krw int NOT NULL,
  order_id varchar(64) NOT NULL,
  idempotency_key varchar(120) NOT NULL,
  period_key varchar(80) DEFAULT NULL,
  status varchar(30) NOT NULL,
  retry_count int NOT NULL DEFAULT 0,
  failure_code varchar(80) DEFAULT NULL,
  requested_by_user_id bigint DEFAULT NULL,
  requested_at datetime(6) NOT NULL,
  approved_at datetime(6) DEFAULT NULL,
  failed_at datetime(6) DEFAULT NULL,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_billing_charge_public_id (public_id),
  UNIQUE KEY uk_billing_charge_order (order_id),
  UNIQUE KEY uk_billing_charge_idempotency (idempotency_key),
  UNIQUE KEY uk_billing_charge_period (workspace_id, charge_type, period_key),
  KEY idx_billing_charge_reconcile (status, updated_at),
  CONSTRAINT fk_billing_charge_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE RESTRICT,
  CONSTRAINT fk_billing_charge_subscription FOREIGN KEY (subscription_id) REFERENCES workspace_subscription (id) ON DELETE SET NULL,
  CONSTRAINT fk_billing_charge_actor FOREIGN KEY (requested_by_user_id) REFERENCES app_user (id) ON DELETE SET NULL,
  CONSTRAINT ck_billing_charge_amount CHECK (amount_krw >= 0 AND quantity > 0 AND points_to_grant >= 0),
  CONSTRAINT ck_billing_charge_retry CHECK (retry_count BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_payment (
  id bigint NOT NULL AUTO_INCREMENT,
  billing_charge_id bigint NOT NULL,
  provider varchar(30) NOT NULL,
  provider_payment_key_hash char(64) NOT NULL,
  provider_payment_reference varchar(300) NOT NULL,
  provider_transaction_key varchar(100) DEFAULT NULL,
  payment_method varchar(50) DEFAULT NULL,
  status varchar(30) NOT NULL,
  approved_amount_krw int NOT NULL,
  canceled_amount_krw int NOT NULL DEFAULT 0,
  approved_at datetime(6) DEFAULT NULL,
  canceled_at datetime(6) DEFAULT NULL,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_billing_payment_provider_key (provider, provider_payment_key_hash),
  KEY idx_billing_payment_charge (billing_charge_id, id),
  CONSTRAINT fk_billing_payment_charge FOREIGN KEY (billing_charge_id) REFERENCES billing_charge (id) ON DELETE RESTRICT,
  CONSTRAINT ck_billing_payment_amount CHECK (approved_amount_krw >= 0 AND canceled_amount_krw >= 0 AND canceled_amount_krw <= approved_amount_krw)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_webhook_event (
  id bigint NOT NULL AUTO_INCREMENT,
  provider varchar(30) NOT NULL,
  event_key char(64) NOT NULL,
  event_type varchar(80) NOT NULL,
  provider_payment_key_hash char(64) DEFAULT NULL,
  payload_hash char(64) NOT NULL,
  status varchar(30) NOT NULL,
  received_at datetime(6) NOT NULL,
  processed_at datetime(6) DEFAULT NULL,
  failure_code varchar(80) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_billing_webhook_event (provider, event_key),
  KEY idx_billing_webhook_process (status, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subscription_seat_addon (
  id bigint NOT NULL AUTO_INCREMENT,
  subscription_id bigint NOT NULL,
  quantity int NOT NULL,
  pending_removal_quantity int NOT NULL DEFAULT 0,
  unit_monthly_price_krw int NOT NULL DEFAULT 3000,
  unit_annual_price_krw int NOT NULL DEFAULT 30000,
  effective_at datetime(6) NOT NULL,
  next_renewal_at datetime(6) NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subscription_seat_addon (subscription_id),
  CONSTRAINT fk_subscription_seat_addon_subscription FOREIGN KEY (subscription_id) REFERENCES workspace_subscription (id) ON DELETE CASCADE,
  CONSTRAINT ck_subscription_seat_addon_quantity CHECK (quantity >= 0 AND pending_removal_quantity >= 0 AND pending_removal_quantity <= quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
