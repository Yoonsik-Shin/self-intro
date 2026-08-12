ALTER TABLE registration_invitation
    ADD COLUMN used_at DATETIME(6) NULL AFTER revoked_at;

-- 과거 USED 초대는 실제 사용 시각을 알 수 없다. 즉시 삭제를 피하기 위해 만료 시각을
-- 보수적인 보존기한 기준으로 사용한다.
UPDATE registration_invitation
SET used_at = expires_at
WHERE status = 'USED' AND used_at IS NULL;

ALTER TABLE registration_invitation
    ADD KEY idx_registration_invitation_retention (status, expires_at, used_at, revoked_at);

ALTER TABLE workspace_membership_invitation
    ADD COLUMN declined_at DATETIME(6) NULL AFTER revoked_at,
    ADD KEY idx_workspace_membership_invitation_retention
        (status, expires_at, accepted_at, revoked_at, declined_at);
