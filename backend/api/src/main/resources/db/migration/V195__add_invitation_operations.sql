ALTER TABLE registration_invitation
    ADD COLUMN label VARCHAR(120) NULL AFTER code_hash,
    ADD COLUMN recipient_email_canonical VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL AFTER label,
    ADD COLUMN sent_count INT NOT NULL DEFAULT 0 AFTER used_count,
    ADD COLUMN last_sent_at DATETIME(6) NULL AFTER sent_count,
    ADD COLUMN revoked_at DATETIME(6) NULL AFTER status,
    ADD KEY idx_registration_invitation_created_at (created_at),
    ADD KEY idx_registration_invitation_recipient (recipient_email_canonical);
