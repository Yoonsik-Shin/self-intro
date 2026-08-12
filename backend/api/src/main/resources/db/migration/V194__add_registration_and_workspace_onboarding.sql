ALTER TABLE app_user
    ADD COLUMN email_canonical VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL AFTER email,
    ADD COLUMN email_verified_at DATETIME(6) NULL AFTER email_canonical;

UPDATE app_user
SET email_canonical = LOWER(TRIM(email))
WHERE email IS NOT NULL;

ALTER TABLE app_user
    ADD UNIQUE KEY uk_app_user_email_canonical (email_canonical);

ALTER TABLE workspace
    ADD COLUMN public_key BINARY(16) NULL AFTER id,
    ADD COLUMN publication_status VARCHAR(20) NOT NULL DEFAULT 'PRIVATE' AFTER status;

UPDATE workspace
SET public_key = UUID_TO_BIN(UUID()),
    publication_status = 'PUBLISHED';

ALTER TABLE workspace
    MODIFY COLUMN public_key BINARY(16) NOT NULL,
    ADD UNIQUE KEY uk_workspace_public_key (public_key);

CREATE TABLE registration_invitation (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code_hash BINARY(32) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    max_uses INT NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    created_by_user_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_registration_invitation_code_hash (code_hash),
    CONSTRAINT fk_registration_invitation_creator
        FOREIGN KEY (created_by_user_id) REFERENCES app_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE email_verification_token (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token_hash BINARY(32) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    used_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_email_verification_token_hash (token_hash),
    KEY idx_email_verification_user_created (user_id, created_at),
    CONSTRAINT fk_email_verification_user
        FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_consent (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    consent_type VARCHAR(40) NOT NULL,
    policy_version VARCHAR(40) NOT NULL,
    granted TINYINT(1) NOT NULL,
    recorded_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_consent_version (user_id, consent_type, policy_version),
    CONSTRAINT fk_user_consent_user
        FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE verified_identity (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    provider VARCHAR(40) NOT NULL,
    provider_subject_hash BINARY(32) NOT NULL,
    verification_status VARCHAR(20) NOT NULL,
    verified_at DATETIME(6) NULL,
    expires_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_verified_identity_user (user_id),
    UNIQUE KEY uk_verified_identity_provider_subject (provider, provider_subject_hash),
    CONSTRAINT fk_verified_identity_user
        FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workspace_slug_alias (
    id BIGINT NOT NULL AUTO_INCREMENT,
    workspace_id BIGINT NOT NULL,
    slug VARCHAR(120) COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at DATETIME(6) NOT NULL,
    retired_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_workspace_slug_alias_slug (slug),
    KEY idx_workspace_slug_alias_workspace (workspace_id),
    CONSTRAINT fk_workspace_slug_alias_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
