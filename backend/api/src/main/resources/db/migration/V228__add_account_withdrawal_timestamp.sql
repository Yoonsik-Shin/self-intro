ALTER TABLE app_user
    ADD COLUMN withdrawn_at DATETIME(6) NULL AFTER updated_at;
