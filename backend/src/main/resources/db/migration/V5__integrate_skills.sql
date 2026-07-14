-- Delete duplicate experience_skill associations for 'Spring Boot 3.3' if 'Spring Boot' is already associated
DELETE es1 FROM experience_skill es1
JOIN skill s_33 ON s_33.name = 'Spring Boot 3.3'
JOIN skill s_base ON s_base.name = 'Spring Boot'
WHERE es1.skill_id = s_33.id
  AND EXISTS (
      SELECT 1 FROM (SELECT * FROM experience_skill) es2
      WHERE es2.experience_id = es1.experience_id
        AND es2.skill_id = s_base.id
  );

-- Update references from 'Spring Boot 3.3' to 'Spring Boot'
UPDATE experience_skill es
JOIN skill s_33 ON s_33.name = 'Spring Boot 3.3'
JOIN skill s_base ON s_base.name = 'Spring Boot'
SET es.skill_id = s_base.id
WHERE es.skill_id = s_33.id;

-- Delete the duplicate 'Spring Boot 3.3' skill
DELETE FROM skill WHERE name = 'Spring Boot 3.3';

-- Update 'Spring Boot' version to '3'
UPDATE skill SET name = 'Spring Boot', skill_version = '3' WHERE name = 'Spring Boot';


-- Delete duplicate experience_skill associations for 'React 19' if 'React' is already associated
DELETE es1 FROM experience_skill es1
JOIN skill s_19 ON s_19.name = 'React 19'
JOIN skill s_base ON s_base.name = 'React'
WHERE es1.skill_id = s_19.id
  AND EXISTS (
      SELECT 1 FROM (SELECT * FROM experience_skill) es2
      WHERE es2.experience_id = es1.experience_id
        AND es2.skill_id = s_base.id
  );

-- Update references from 'React 19' to 'React'
UPDATE experience_skill es
JOIN skill s_19 ON s_19.name = 'React 19'
JOIN skill s_base ON s_base.name = 'React'
SET es.skill_id = s_base.id
WHERE es.skill_id = s_19.id;

-- Delete duplicate 'React 19' skill
DELETE FROM skill WHERE name = 'React 19';

-- Update 'React' version to '19'
UPDATE skill SET name = 'React', skill_version = '19' WHERE name = 'React';


-- Integrate 'Java 21' to 'Java' with version '21'
UPDATE skill SET name = 'Java', skill_version = '21' WHERE name = 'Java 21';

-- Update Node.js version format from '20.x' to '20'
UPDATE skill SET skill_version = '20' WHERE name = 'Node.js';

-- Update TypeScript version format from '5.x' to '5'
UPDATE skill SET skill_version = '5' WHERE name = 'TypeScript';
