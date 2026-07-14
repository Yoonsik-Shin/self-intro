-- Delete duplicate experience_skill associations for 'Spring Boot 3.3' if 'Spring Boot' is already associated
DELETE FROM experience_skill
WHERE skill_id = (SELECT id FROM skill WHERE name = 'Spring Boot 3.3')
  AND experience_id IN (
      SELECT es2.experience_id FROM (SELECT * FROM experience_skill) es2
      WHERE es2.skill_id = (SELECT id FROM skill WHERE name = 'Spring Boot')
  );

-- Update references from 'Spring Boot 3.3' to 'Spring Boot'
UPDATE experience_skill
SET skill_id = (SELECT id FROM skill WHERE name = 'Spring Boot')
WHERE skill_id = (SELECT id FROM skill WHERE name = 'Spring Boot 3.3');

-- Delete the duplicate 'Spring Boot 3.3' skill
DELETE FROM skill WHERE name = 'Spring Boot 3.3';

-- Update 'Spring Boot' version to '3'
UPDATE skill SET name = 'Spring Boot', skill_version = '3' WHERE name = 'Spring Boot';


-- Delete duplicate experience_skill associations for 'React 19' if 'React' is already associated
DELETE FROM experience_skill
WHERE skill_id = (SELECT id FROM skill WHERE name = 'React 19')
  AND experience_id IN (
      SELECT es2.experience_id FROM (SELECT * FROM experience_skill) es2
      WHERE es2.skill_id = (SELECT id FROM skill WHERE name = 'React')
  );

-- Update references from 'React 19' to 'React'
UPDATE experience_skill
SET skill_id = (SELECT id FROM skill WHERE name = 'React')
WHERE skill_id = (SELECT id FROM skill WHERE name = 'React 19');

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
