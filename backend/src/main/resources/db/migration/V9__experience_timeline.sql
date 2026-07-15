ALTER TABLE experience
    ADD COLUMN show_on_timeline BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN timeline_label VARCHAR(60) NULL;
