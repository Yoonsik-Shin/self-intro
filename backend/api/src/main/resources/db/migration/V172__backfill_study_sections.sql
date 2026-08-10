-- Study의 문서 성격(section)과 기술 주제(taxonomy)를 분리한다.
-- 회고 신호를 가장 먼저 적용하고, 명시적인 기초 주제·제목을 Fundamental로 분류한 뒤,
-- 실무 기술 카테고리의 나머지를 Advanced로 분류한다. 모호한 항목은 ETC로 남겨 과잉 분류하지 않는다.
UPDATE `study`
SET `section` = 'RETROSPECT'
WHERE `title` REGEXP '회고|트러블슈팅|장애|실패|원인 분석|포스트모템'
   OR `summary` REGEXP '회고|트러블슈팅|장애 원인|재발 방지';

UPDATE `study` s
SET s.`section` = 'FUNDAMENTAL'
WHERE s.`section` = 'ETC'
  AND (
      s.`title` REGEXP '기초|기본 개념|문법|완전정복|동작 원리|자료구조|알고리즘'
      OR EXISTS (
          SELECT 1
          FROM `study_taxonomy_node` stn
          JOIN `taxonomy_node` tn ON tn.`id` = stn.`taxonomy_node_id`
          WHERE stn.`study_id` = s.`id`
            AND tn.`slug` = 'cs-basics'
      )
  );

UPDATE `study` s
SET s.`section` = 'ADVANCED'
WHERE s.`section` = 'ETC'
  AND EXISTS (
      SELECT 1
      FROM `study_taxonomy_node` stn
      JOIN `taxonomy_node` tn ON tn.`id` = stn.`taxonomy_node_id`
      LEFT JOIN `taxonomy_node` parent ON parent.`id` = tn.`parent_id`
      WHERE stn.`study_id` = s.`id`
        AND COALESCE(parent.`slug`, tn.`slug`) IN
            ('backend', 'devops', 'ai-rag', 'engineering-practices')
  );
