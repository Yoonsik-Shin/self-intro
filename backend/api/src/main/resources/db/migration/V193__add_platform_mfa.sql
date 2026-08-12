ALTER TABLE app_user
    ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER status,
    ADD COLUMN mfa_secret_ciphertext VARCHAR(512) NULL AFTER mfa_enabled;
