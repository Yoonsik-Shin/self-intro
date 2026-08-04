CREATE TABLE portfolio_case_study (
    id BIGINT NOT NULL AUTO_INCREMENT,
    experience_id BIGINT NOT NULL,
    slug VARCHAR(160) NOT NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_revision_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_portfolio_case_study_slug UNIQUE (slug),
    CONSTRAINT fk_portfolio_case_study_experience
        FOREIGN KEY (experience_id) REFERENCES experience(id) ON DELETE CASCADE
);

CREATE INDEX idx_portfolio_case_study_experience ON portfolio_case_study(experience_id);

CREATE TABLE portfolio_case_study_revision (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_study_id BIGINT NOT NULL,
    version INT NOT NULL,
    source VARCHAR(10) NOT NULL,
    content_json LONGTEXT NOT NULL,
    rendered_markdown LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_portfolio_case_study_revision_version UNIQUE (case_study_id, version),
    CONSTRAINT fk_portfolio_case_study_revision_case_study
        FOREIGN KEY (case_study_id) REFERENCES portfolio_case_study(id) ON DELETE CASCADE
);

ALTER TABLE portfolio_case_study
    ADD CONSTRAINT fk_portfolio_case_study_published_revision
        FOREIGN KEY (published_revision_id) REFERENCES portfolio_case_study_revision(id) ON DELETE SET NULL;

CREATE TABLE portfolio_case_study_study (
    case_study_id BIGINT NOT NULL,
    study_id BIGINT NOT NULL,
    PRIMARY KEY (case_study_id, study_id),
    CONSTRAINT fk_portfolio_case_study_study_case_study
        FOREIGN KEY (case_study_id) REFERENCES portfolio_case_study(id) ON DELETE CASCADE,
    CONSTRAINT fk_portfolio_case_study_study_study
        FOREIGN KEY (study_id) REFERENCES study(id) ON DELETE CASCADE
);

CREATE TABLE portfolio_layout (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_study_id BIGINT NOT NULL,
    orientation VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    source VARCHAR(10) NOT NULL,
    excluded_ids_json LONGTEXT NULL,
    section_order_json LONGTEXT NULL,
    section_gaps_json LONGTEXT NULL,
    item_order_overrides_json LONGTEXT NULL,
    forced_page_overrides_json LONGTEXT NULL,
    content_overrides_json LONGTEXT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_portfolio_layout_case_study
        FOREIGN KEY (case_study_id) REFERENCES portfolio_case_study(id) ON DELETE CASCADE
);

CREATE INDEX idx_portfolio_layout_case_study ON portfolio_layout(case_study_id, orientation);
