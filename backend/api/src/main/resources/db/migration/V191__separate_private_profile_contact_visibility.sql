ALTER TABLE `profile`
  ADD COLUMN `public_email` boolean NOT NULL DEFAULT false AFTER `email`,
  ADD COLUMN `public_phone` boolean NOT NULL DEFAULT false AFTER `phone`;

-- 기존 단일 소유자 포트폴리오에서 이미 공개 중이던 연락처는 기존 발행 의도를 보존한다.
-- 신규 Workspace/Profile은 DEFAULT false로 시작한다.
UPDATE `profile`
SET `public_email` = true,
    `public_phone` = true;
