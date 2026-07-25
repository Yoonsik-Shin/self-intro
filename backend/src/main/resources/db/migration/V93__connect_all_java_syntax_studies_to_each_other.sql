-- V93: Interconnect all 8 Java Coding Test Syntax Studies to each other in study_relation

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- Full Mesh Interconnection of All 8 Java Syntax Studies in study_relation
-- =========================================================================
INSERT INTO study_relation (source_study_id, target_study_id, relation_type)
SELECT s1.id, s2.id, 'PREREQUISITE'
FROM study s1
CROSS JOIN study s2
WHERE s1.slug IN (
    'java-coding-test-01-io-and-types',
    'java-coding-test-02-array-and-string',
    'java-coding-test-03-collections',
    'java-coding-test-04-sorting-and-comparator',
    'java-coding-test-05-stack-queue-priority-queue',
    'java-coding-test-06-math-base-and-bit',
    'java-coding-test-07-templates-and-mistakes',
    'java-coding-test-08-conversions-sorting-and-stream'
)
AND s2.slug IN (
    'java-coding-test-01-io-and-types',
    'java-coding-test-02-array-and-string',
    'java-coding-test-03-collections',
    'java-coding-test-04-sorting-and-comparator',
    'java-coding-test-05-stack-queue-priority-queue',
    'java-coding-test-06-math-base-and-bit',
    'java-coding-test-07-templates-and-mistakes',
    'java-coding-test-08-conversions-sorting-and-stream'
)
AND s1.id <> s2.id
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);
