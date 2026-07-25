-- V94: Remove duplicate legacy FOLLOW_UP relations for Java Syntax studies

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Delete legacy FOLLOW_UP relations between Java syntax studies to prevent UI duplicates
DELETE r FROM study_relation r
JOIN study s1 ON r.source_study_id = s1.id
JOIN study s2 ON r.target_study_id = s2.id
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
AND r.relation_type = 'FOLLOW_UP';
