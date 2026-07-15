CREATE TABLE study_category (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    slug VARCHAR(80) NOT NULL UNIQUE,
    display_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO study_category (id, name, slug, display_order) VALUES
    (1, '프로젝트', 'project', 1),
    (2, '공부/학습', 'education', 2),
    (3, '자격증', 'certificate', 3),
    (4, '백엔드', 'backend', 4),
    (5, '인프라/DevOps', 'devops', 5),
    (6, 'AI/RAG', 'ai-rag', 6),
    (7, '회고', 'retrospective', 7);

CREATE TABLE tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(160) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    content_markdown LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    category_id BIGINT NOT NULL,
    learned_at DATE NOT NULL,
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_study_category FOREIGN KEY (category_id) REFERENCES study_category (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_tag (
    study_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (study_id, tag_id),
    CONSTRAINT fk_study_tag_study FOREIGN KEY (study_id) REFERENCES study (id) ON DELETE CASCADE,
    CONSTRAINT fk_study_tag_tag FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_skill (
    study_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    PRIMARY KEY (study_id, skill_id),
    CONSTRAINT fk_study_skill_study FOREIGN KEY (study_id) REFERENCES study (id) ON DELETE CASCADE,
    CONSTRAINT fk_study_skill_skill FOREIGN KEY (skill_id) REFERENCES skill (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_experience (
    study_id BIGINT NOT NULL,
    experience_id BIGINT NOT NULL,
    PRIMARY KEY (study_id, experience_id),
    CONSTRAINT fk_study_experience_study FOREIGN KEY (study_id) REFERENCES study (id) ON DELETE CASCADE,
    CONSTRAINT fk_study_experience_experience FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_study_id BIGINT NOT NULL,
    target_study_id BIGINT NOT NULL,
    relation_type VARCHAR(30) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_study_relation UNIQUE (source_study_id, target_study_id, relation_type),
    CONSTRAINT fk_study_relation_source FOREIGN KEY (source_study_id) REFERENCES study (id) ON DELETE CASCADE,
    CONSTRAINT fk_study_relation_target FOREIGN KEY (target_study_id) REFERENCES study (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_study_status_learned_at ON study (status, learned_at);
CREATE INDEX idx_study_category_id ON study (category_id);

INSERT INTO study (
    id, slug, title, summary, content_markdown, status, category_id,
    learned_at, published_at, created_at, updated_at
)
SELECT
    se.id,
    CONCAT('legacy-study-', se.id),
    se.title,
    LEFT(se.description, 500),
    CONCAT(se.description, '\n\n## Lesson Learned\n\n', se.takeaway),
    'PUBLISHED',
    CASE se.category
        WHEN 'PROJECT' THEN 1
        WHEN 'EDUCATION' THEN 2
        WHEN 'CERTIFICATE' THEN 3
        ELSE 2
    END,
    se.learned_at,
    se.created_at,
    se.created_at,
    se.created_at
FROM study_entry se;

INSERT INTO tag (name, slug)
SELECT
    ses.skill,
    ses.skill
FROM study_entry_skill ses
GROUP BY ses.skill;

INSERT INTO study_tag (study_id, tag_id)
SELECT ses.study_entry_id, t.id
FROM study_entry_skill ses
JOIN tag t ON t.name = ses.skill;

INSERT INTO study_skill (study_id, skill_id)
SELECT DISTINCT ses.study_entry_id, s.id
FROM study_entry_skill ses
JOIN skill s ON s.name = ses.skill;

-- study_entry and study_entry_skill are intentionally retained for one release.
-- Remove them only after production row counts and Markdown conversion are verified.
