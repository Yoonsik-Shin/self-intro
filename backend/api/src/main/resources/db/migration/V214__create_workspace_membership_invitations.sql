CREATE TABLE workspace_membership_invitation (
    id BIGINT NOT NULL AUTO_INCREMENT,
    workspace_id BIGINT NOT NULL,
    invited_by_user_id BIGINT NOT NULL,
    recipient_email_canonical VARCHAR(255) NOT NULL,
    workspace_role VARCHAR(20) NOT NULL,
    token_hash BINARY(32) NOT NULL,
    status VARCHAR(20) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    accepted_at DATETIME(6) NULL,
    revoked_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_workspace_membership_invitation_token_hash (token_hash),
    KEY idx_workspace_membership_invitation_workspace_status (workspace_id, status, created_at),
    KEY idx_workspace_membership_invitation_recipient (recipient_email_canonical, status, expires_at),
    CONSTRAINT fk_workspace_membership_invitation_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspace(id),
    CONSTRAINT fk_workspace_membership_invitation_inviter
        FOREIGN KEY (invited_by_user_id) REFERENCES app_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
