-- V75: Add tags, bi-directional study relations, and skill mappings for concept studies and mock problems

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1. Insert any missing tags into tag table
INSERT IGNORE INTO tag (name, slug) VALUES
('Topological Sort', 'topological-sort'),
('구간 스케줄링', 'interval-scheduling'),
('위상정렬', 'topological-sort-kr');

-- 2. Insert study_tag mappings for Concept Studies and Mock Problems
INSERT INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM (
    -- Concept Study 1: bitmask-dp-dijkstra-algorithm
    SELECT 'bitmask-dp-dijkstra-algorithm' AS study_slug, '비트마스크 DP' AS tag_name UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm', '다익스트라' UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm', '최단 경로' UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm', '동적 계획법' UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm', '알고리즘' UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm', 'Java' UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm', '코딩테스트' UNION ALL

    -- Concept Study 2: topological-sort-algorithm
    SELECT 'topological-sort-algorithm', '위상정렬' UNION ALL
    SELECT 'topological-sort-algorithm', 'Topological Sort' UNION ALL
    SELECT 'topological-sort-algorithm', '그래프 탐색' UNION ALL
    SELECT 'topological-sort-algorithm', 'Queue' UNION ALL
    SELECT 'topological-sort-algorithm', 'PriorityQueue' UNION ALL
    SELECT 'topological-sort-algorithm', '알고리즘' UNION ALL
    SELECT 'topological-sort-algorithm', 'Java' UNION ALL
    SELECT 'topological-sort-algorithm', '코딩테스트' UNION ALL

    -- Concept Study 3: weighted-interval-scheduling-algorithm
    SELECT 'weighted-interval-scheduling-algorithm', '구간 스케줄링' UNION ALL
    SELECT 'weighted-interval-scheduling-algorithm', '이분 탐색' UNION ALL
    SELECT 'weighted-interval-scheduling-algorithm', '동적 계획법' UNION ALL
    SELECT 'weighted-interval-scheduling-algorithm', '정렬' UNION ALL
    SELECT 'weighted-interval-scheduling-algorithm', '알고리즘' UNION ALL
    SELECT 'weighted-interval-scheduling-algorithm', 'Java' UNION ALL
    SELECT 'weighted-interval-scheduling-algorithm', '코딩테스트' UNION ALL

    -- Concept Study 4: zero-one-bfs-algorithm
    SELECT 'zero-one-bfs-algorithm', '0-1 BFS' UNION ALL
    SELECT 'zero-one-bfs-algorithm', 'BFS' UNION ALL
    SELECT 'zero-one-bfs-algorithm', 'Deque' UNION ALL
    SELECT 'zero-one-bfs-algorithm', '최단 경로' UNION ALL
    SELECT 'zero-one-bfs-algorithm', '그래프 탐색' UNION ALL
    SELECT 'zero-one-bfs-algorithm', '메모리 최적화' UNION ALL
    SELECT 'zero-one-bfs-algorithm', '알고리즘' UNION ALL
    SELECT 'zero-one-bfs-algorithm', 'Java' UNION ALL
    SELECT 'zero-one-bfs-algorithm', '코딩테스트' UNION ALL

    -- Mock 1
    SELECT 'autoever-mock-01-required-checkpoints', '현대오토에버' UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints', '모의문제' UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints', '비트마스크 DP' UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints', '다익스트라' UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints', 'Java' UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints', '코딩테스트' UNION ALL

    -- Mock 2
    SELECT 'autoever-mock-02-deployment-orders', '현대오토에버' UNION ALL
    SELECT 'autoever-mock-02-deployment-orders', '모의문제' UNION ALL
    SELECT 'autoever-mock-02-deployment-orders', '위상정렬' UNION ALL
    SELECT 'autoever-mock-02-deployment-orders', 'PriorityQueue' UNION ALL
    SELECT 'autoever-mock-02-deployment-orders', 'Java' UNION ALL
    SELECT 'autoever-mock-02-deployment-orders', '코딩테스트' UNION ALL

    -- Mock 3
    SELECT 'autoever-mock-03-maintenance-schedule', '현대오토에버' UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule', '모의문제' UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule', '구간 스케줄링' UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule', '이분 탐색' UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule', '동적 계획법' UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule', 'Java' UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule', '코딩테스트' UNION ALL

    -- Mock 4
    SELECT 'autoever-mock-04-minimum-steering', '현대오토에버' UNION ALL
    SELECT 'autoever-mock-04-minimum-steering', '모의문제' UNION ALL
    SELECT 'autoever-mock-04-minimum-steering', '0-1 BFS' UNION ALL
    SELECT 'autoever-mock-04-minimum-steering', 'Deque' UNION ALL
    SELECT 'autoever-mock-04-minimum-steering', '메모리 최적화' UNION ALL
    SELECT 'autoever-mock-04-minimum-steering', 'Java' UNION ALL
    SELECT 'autoever-mock-04-minimum-steering', '코딩테스트'
) mapping
JOIN study s ON s.slug = mapping.study_slug
JOIN tag t ON t.name = mapping.tag_name
ON DUPLICATE KEY UPDATE study_id = VALUES(study_id);


-- 3. Bi-directional study_relation links between Mock Problems and Concept Studies
INSERT INTO study_relation (source_study_id, target_study_id, relation_type, display_order)
SELECT s1.id, s2.id, 'PREREQUISITE', 0
FROM study s1, study s2
WHERE (s1.slug = 'bitmask-dp-dijkstra-algorithm' AND s2.slug = 'autoever-mock-01-required-checkpoints')
   OR (s1.slug = 'topological-sort-algorithm' AND s2.slug = 'autoever-mock-02-deployment-orders')
   OR (s1.slug = 'weighted-interval-scheduling-algorithm' AND s2.slug = 'autoever-mock-03-maintenance-schedule')
   OR (s1.slug = 'zero-one-bfs-algorithm' AND s2.slug = 'autoever-mock-04-minimum-steering')
   OR (s1.slug = 'bitmask-dp-dijkstra-algorithm' AND s2.slug = 'zero-one-bfs-algorithm')
   OR (s1.slug = 'zero-one-bfs-algorithm' AND s2.slug = 'bitmask-dp-dijkstra-algorithm')
   OR (s1.slug = 'topological-sort-algorithm' AND s2.slug = 'weighted-interval-scheduling-algorithm')
   OR (s1.slug = 'weighted-interval-scheduling-algorithm' AND s2.slug = 'topological-sort-algorithm')
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);


-- 4. Link Java skill (id = 1) to concept studies and mock problems
INSERT INTO study_skill (study_id, skill_id)
SELECT s.id, 1
FROM study s
WHERE s.slug IN (
    'bitmask-dp-dijkstra-algorithm',
    'topological-sort-algorithm',
    'weighted-interval-scheduling-algorithm',
    'zero-one-bfs-algorithm',
    'autoever-mock-01-required-checkpoints',
    'autoever-mock-02-deployment-orders',
    'autoever-mock-03-maintenance-schedule',
    'autoever-mock-04-minimum-steering'
)
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);
