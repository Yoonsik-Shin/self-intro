-- docs/inflearn-course-catalog.md의 "비고" 컬럼에 있던 선수과목/중복 관계를
-- 실제 learning_resource_relation 데이터로 반영한다(slug 기반 매칭이라 순서 무관하게 안전).

-- PREREQUISITE (선수과목)
INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = 'n000번-면접을-본-기술이사-면접-가이드' AND t.slug = '10000장의-이력서를-본-기술이사의';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '그림으로-쉽게-자료구조-알고리즘-심화' AND t.slug = '자료구조-알고리즘-기본';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '스프링부트로-직접-만들면서-배우는-대' AND t.slug = '스프링부트로-대규모-시스템설계-게시판';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = 'the-era-of-ai-clicki' AND t.slug = 'the-era-of-ai-shortc';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = 'the-era-of-ai-clicks' AND t.slug = 'the-era-of-ai-clicki';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = 'nodejs-and-cs-part-4' AND t.slug = 'the-era-of-ai-clicks';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = 'real-mysql-part-2' AND t.slug = 'real-mysql-part-1';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = 'amazon-eks-확장판' AND t.slug = 'amazon-eks-기본-강의';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '아파치-카프카-애플리케이션-프로그래밍' AND t.slug = 'practical-kafka-gett-1';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = 'redis-야무지게-사용하는법-실습편' AND t.slug = 'redis-야무지게-사용하는-방법-이론편';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '함수형_ES6_응용편' AND t.slug = 'functional-es6';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '실무적용-프런트엔드-테스트-2부' AND t.slug = '실무적용-프런트엔드-테스트-1부';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'PREREQUISITE', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '백엔드-애플리케이션-성능개선-기초편' AND t.slug = '백엔드-애플리케이션-성능-테스트';

-- OVERLAPS (내용 중복)
INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '비전공자-개발자-이력서' AND t.slug = '10000장의-이력서를-본-기술이사의';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '데이터베이스-비전공자-면접' AND t.slug = 'cs-interview-prepara-1';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '자바와-객체-지향-궁극의-면접-대비' AND t.slug = 'cs-interview-prepara';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '만들면서-배우는-컴퓨터-구조' AND t.slug = '혼자-공부하는-컴퓨터구조-운영체제';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '비전공자-운영체제' AND t.slug = '혼자-공부하는-컴퓨터구조-운영체제';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = 'mysql-성능-최적화' AND t.slug = '비전공자-mysql-성능최정확-sql튜닝';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '데이터-mysql-마이그레이션' AND t.slug = '비전공자-mysql-성능최정확-sql튜닝';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '대용량-채팅-서버-처리-웹소켓-통신-2' AND t.slug = '대용량-채팅-서버-처리-웹소켓-통신';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '설-특집-초당-500000건-트래픽을' AND t.slug = '2026-a-practical-gui';

INSERT INTO `learning_resource_relation` (`source_resource_id`, `target_resource_id`, `relation_type`, `display_order`)
SELECT s.id, t.id, 'OVERLAPS', 0 FROM `learning_resource` s, `learning_resource` t
WHERE s.slug = '성능-개선-초석-다지기' AND t.slug = '백엔드-애플리케이션-성능개선-기초편';
