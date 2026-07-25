-- V71: Add 100% Independent Bitmask DP & Dijkstra Algorithm Concept Study (bitmask-dp-dijkstra-algorithm)

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
    '그래프의 특정 서브셋 정점(Subset Vertices)들을 모두 거쳐 목적지까지 이동하는 최단 경로를 구하는 대표적인 결합 기법이다. 대규모 그래프를 주요 경유 정점만으로 추상화(Dijkstra)한 뒤 비트마스크 정수 상태와 동적 계획법(Bitmask DP / TSP)으로 경로를 최적화한다.',
    '# 비트마스크 DP & 다익스트라 (Bitmask DP & Dijkstra) 알고리즘 정리

> 그래프의 필수 경유 정점(Checkpoints)을 모두 거쳐 최종 목적지까지 이동하는 최단 경로를 구하는 알고리즘 결합 기법입니다. 대규모 그래프를 주요 정점만으로 추상화(Dijkstra)한 뒤, 비트마스크 정수 상태와 동적 계획법(Bitmask DP / TSP)을 결합하여 최적 경로를 도출합니다.

---

## 1. 비트마스크 DP & 다익스트라 동작 방식

이 기법은 **2단계 추상화 및 경로 최적화** 방식으로 작동합니다.

```mermaid
graph TD
    subgraph Step1 [1단계: 주요 정점 최단 거리 추상화]
        Start[시작 정점 S] -->|Dijkstra| Dist[between 거리 행렬]
        Subset[K개 필수 경유 정점] -->|K회 Dijkstra| Dist
        End[목적 정점 E] -->|Dijkstra| Dist
    end

    subgraph Step2 [2단계: 비트마스크 DP 경로 최적화]
        Dist --> StateDef[dp mask last 상태 정의]
        StateDef --> BitOps[비트 연산 전이]
        BitOps --> Answer[모든 경유 정점 방문 최소 거리 도출]
    end
```

### 1) 다익스트라 기반 주요 정점 추상화
전체 정점 수 $N$, 간선 수 $M$인 가중치 그래프에서 전체 노드를 한 번에 탐색하면 시간 및 메모리 초과가 발생합니다.
하지만 탐색에 필요한 정점은 **시작 정점($S$)**, **$K$개의 필수 경유 정점**, **목적 정점($E$)** 등 총 $(K + 2)$개의 **주요 정점(Key Vertices)**뿐입니다.

1. 주요 정점 인덱스 배열 `keyNodes[]` 정의 (`0`: 시작 정점, `1~K`: 경유 정점들, `K+1`: 목적 정점)
2. 각 주요 정점을 출발지로 다익스트라 알고리즘을 $(K + 2)$회 실행합니다.
3. 결과를 `between[i][j]` ($i$번째 주요 정점에서 $j$번째 주요 정점까지의 최단 거리) 2차원 배열에 저장합니다.

이 과정으로 $N$개 정점의 복잡한 그래프가 **$(K + 2)$개 노드로 구성된 완전 그래프(Complete Graph)**로 축소됩니다.

### 2) 비트마스크(Bitmask) 방문 상태 표현
$K$개의 경유 정점 방문 여부를 $K$자리 이진수 비트 정수로 표현합니다.

- **`1 << i`**: $i$번째 경유 정점 방문 비트 깃발
- **`(mask & (1 << next)) != 0`**: `mask` 비트 집합에 `next` 정점이 이미 포함되었는지 확인 (AND 연산)
- **`nextMask = mask | (1 << next)`**: `mask` 비트 집합에 `next` 정점 방문을 추가 (OR 연산)
- **`fullMask = (1 << K) - 1`**: $K$개 정점을 모두 방문 완료한 비트 상태 ($0b11...1$)

### 3) 비트마스크 동적 계획법 (Bitmask DP / TSP 응용)
외판원 순회 문제(Traveling Salesperson Problem, TSP)의 DP 상태를 일반화하여 사용합니다.

- **상태 정의**: `dp[mask][last]` $\rightarrow$ 현재 방문한 정점 비트 집합이 `mask`이고 마지막 위치가 `last`번째 경유 정점일 때의 **최소 누적 가중치/거리**.
- **초기값 설정**: `dp[1 << i][i] = between[0][i + 1]` (시작 정점에서 첫 번째 경유 정점 `i`로 이동)
- **점화식**: `dp[mask | (1 << next)][next] = min(dp[mask | (1 << next)][next], dp[mask][last] + between[last + 1][next + 1])`
- **최종 정답 계산**: $\text{Answer} = \min_{0 \le last < K} \left( dp[\text{fullMask}][last] + \text{between}[last + 1][K + 1] \right)$

---

## 2. 언제 사용할까?

문제에서 다음과 같은 조건이 주어지면 이 알고리즘 결합 패턴을 적용합니다.

- 전체 그래프의 정점 수는 크지만 ($N \ge 100,000$), **방문해야 할 필수 경유 정점 수 $K$가 매우 작은 경우** ($K \le 10$)
- 정점 방문 순서가 자유롭고 동일한 정점이나 간선을 여러 번 중복 방문해도 되는 경우
- 특정 정점 부분집합을 반드시 포함해야 하는 조건부 최단 경로 유형

---

## 3. 백준 2098: 외판원 순회 (TSP)

[문제 바로가기](https://www.acmicpc.net/problem/2098)

$N$개의 도시를 모두 거쳐 다시 출발 도시로 돌아오는 최소 비용을 구하는 비트마스크 DP의 대표적 표준 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. `dp[mask][curr]` : 현재 방문한 도시 비트가 `mask`이고 현재 위치가 `curr` 도시일 때 나머지 모든 도시를 방문하고 출발 도시로 돌아가는 최소 비용.
2. 재귀 + 메모이제이션(Top-Down DP) 또는 반복문(Bottom-Up DP)으로 구현합니다.

### Java 표준 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    static final int INF = 1_000_000_000;
    static int n;
    static int[][] w;
    static int[][] dp;

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        n = Integer.parseInt(br.readLine().trim());

        w = new int[n][n];
        for (int i = 0; i < n; i++) {
            StringTokenizer st = new StringTokenizer(br.readLine());
            for (int j = 0; j < n; j++) {
                w[i][j] = Integer.parseInt(st.nextToken());
            }
        }

        dp = new int[n][1 << n];
        for (int[] row : dp) {
            Arrays.fill(row, -1);
        }

        System.out.println(tsp(0, 1));
    }

    static int tsp(int curr, int mask) {
        if (mask == (1 << n) - 1) {
            return w[curr][0] == 0 ? INF : w[curr][0];
        }

        if (dp[curr][mask] != -1) {
            return dp[curr][mask];
        }

        dp[curr][mask] = INF;

        for (int next = 0; next < n; next++) {
            if ((mask & (1 << next)) == 0 && w[curr][next] != 0) {
                int cost = tsp(next, mask | (1 << next)) + w[curr][next];
                dp[curr][mask] = Math.min(dp[curr][mask], cost);
            }
        }

        return dp[curr][mask];
    }
}
```
</details>

---

## 4. 범용 Java 템플릿 코드

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
     * 비트마스크 DP & 다익스트라 범용 최단 경로 해결 메서드
     */
    public static long solve(int n, int k, int startNode, int endNode, int[] keyNodes, List<Edge>[] graph) {
        // 1. 주요 정점 인덱스 배열 매핑 (0: 시작점, 1~K: 경유 정점, K+1: 목적 정점)
        int[] important = new int[k + 2];
        important[0] = startNode;
        important[k + 1] = endNode;
        for (int i = 0; i < k; i++) {
            important[i + 1] = keyNodes[i];
        }

        // 2. (K+2)회 다익스트라 수행하여 between[][] 거리 계산
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

        // 초기 상태: 시작 정점에서 첫 경유 정점으로 이동
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

        // 4. 모든 경유 정점 방문 후 목적지로 가는 최솟값 계산
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

## 5. 자주 하는 실수

1. **`INF` 덧셈 오버플로우**: `Long.MAX_VALUE` 사용 시 DP 덧셈 연산에서 음수로 넘치는 현상 발생. `Long.MAX_VALUE / 4` 할당 권장.
2. **비트 연산 우선순위 괄호 누락**: 자바의 비트 연산자(`&`, `|`)는 비교 연산자(`!=`)보다 우선순위가 낮음. `(mask & (1 << next)) != 0` 연산 시 괄호 필수.
3. **인덱스 오프셋 1 차이 혼동**: `dp[mask][last]`의 `last`는 $0 \sim K-1$ 비트 인덱스이므로, `between` 행렬 조회 시 반드시 **`last + 1`**을 사용해야 함.

---

## 6. 추천 관련 문제

1. [백준 2098 — 외판원 순회 (TSP)](https://www.acmicpc.net/problem/2098) — 비트마스크 DP 기본 교과서 문제
2. [백준 1504 — 특정한 최단 경로](https://www.acmicpc.net/problem/1504) — K=2 경유 정점 다익스트라 응용 문제
3. [현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카](http://localhost:3000/study/autoever-mock-01-required-checkpoints) — 실전 문제 적용 사례

---

## 마무리

비트마스크 DP & 다익스트라 알고리즘의 핵심은 **"거대한 전체 정점을 소수의 주요 정점으로 추상화"**하고, **"경유 정점 방문 상태를 비트 정수로 압축하여 DP로 최적 경로를 찾는 것"**입니다. $K \le 10$ 내외의 경유 조건이 보인다면 이 패턴을 즉시 적용해 보세요.
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
