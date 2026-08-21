CREATE TABLE billing_plan (
  code varchar(30) NOT NULL,
  display_name varchar(80) NOT NULL,
  monthly_price_krw int NOT NULL,
  annual_price_krw int NOT NULL,
  included_ai_points int NOT NULL,
  included_members int NOT NULL,
  active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (code),
  CONSTRAINT ck_billing_plan_prices CHECK (monthly_price_krw >= 0 AND annual_price_krw >= 0),
  CONSTRAINT ck_billing_plan_entitlements CHECK (included_ai_points >= 0 AND included_members > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plan_entitlement (
  id bigint NOT NULL AUTO_INCREMENT,
  plan_code varchar(30) NOT NULL,
  entitlement_key varchar(80) NOT NULL,
  entitlement_value varchar(190) NOT NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_plan_entitlement (plan_code, entitlement_key),
  CONSTRAINT fk_plan_entitlement_plan FOREIGN KEY (plan_code) REFERENCES billing_plan (code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workspace_subscription (
  id bigint NOT NULL AUTO_INCREMENT,
  workspace_id bigint NOT NULL,
  plan_code varchar(30) NOT NULL,
  status varchar(30) NOT NULL,
  billing_cycle varchar(20) DEFAULT NULL,
  current_period_start datetime(6) NOT NULL,
  current_period_end datetime(6) NOT NULL,
  cancel_at_period_end tinyint(1) NOT NULL DEFAULT 0,
  grace_period_ends_at datetime(6) DEFAULT NULL,
  version bigint NOT NULL DEFAULT 0,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_workspace_subscription_workspace (workspace_id),
  KEY idx_workspace_subscription_renewal (status, current_period_end),
  CONSTRAINT fk_workspace_subscription_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE,
  CONSTRAINT fk_workspace_subscription_plan FOREIGN KEY (plan_code) REFERENCES billing_plan (code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_price (
  id bigint NOT NULL AUTO_INCREMENT,
  provider varchar(30) NOT NULL,
  model varchar(100) NOT NULL,
  region varchar(50) NOT NULL,
  currency varchar(3) NOT NULL,
  input_price_per_million decimal(18,6) NOT NULL,
  cached_input_price_per_million decimal(18,6) DEFAULT NULL,
  output_price_per_million decimal(18,6) NOT NULL,
  exchange_rate_to_krw decimal(18,6) NOT NULL,
  effective_from datetime(6) NOT NULL,
  effective_to datetime(6) DEFAULT NULL,
  price_version varchar(40) NOT NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_provider_price_version (provider, model, region, price_version),
  KEY idx_provider_price_effective (provider, model, region, effective_from, effective_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_usage (
  id bigint NOT NULL AUTO_INCREMENT,
  public_id binary(16) NOT NULL,
  workspace_id bigint NOT NULL,
  actor_user_id bigint DEFAULT NULL,
  feature_code varchar(60) NOT NULL,
  operation_code varchar(60) NOT NULL,
  session_key varchar(120) NOT NULL,
  provider varchar(30) DEFAULT NULL,
  model varchar(100) DEFAULT NULL,
  region varchar(50) DEFAULT NULL,
  credential_mode varchar(30) NOT NULL DEFAULT 'PLATFORM_MANAGED',
  status varchar(30) NOT NULL,
  charge_outcome varchar(30) NOT NULL DEFAULT 'PENDING',
  estimated_points int NOT NULL,
  reserved_points int NOT NULL,
  committed_points int NOT NULL DEFAULT 0,
  input_tokens bigint DEFAULT NULL,
  cached_input_tokens bigint DEFAULT NULL,
  output_tokens bigint DEFAULT NULL,
  retry_count int NOT NULL DEFAULT 0,
  provider_cost_usd decimal(18,8) DEFAULT NULL,
  provider_cost_krw decimal(18,4) DEFAULT NULL,
  price_version varchar(40) DEFAULT NULL,
  evidence_policy_version varchar(40) NOT NULL,
  consent_policy_version varchar(40) NOT NULL,
  evidence_snapshot_hash char(64) DEFAULT NULL,
  failure_code varchar(80) DEFAULT NULL,
  started_at datetime(6) NOT NULL,
  provider_called_at datetime(6) DEFAULT NULL,
  completed_at datetime(6) DEFAULT NULL,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_usage_public_id (public_id),
  KEY idx_ai_usage_workspace_created (workspace_id, created_at, id),
  KEY idx_ai_usage_reconciliation (status, updated_at),
  KEY idx_ai_usage_actor (actor_user_id, created_at),
  CONSTRAINT fk_ai_usage_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_usage_actor FOREIGN KEY (actor_user_id) REFERENCES app_user (id) ON DELETE SET NULL,
  CONSTRAINT ck_ai_usage_points CHECK (estimated_points >= 0 AND reserved_points >= 0 AND committed_points >= 0),
  CONSTRAINT ck_ai_usage_tokens CHECK ((input_tokens IS NULL OR input_tokens >= 0) AND (cached_input_tokens IS NULL OR cached_input_tokens >= 0) AND (output_tokens IS NULL OR output_tokens >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_point_ledger (
  id bigint NOT NULL AUTO_INCREMENT,
  workspace_id bigint NOT NULL,
  ai_usage_id bigint DEFAULT NULL,
  entry_type varchar(30) NOT NULL,
  bucket_type varchar(30) NOT NULL,
  points int NOT NULL,
  idempotency_key varchar(120) NOT NULL,
  expires_at datetime(6) DEFAULT NULL,
  created_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_point_ledger_idempotency (idempotency_key),
  KEY idx_ai_point_ledger_balance (workspace_id, expires_at, created_at, id),
  KEY idx_ai_point_ledger_usage (ai_usage_id, id),
  CONSTRAINT fk_ai_point_ledger_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_point_ledger_usage FOREIGN KEY (ai_usage_id) REFERENCES ai_usage (id) ON DELETE SET NULL,
  CONSTRAINT ck_ai_point_ledger_nonzero CHECK (points <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_free_session (
  id bigint NOT NULL AUTO_INCREMENT,
  workspace_id bigint NOT NULL,
  actor_user_id bigint DEFAULT NULL,
  feature_code varchar(60) NOT NULL,
  session_key varchar(120) NOT NULL,
  benefit_month date NOT NULL,
  status varchar(20) NOT NULL,
  revision_count int NOT NULL DEFAULT 0,
  first_ai_usage_id bigint DEFAULT NULL,
  expires_at datetime(6) NOT NULL,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_free_session_month (workspace_id, feature_code, benefit_month),
  CONSTRAINT fk_ai_free_session_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_free_session_actor FOREIGN KEY (actor_user_id) REFERENCES app_user (id) ON DELETE SET NULL,
  CONSTRAINT fk_ai_free_session_usage FOREIGN KEY (first_ai_usage_id) REFERENCES ai_usage (id) ON DELETE SET NULL,
  CONSTRAINT ck_ai_free_session_revision CHECK (revision_count BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workspace_ai_processing_consent (
  id bigint NOT NULL AUTO_INCREMENT,
  workspace_id bigint NOT NULL,
  user_id bigint NOT NULL,
  purpose_code varchar(60) NOT NULL,
  provider varchar(30) NOT NULL,
  region varchar(50) NOT NULL,
  credential_mode varchar(30) NOT NULL,
  data_categories varchar(500) NOT NULL,
  policy_version varchar(40) NOT NULL,
  granted tinyint(1) NOT NULL,
  recorded_at datetime(6) NOT NULL,
  revoked_at datetime(6) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_workspace_ai_consent_version (workspace_id, user_id, purpose_code, provider, region, credential_mode, policy_version),
  KEY idx_workspace_ai_consent_active (workspace_id, user_id, purpose_code, granted, revoked_at),
  CONSTRAINT fk_workspace_ai_consent_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE,
  CONSTRAINT fk_workspace_ai_consent_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workspace_ai_policy (
  workspace_id bigint NOT NULL,
  credential_mode varchar(30) NOT NULL DEFAULT 'PLATFORM_MANAGED',
  provider varchar(30) NOT NULL DEFAULT 'NVIDIA',
  model_tier varchar(30) NOT NULL DEFAULT 'STANDARD',
  region varchar(50) NOT NULL DEFAULT 'PLATFORM_DEFAULT',
  monthly_safety_limit_points int DEFAULT NULL,
  allow_generation tinyint(1) NOT NULL DEFAULT 1,
  allow_embedding tinyint(1) NOT NULL DEFAULT 1,
  policy_version varchar(40) NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (workspace_id),
  CONSTRAINT fk_workspace_ai_policy_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workspace_ai_provider_credential (
  id bigint NOT NULL AUTO_INCREMENT,
  workspace_id bigint NOT NULL,
  provider varchar(30) NOT NULL,
  secret_reference varchar(500) NOT NULL,
  masked_fingerprint varchar(80) NOT NULL,
  status varchar(30) NOT NULL,
  key_version varchar(80) NOT NULL,
  last_validated_at datetime(6) DEFAULT NULL,
  rotated_at datetime(6) DEFAULT NULL,
  revoked_at datetime(6) DEFAULT NULL,
  created_at datetime(6) NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_workspace_ai_credential_provider (workspace_id, provider),
  CONSTRAINT fk_workspace_ai_credential_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO billing_plan (code, display_name, monthly_price_krw, annual_price_krw, included_ai_points, included_members)
VALUES
  ('FREE', 'Free', 0, 0, 0, 1),
  ('PERSONAL_PRO', 'Personal Pro', 9900, 99000, 5000, 5),
  ('BUSINESS', 'Business', 39000, 390000, 25000, 10);

INSERT INTO plan_entitlement (plan_code, entitlement_key, entitlement_value)
VALUES
  ('FREE', 'OWNED_WORKSPACES', '1'),
  ('FREE', 'AI_FREE_SESSION_PER_FEATURE_MONTH', '1'),
  ('FREE', 'AI_FREE_SESSION_REVISIONS', '3'),
  ('PERSONAL_PRO', 'OWNED_WORKSPACES', '5'),
  ('PERSONAL_PRO', 'EXTRA_SEAT_MONTHLY_KRW', '3000'),
  ('BUSINESS', 'OWNED_WORKSPACES', '10'),
  ('BUSINESS', 'EXTRA_SEAT_MONTHLY_KRW', '3000');

INSERT INTO workspace_subscription (
  workspace_id, plan_code, status, billing_cycle, current_period_start, current_period_end,
  cancel_at_period_end, version, created_at, updated_at
)
SELECT id, 'FREE', 'ACTIVE', NULL,
       TIMESTAMP(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')),
       TIMESTAMP(DATE_ADD(LAST_DAY(CURRENT_DATE), INTERVAL 1 DAY)),
       0, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
FROM workspace;

INSERT INTO workspace_ai_policy (
  workspace_id, credential_mode, provider, model_tier, region, allow_generation, allow_embedding,
  policy_version, version, created_at, updated_at
)
SELECT id, 'PLATFORM_MANAGED', 'NVIDIA', 'STANDARD', 'PLATFORM_DEFAULT', 1, 1,
       '2026-08-21', 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
FROM workspace;
