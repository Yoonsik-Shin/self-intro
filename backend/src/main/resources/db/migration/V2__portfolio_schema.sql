CREATE TABLE profile (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    name_en VARCHAR(60) NOT NULL,
    job_title VARCHAR(80) NOT NULL,
    bio VARCHAR(500) NOT NULL,
    career_summary VARCHAR(120) NOT NULL,
    core_stack_summary VARCHAR(120) NOT NULL,
    status_badge_text VARCHAR(160) NOT NULL,
    github_url VARCHAR(255) NOT NULL,
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE skill (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    skill_level VARCHAR(40) NULL,
    is_core BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(150) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NULL,
    summary VARCHAR(300) NULL,
    takeaway VARCHAR(500) NULL,
    essay_content TEXT NULL,
    display_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_skill (
    experience_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    list_order INT NOT NULL,
    PRIMARY KEY (experience_id, skill_id),
    CONSTRAINT fk_exp_skill_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE,
    CONSTRAINT fk_exp_skill_skill FOREIGN KEY (skill_id) REFERENCES skill (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_detail (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    experience_id BIGINT NULL,
    content VARCHAR(500) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_exp_detail_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE career (
    experience_id BIGINT PRIMARY KEY,
    company_name VARCHAR(80) NOT NULL,
    employment_type VARCHAR(40) NOT NULL,
    department VARCHAR(80) NOT NULL,
    role VARCHAR(80) NOT NULL,
    CONSTRAINT fk_career_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project (
    experience_id BIGINT PRIMARY KEY,
    slug VARCHAR(40) NOT NULL,
    role VARCHAR(80) NOT NULL,
    contribution_rate INT NOT NULL,
    CONSTRAINT fk_project_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE education (
    experience_id BIGINT PRIMARY KEY,
    institution_name VARCHAR(100) NOT NULL,
    CONSTRAINT fk_education_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE certificate (
    experience_id BIGINT PRIMARY KEY,
    issuer VARCHAR(100) NOT NULL,
    CONSTRAINT fk_certificate_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
