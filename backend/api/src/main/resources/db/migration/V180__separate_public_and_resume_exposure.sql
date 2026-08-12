-- 공개 포트폴리오 노출과 이력서 후보군을 분리한다.
-- legacy visible은 기존 클라이언트 호환을 위해 public_visible과 동기화한다.
ALTER TABLE experience_detail
    ADD COLUMN public_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER visible,
    ADD COLUMN resume_available TINYINT(1) NOT NULL DEFAULT 1 AFTER public_visible;

UPDATE experience_detail
SET public_visible = visible,
    resume_available = 1;
