-- V71: Add Pure Bitmask DP & Dijkstra Algorithm Concept Study (bitmask-dp-dijkstra-algorithm)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ensure 'education' category exists
INSERT IGNORE INTO study_category (name, slug, display_order)
VALUES ('공부/학습', 'education', 2);

SET @education_category_id = (
    SELECT id FROM study_category WHERE slug = 'education' OR name = '공부/학습' LIMIT 1
);

INSERT INTO study (
    slug,
    title,
    summary,
    content_markdown,
    status,
    category_id,
    learned_at,
    published_at,
    created_at,
    updated_at
) VALUES (
    'bitmask-dp-dijkstra-algorithm',
    '비트마스크 DP & 다익스트라 (Bitmask DP & Dijkstra) 알고리즘 정리',
    '그래프의 특정 필수 경유지(Checkpoints)를 모두 방문하는 최단 거리를 탐색하는 대표적인 고난도 알고리즘 결합 기법이다. 대규모 그래프를 중요 지점만으로 축소(Dijkstra)한 뒤 비트마스크(Bitmask) 정수 상태와 동적 계획법(DP)으로 경로를 최적화한다.',
    '# 비트마스크 DP & 다익스트라 (Bitmask DP & Dijkstra) 알고리즘 정리

> 그래프의 필수 경유지(Checkpoints)를 모두 거쳐 최종 목적지까지 이동하는 최단 거리를 구하는 알고리즘 결합 기법입니다. 대규모 그래프를 중요 지점만으로 추상화(Dijkstra)한 뒤, 비트마스크 정수 상태와 동적 계획법(Bitmask DP / TSP)을 결합하여 최적 경로를 도출합니다.

---

## 1. 동작 방식 (Operating Principle)

이 기법은 **2단계 축소 및 최적화** 전략으로 작동합니다.

```mermaid
graph TD
    subgraph Step1 [1단계: 중요 지점 최단 거리 추상화]
        Start[출발점 S] -->|Dijkstra| Dist[between 거리 행렬]
        Checkpoints[K개 필수 경유지] -->|K회 Dijkstra| Dist
        End[도착점 E] -->|Dijkstra| Dist
    end

    subgraph Step2 [2단계: 비트마스크 DP 경로 최적화]
        Dist --> StateDef[dp mask last 상태 정의]
        StateDef --> ShiftOps[비트 연산 전이]
        ShiftOps --> Answer[모든 경유지 방문 최소 거리 도출]
    end
```

### 1) 다익스트라 기반 중요 지점 추상화
전체 정점 수 $N$, 간선 수 $M$인 거대한 그래프 전체를 한 번에 탐색하면 시간과 메모리 초과가 발생합니다.
그러나 실제 경로 결정에 영향을 주는 핵심 노드는 **출발점($S$)**, **$K$개의 필수 경유지**, **도착점($E$)**이라는 총 $(K + 2)$개의 **중요 지점(Important Nodes)**뿐입니다.

1. 중요 지점 인덱스 배열 `important[]` 매핑 (`0`: 출발점, `1~K`: 경유지들, `K+1`: 도착점)
2. 중요 지점 각각을 시작점으로 다익스트라 최단 거리 알고리즘을 $(K + 2)$번 수행합니다.
3. 수행 결과를 `between[i][j]` (중요 지점 $i$에서 $j$까지의 최단 거리) 2차원 배열에 저장합니다.

이 과정으로 $N$개 정점의 복잡한 그래프가 **$(K + 2)$개 노드로 구성된 완전 그래프(Complete Graph)**로 단순화됩니다.

### 2) 비트마스크(Bitmask) 방문 상태 표현
$K$개의 경유지 방문 여부를 $K$자리 이진수 비트 정수로 압축 관리합니다.

- **`1 << i`**: $i$번째 경유지의 비트 깃발
- **`(mask & (1 << next)) != 0`**: `mask` 상태에 `next` 경유지가 이미 포함되어 있는지 확인 (AND 연산)
- **`nextMask = mask | (1 << next)`**: `mask` 상태에 `next` 경유지 방문을 추가 (OR 연산)
- **`fullMask = (1 << K) - 1`**: $K$개 경유지를 모두 방문 완료한 깃발 상태 ($0b11...1$)

### 3) 비트마스크 동적 계획법 (Bitmask DP / TSP 응용)
외판원 순회 문제(Traveling Salesperson Problem, TSP)의 DP 상태 정의를 그대로 응용합니다.

- **상태 정의**: `dp[mask][last]` $\rightarrow$ 현재까지 방문한 경유지 비트 집합이 `mask`이고 마지막 위치가 `last`번째 경유지일 때의 **최소 이동 소요 값**.
- **초기값 설정**: `dp[1 << i][i] = between[0][i + 1]` (출발지에서 첫 번째 경유지 `i`로 이동)
- **상태 전이 점화식**: `dp[mask | (1 << next)][next] = min(dp[mask | (1 << next)][next], dp[mask][last] + between[last + 1][next + 1])`
- **최종 정답 계산**: $\text{Answer} = \min_{0 \le last < K} \left( dp[\text{fullMask}][last] + \text{between}[last + 1][K + 1] \right)$

---

## 2. 언제 사용할까? (Use Cases)

다음과 같은 문제 조건이 주어지면 이 조합을 우선 검토해야 합니다.

- 그래프의 전체 크기는 매우 크지만 ($N \ge 100,000$), **필수 경유지 수 $K$가 매우 작은 경우** ($K \le 10$)
- 경유지를 방문하는 순서가 자유롭고, 동일한 정점이나 도로를 여러 번 지나치는 것이 허용되는 경우
- 특정 정점들을 반드시 거쳐야만 하는 조건부 최단 경로 유형

---

## 3. 일반화된 Java 표준 템플릿 코드 (Generic Java Template)

```java
import java.util.*;

public class BitmaskDijkstraTemplate {
    static final long INF = Long.MAX_VALUE / 4;

    static class Edge {
        int to;
        int weight;

        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    static class State implements Comparable<State> {
        int node;
        long distance;

        State(int node, long distance) {
            this.node = node;
            this.distance = distance;
        }

        @Override
        public int compareTo(State other) {
            return Long.compare(this.distance, other.distance);
        }
    }

    /**
     * 비트마스크 DP & 다익스트라 범용 최단 경로 해결 함수
     */
    public static long solve(int n, int k, int startNode, int endNode, int[] checkpoints, List<Edge>[] graph) {
        // 1. 중요 지점 인덱스 배열 매핑 (0: 출발, 1~K: 경유지, K+1: 도착)
        int[] important = new int[k + 2];
        important[0] = startNode;
        important[k + 1] = endNode;
        for (int i = 0; i < k; i++) {
            important[i + 1] = checkpoints[i];
        }

        // 2. (K+2)회 다익스트라 수행하여 between[][] 거리를 계산
        long[][] between = new long[k + 2][k + 2];
        for (int i = 0; i < k + 2; i++) {
            long[] dist = dijkstra(important[i], n, graph);
            for (int j = 0; j < k + 2; j++) {
                between[i][j] = dist[important[j]];
            }
        }

        // 3. 비트마스크 DP 수행
        int fullMask = (1 << k) - 1;
        long[][] dp = new long[1 << k][k];
        for (long[] row : dp) {
            Arrays.fill(row, INF);
        }

        // 초기 상태: 출발지에서 첫 경유지로 이동
        for (int i = 0; i < k; i++) {
            dp[1 << i][i] = between[0][i + 1];
        }

        // DP 전이 루프
        for (int mask = 1; mask <= fullMask; mask++) {
            for (int last = 0; last < k; last++) {
                if (dp[mask][last] >= INF) continue;

                for (int next = 0; next < k; next++) {
                    if ((mask & (1 << next)) != 0) continue;

                    int nextMask = mask | (1 << next);
                    long candidate = dp[mask][last] + between[last + 1][next + 1];
                    dp[nextMask][next] = Math.min(dp[nextMask][next], candidate);
                }
            }
        }

        // 4. 모든 경유지 방문 후 도착지로 가는 최댓값/최솟값 선택
        long answer = INF;
        for (int last = 0; last < k; last++) {
            if (dp[fullMask][last] < INF && between[last + 1][k + 1] < INF) {
                answer = Math.min(answer, dp[fullMask][last] + between[last + 1][k + 1]);
            }
        }

        return answer >= INF ? -1 : answer;
    }

    private static long[] dijkstra(int start, int n, List<Edge>[] graph) {
        long[] distance = new long[n + 1];
        Arrays.fill(distance, INF);
        PriorityQueue<State> pq = new PriorityQueue<>();

        distance[start] = 0;
        pq.offer(new State(start, 0));

        while (!pq.isEmpty()) {
            State cur = pq.poll();
            if (cur.distance != distance[cur.node]) continue;

            for (Edge edge : graph[cur.node]) {
                long nextDist = cur.distance + edge.weight;
                if (nextDist < distance[edge.to]) {
                    distance[edge.to] = nextDist;
                    pq.offer(new State(edge.to, nextDist));
                }
            }
        }

        return distance;
    }
}
```

---

## 4. 자주 하는 실수 체크리스트 (Mistakes Checklist)

> [!WARNING]
> 실전 구현 시 오답의 원인이 되는 주요 실수 패턴입니다.

1. **`INF` 덧셈 오버플로우**: `Long.MAX_VALUE` 사용 시 DP 덧셈 연산에서 음수로 넘치는 현상 발생. `Long.MAX_VALUE / 4` 할당 권장.
2. **비트 연산 우선순위 괄호 누락**: 자바의 비트 연산자(`&`, `|`)는 비교 연산자(`!=`)보다 우선순위가 낮음. `(mask & (1 << next)) != 0` 연산 시 괄호 필수.
3. **인덱스 오프셋 1 차이 혼동**: `dp[mask][last]`의 `last`는 $0 \sim K-1$ 비트 인덱스이므로, `between` 행렬 조회 시 반드시 **`last + 1`**을 사용해야 함.

---

## 5. 추천 관련 문제 (Recommended Problems)

1. [백준 2098 — 외판원 순회 (TSP)](https://www.acmicpc.net/problem/2098) : 비트마스크 DP 기본 교과서 문제
2. [백준 1504 — 특정한 최단 경로](https://www.acmicpc.net/problem/1504) : K=2 경유지 다익스트라 응용 문제
3. [현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카](http://localhost:3000/study/autoever-mock-01-required-checkpoints) : 실전 문제 풀이 적용 사례
',
    'PUBLISHED',
    @education_category_id,
    '2026-07-25',
    NOW(),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    summary = VALUES(summary),
    content_markdown = VALUES(content_markdown),
    status = VALUES(status),
    updated_at = NOW();

-- Insert tags for bitmask-dp-dijkstra-algorithm
INSERT INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM (
    SELECT 'bitmask-dp-dijkstra-algorithm' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm' AS study_slug, '알고리즘' AS tag_name
    UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm' AS study_slug, '다익스트라' AS tag_name
    UNION ALL
    SELECT 'bitmask-dp-dijkstra-algorithm' AS study_slug, '비트마스크 DP' AS tag_name
) mapping
JOIN study s ON s.slug = mapping.study_slug
JOIN tag t ON t.name = mapping.tag_name
ON DUPLICATE KEY UPDATE study_id = VALUES(study_id);

-- Insert study relation between autoever-mock-01 and bitmask-dp-dijkstra-algorithm
INSERT INTO study_relation (
    source_study_id, target_study_id, relation_type, display_order
)
SELECT source_study.id, target_study.id, 'FOLLOW_UP', 0
FROM study source_study, study target_study
WHERE source_study.slug = 'autoever-mock-01-required-checkpoints'
  AND target_study.slug = 'bitmask-dp-dijkstra-algorithm'
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);
