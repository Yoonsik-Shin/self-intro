-- V76: Atomize algorithm concept studies into pure single-purpose atomic notes (Dijkstra, Bitmask, Bitmask DP)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ensure 'education' category exists
INSERT IGNORE INTO study_category (name, slug, display_order)
VALUES ('공부/학습', 'education', 2);

SET @education_category_id = (
    SELECT id FROM study_category WHERE slug = 'education' OR name = '공부/학습' LIMIT 1
);

-- =========================================================================
-- 1. Update Study 35 to Pure "비트마스크 DP (Bitmask DP) 알고리즘 정리"
-- =========================================================================
UPDATE study
SET slug = 'bitmask-dp-algorithm',
    title = '비트마스크 DP (Bitmask DP / TSP) 알고리즘 정리',
    summary = '비트 정수로 방문 상태를 표현하고 동적 계획법(DP)으로 최적 경로 및 선택을 탐색하는 상태 압축 DP 기법이다. 외판원 순회(TSP) 등 K <= 16 이하의 소규모 집합 순서 최적화에 사용된다.',
    content_markdown = '# 비트마스크 DP (Bitmask DP / TSP) 알고리즘 정리

> 비트 정수(Bitmask)로 정점 방문 상태나 부분집합 선택 상태를 압축 표현하고, 동적 계획법(Dynamic Programming)을 통해 최소 비용/최단 경로를 도출하는 상태 공간 압축 DP 기법입니다.

---

## 1. 비트마스크 DP 동작 방식

비트마스크 DP는 **비트 정수 상태 표현 + DP 상태 전이**로 작동합니다.

```mermaid
graph TD
    A[비트 정수로 방문 상태 mask 표현] --> B[상태 정의 dp mask curr : 현재 상태 mask, 현재 위치 curr일 때의 최소 비용]
    B --> C[초기 상태 설정 및 기저 조건 지정]
    C --> D[다음 미방문 정점 next 탐색 mask & 1 << next == 0]
    D --> E[상태 전이 점화식 dp nextMask next = min dp nextMask next, dp mask curr + cost curr next]
    E --> F[모든 정점 방문 완료 비트 fullMask 도출]
```

### 1) 핵심 개념
- **상태 공간 압축**: $K$개의 원소 방문 여부를 배열 `boolean[]` 대신 하나의 $K$비트 정수로 관리합니다.
- **DP 상태 정의**: `dp[mask][curr]` $\rightarrow$ 현재 방문 집합 상태가 `mask`이고 마지막으로 방문한 정점이 `curr`일 때, 남아있는 모든 정점을 방문하는 **최소 누적 비용/거리**.

### 2) 상태 전이 점화식
$$\text{dp}[\text{mask} \mid (1 \ll \text{next})][\text{next}] = \min(\text{dp}[\text{mask} \mid (1 \ll \text{next})][\text{next}], \; \text{dp}[\text{mask}][\text{curr}] + \text{cost}[\text{curr}][\text{next}])$$

---

## 2. 언제 사용할까?

- 방문해야 하는 대상의 수 $K$가 매우 작은 경우 ($K \le 16$)
- 방문 순서에 따라 비용이 달라지며, 이미 방문한 집합 상태를 재활용(Memoization)할 수 있을 때
- 외판원 순회 문제(TSP, Traveling Salesperson Problem) 및 조건부 집합 선택 문제

---

## 3. 백준 2098: 외판원 순회 (TSP)

[문제 바로가기](https://www.acmicpc.net/problem/2098)

$N$개의 도시를 모두 방문하고 다시 출발 도시로 돌아오는 최소 비용을 구하는 비트마스크 DP의 대표적 교과서 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. `tsp(curr, mask)` : 현재 도시가 `curr`이고 방문 집합이 `mask`일 때 나머지 도시를 방문하고 0번 도시로 돌아가는 최소 비용.
2. `mask == (1 << n) - 1` 달성 시 출발점 0으로 돌아가는 간선 비용을 반환합니다.

### Java 코드
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

public class BitmaskDPTemplate {
    static final int INF = 1_000_000_000;

    /**
     * 비트마스크 DP / TSP 탑다운 메모이제이션 템플릿
     */
    public static int solveTSP(int n, int[][] cost) {
        int[][] dp = new int[n][1 << n];
        for (int[] row : dp) {
            Arrays.fill(row, -1);
        }
        return tsp(0, 1, n, cost, dp);
    }

    private static int tsp(int curr, int mask, int n, int[][] cost, int[][] dp) {
        if (mask == (1 << n) - 1) {
            return cost[curr][0] == 0 ? INF : cost[curr][0];
        }

        if (dp[curr][mask] != -1) {
            return dp[curr][mask];
        }

        dp[curr][mask] = INF;

        for (int next = 0; next < n; next++) {
            if ((mask & (1 << next)) == 0 && cost[curr][next] != 0) {
                int nextCost = tsp(next, mask | (1 << next), n, cost, dp) + cost[curr][next];
                dp[curr][mask] = Math.min(dp[curr][mask], nextCost);
            }
        }

        return dp[curr][mask];
    }
}
```

---

## 5. 자주 하는 실수

1. **`INF` 오버플로우**: DP 덧셈 시 `Integer.MAX_VALUE`를 쓰면 오버플로우 발생. `1_000_000_000` 사용.
2. **비트 연산자 괄호 필수**: `(mask & (1 << next)) == 0` 처럼 `&` 연산에 괄호 누락 시 비교 연산자가 먼저 실행되어 오답.
3. **DP 배열 미초기화**: `-1`로 초기화하여 방문 미완료 상태와 불가능 상태(`INF`)를 구분해야 시간 초과 방지.

---

## 6. 추천 관련 문제

1. [백준 2098 — 외판원 순회 (TSP)](https://www.acmicpc.net/problem/2098) — 비트마스크 DP 기본
2. [백준 1311 — 할 일 정하기 1](https://www.acmicpc.net/problem/1311) — 비트마스크 DP 할당 문제
3. [현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카](http://localhost:3000/study/autoever-mock-01-required-checkpoints) — 다익스트라 결합 응용 문제
',
    status = 'PUBLISHED',
    updated_at = NOW()
WHERE slug = 'bitmask-dp-dijkstra-algorithm' OR id = 35;


-- =========================================================================
-- 2. Insert Pure "다익스트라 (Dijkstra) 알고리즘 정리" (dijkstra-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'dijkstra-algorithm',
    '다익스트라 (Dijkstra) 알고리즘 정리',
    '음수 가중치가 없는 그래프에서 단일 출발지(Single Source) 최단 경로를 구하는 그리디 알고리즘이다. 우선순위 큐(PriorityQueue/Min-Heap)를 사용해 O((V+E)log V) 시간에 최단 거리를 탐색한다.',
    '# 다익스트라 (Dijkstra) 알고리즘 정리

> 가중치 그래프에서 음수 간선이 없을 때, 특정 출발 정점으로부터 모든 다른 정점까지의 최단 경로를 탐색하는 대표적인 최단 경로(Shortest Path) 알고리즘입니다.

---

## 1. 다익스트라 동작 방식

다익스트라는 **그리디(Greedy) 선택 + 최단 거리 갱신(Relaxation)**으로 작동합니다.

```mermaid
graph TD
    A[출발지 dist 0 지정 및 PriorityQueue에 삽입] --> B[PriorityQueue에서 최단 거리가 가장 작은 정점 u를 꺼냄]
    B --> C{u의 거리 값이 현재 dist u와 같은가?}
    C -- 아니오 낡은 데이터 --> B
    C -- 예 유효 데이터 --> D[u의 이웃 정점 v로의 간선 탐색]
    D --> E{dist u + weight < dist v 인가?}
    E -- 예 갱신 --> F[dist v = dist u + weight 갱신 후 PriorityQueue에 삽입]
    E -- 아니오 --> G{PriorityQueue가 비어있는가?}
    F --> G
    G -- 아니오 --> B
    G -- 예 --> H[모든 정점 최단 거리 탐색 완료]
```

### 1) 핵심 개념
- **그리디 선택**: 매 순간 아직 방문하지 않은 정점 중 출발지로부터의 최단 거리가 가장 짧은 정점을 우선 선택합니다.
- **최단 거리 갱신 (Relaxation)**: 정점 $u$를 거쳐 정점 $v$로 가는 거리($\text{dist}[u] + \text{weight}$)가 기존 $\text{dist}[v]$보다 짧다면 최단 거리를 갱신합니다.

### 2) 시간복잡도
- 최소 힙(PriorityQueue) 기반 탐색: **$O((V + E) \log V)$**

---

## 2. 언제 사용할까?

- 간선의 가중치가 모두 **양수(0 이상)**일 때 단일 출발지 최단 경로를 구할 때
- 특정 중요 지점들 사이의 최단 거리 행렬(`between[][]`)을 구축해야 할 때
- 최소 이동 시간, 최소 연료 소비량, 최소 경로 비용 문제

---

## 3. 백준 1753: 최단경로

[문제 바로가기](https://www.acmicpc.net/problem/1753)

방향 그래프에서 주어진 출발 정점에서 다른 모든 정점으로의 최단 경로를 구하는 다익스트라의 정석 교과서 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. 인접 리스트 `graph[]`와 최단 거리 배열 `dist[]`를 `INF`로 초기화합니다.
2. 우선순위 큐(Min-Heap)를 생성하고 출발 정점 `(start, 0)`을 추가합니다.
3. 큐에서 정점을 꺼내어 최단 거리를 갱신하고 결과를 출력합니다.

### Java 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    static final int INF = Integer.MAX_VALUE / 4;

    static class Edge implements Comparable<Edge> {
        int to, weight;
        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
        @Override
        public int compareTo(Edge o) {
            return Integer.compare(this.weight, o.weight);
        }
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int v = Integer.parseInt(st.nextToken());
        int e = Integer.parseInt(st.nextToken());
        int start = Integer.parseInt(br.readLine().trim());

        List<Edge>[] graph = new ArrayList[v + 1];
        for (int i = 1; i <= v; i++) {
            graph[i] = new ArrayList<>();
        }

        for (int i = 0; i < e; i++) {
            st = new StringTokenizer(br.readLine());
            int from = Integer.parseInt(st.nextToken());
            int to = Integer.parseInt(st.nextToken());
            int w = Integer.parseInt(st.nextToken());
            graph[from].add(new Edge(to, w));
        }

        int[] dist = new int[v + 1];
        Arrays.fill(dist, INF);

        PriorityQueue<Edge> pq = new PriorityQueue<>();
        dist[start] = 0;
        pq.offer(new Edge(start, 0));

        while (!pq.isEmpty()) {
            Edge cur = pq.poll();
            if (cur.weight != dist[cur.to]) continue;

            for (Edge next : graph[cur.to]) {
                if (dist[next.to] > dist[cur.to] + next.weight) {
                    dist[next.to] = dist[cur.to] + next.weight;
                    pq.offer(new Edge(next.to, dist[next.to]));
                }
            }
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= v; i++) {
            if (dist[i] == INF) sb.append("INF\n");
            else sb.append(dist[i]).append("\n");
        }
        System.out.print(sb);
    }
}
```
</details>

---

## 4. 범용 Java 템플릿 코드

```java
import java.util.*;

public class DijkstraTemplate {
    static final long INF = Long.MAX_VALUE / 4;

    public static class Edge {
        public int to;
        public long weight;
        public Edge(int to, long weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    public static class NodeState implements Comparable<NodeState> {
        public int node;
        public long distance;
        public NodeState(int node, long distance) {
            this.node = node;
            this.distance = distance;
        }
        @Override
        public int compareTo(NodeState o) {
            return Long.compare(this.distance, o.distance);
        }
    }

    /**
     * 다익스트라 최단 경로 탐색 범용 메서드
     */
    public static long[] dijkstra(int start, int v, List<Edge>[] graph) {
        long[] dist = new long[v + 1];
        Arrays.fill(dist, INF);

        PriorityQueue<NodeState> pq = new PriorityQueue<>();
        dist[start] = 0;
        pq.offer(new NodeState(start, 0));

        while (!pq.isEmpty()) {
            NodeState cur = pq.poll();
            if (cur.distance != dist[cur.node]) continue;

            for (Edge edge : graph[cur.node]) {
                if (dist[edge.to] > cur.distance + edge.weight) {
                    dist[edge.to] = cur.distance + edge.weight;
                    pq.offer(new NodeState(edge.to, dist[edge.to]));
                }
            }
        }

        return dist;
    }
}
```

---

## 5. 자주 하는 실수

1. **음수 가중치 간선 존재**: 다익스트라는 그리디하게 확정된 최단 거리를 뒤집지 않으므로 음수 간선이 있으면 벨만-포드(Bellman-Ford)나 SPFA를 사용해야 함.
2. **낡은 탐색 중복 스킵 구문 누락**: `if (cur.distance != dist[cur.node]) continue;` 미작성 시 시간 초과(TLE) 발생.
3. **가중치 덧셈 오버플로우**: `INF`를 `Long.MAX_VALUE`로 하면 덧셈 시 음수로 넘침. `Long.MAX_VALUE / 4` 사용.

---

## 6. 추천 관련 문제

1. [백준 1753 — 최단경로](https://www.acmicpc.net/problem/1753) — 다익스트라 기본
2. [백준 1916 — 최소비용 구하기](https://www.acmicpc.net/problem/1916) — 목적지 최단 경로
3. [현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카](http://localhost:3000/study/autoever-mock-01-required-checkpoints) — 다익스트라 응용 문제
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- 3. Insert Pure "비트마스크 (Bitmask) & 비트 연산 정리" (bitmask-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'bitmask-algorithm',
    '비트마스크 (Bitmask) & 비트 연산 정리',
    '정수의 이진수 비트(0과 1)를 활용해 소규모 집합(Set)을 표현하고, 비트 연산자(&, |, ~, ^, <<, >>)로 집합 연산을 O(1)에 빠르게 수행하는 메모리 및 속도 최적화 기법이다.',
    '# 비트마스크 (Bitmask) & 비트 연산 정리

> 정수의 이진수 비트 표현(Binary Representation)을 활용하여 소규모 부분집합(Set)을 효율적으로 표현하고, 비트 연산자만으로 초고속 $O(1)$ 집합 연산을 수행하는 대표적인 테크닉입니다.

---

## 1. 비트마스크 동작 방식 & 핵심 비트 연산자

정수 하나를 $N$개 요소의 포함 여부를 나타내는 깃발(Flag Set)로 사용합니다.

```text
비트 표현 예시 (원소 {0, 2, 3}이 포함된 상태):
Index: 7 6 5 4 3 2 1 0
Bit  : 0 0 0 0 1 1 0 1  (이진수 0b00001101 = 십진수 13)
```

### 필수 비트 연산 공식표
| 집합 연산 기능 | 비트 연산식 | 설명 |
| :--- | :--- | :--- |
| **i번째 원소 추가 (Add/Set)** | `mask | (1 << i)` | $i$번째 비트를 1로 켬 |
| **i번째 원소 삭제 (Remove/Clear)** | `mask & ~(1 << i)` | $i$번째 비트를 0으로 끔 |
| **i번째 원소 존재 확인 (Check)** | `(mask & (1 << i)) != 0` | $i$번째 비트가 1인지 확인 |
| **i번째 원소 토글 (Toggle)** | `mask ^ (1 << i)` | $i$번째 비트를 반전 (0$\leftrightarrow$1) |
| **K개 전체 원소 포함 (Full Set)** | `(1 << K) - 1` | $0 \sim K-1$ 비트가 모두 1인 상태 |
| **모든 원소 제거 (Empty Set)** | `0` | 모든 비트가 0인 상태 |

---

## 2. 언제 사용할까?

- 원소의 수가 적은 경우 ($N \le 30$) 집합 연산(합집합, 교집합, 포함 여부)을 $O(1)$에 수행할 때
- `boolean[]` 배열 대신 정수 하나로 공간 복잡도 및 메모리 사용량을 획기적으로 줄이고 싶을 때
- 비트마스크 DP (TSP 등)의 상태(State) 키 값으로 활용할 때

---

## 3. 백준 11723: 집합

[문제 바로가기](https://www.acmicpc.net/problem/11723)

비트 연산자를 사용하여 1부터 20까지의 숫자로 이루어진 집합 연산(add, remove, check, toggle, all, empty)을 비트마스크로 구현하는 기본 교과서 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. 정수 `bit` 변수 하나로 집합 상태를 관리합니다.
2. 각 명령어(`add`, `remove`, `check`, `toggle`, `all`, `empty`)를 위 연산 공식대로 1차원 정수에 반영합니다.

### Java 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int m = Integer.parseInt(br.readLine().trim());

        int bit = 0;
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < m; i++) {
            StringTokenizer st = new StringTokenizer(br.readLine());
            String op = st.nextToken();

            if (op.equals("add")) {
                int x = Integer.parseInt(st.nextToken()) - 1;
                bit |= (1 << x);
            } else if (op.equals("remove")) {
                int x = Integer.parseInt(st.nextToken()) - 1;
                bit &= ~(1 << x);
            } else if (op.equals("check")) {
                int x = Integer.parseInt(st.nextToken()) - 1;
                sb.append((bit & (1 << x)) != 0 ? "1\n" : "0\n");
            } else if (op.equals("toggle")) {
                int x = Integer.parseInt(st.nextToken()) - 1;
                bit ^= (1 << x);
            } else if (op.equals("all")) {
                bit = (1 << 20) - 1;
            } else if (op.equals("empty")) {
                bit = 0;
            }
        }

        System.out.print(sb);
    }
}
```
</details>

---

## 4. 범용 Java 비트 연산 헬퍼 템플릿

```java
public class BitmaskTemplate {
    // i번째 비트 추가
    public static int addBit(int mask, int i) {
        return mask | (1 << i);
    }

    // i번째 비트 제거
    public static int removeBit(int mask, int i) {
        return mask & ~(1 << i);
    }

    // i번째 비트 포함 확인
    public static boolean hasBit(int mask, int i) {
        return (mask & (1 << i)) != 0;
    }

    // i번째 비트 토글
    public static int toggleBit(int mask, int i) {
        return mask ^ (1 << i);
    }

    // K개 전 원소 포함 비트 생성
    public static int getFullMask(int k) {
        return (1 << k) - 1;
    }
}
```

---

## 5. 자주 하는 실수

1. **비트 연산자 괄호 생략**: 자바 비트 연산자(`&`, `|`, `^`)는 비교 연산자(`!=`, `==`)보다 우선순위가 낮으므로 `(mask & (1 << i)) != 0` 괄호 필수.
2. **Shift 연산 오버플로우**: 32번째 이상 비트를 시프트할 때는 `1L << i` (Long 지정)을 사용해야 함. `1 << 35`는 32비트 정수 오버플로우 발생.

---

## 6. 추천 관련 문제

1. [백준 11723 — 집합](https://www.acmicpc.net/problem/11723) — 비트마스크 기본
2. [백준 1062 — 가르침](https://www.acmicpc.net/problem/1062) — 비트마스크 탐색
3. [비트마스크 DP (Bitmask DP / TSP) 알고리즘 정리](http://localhost:3000/study/bitmask-dp-algorithm) — 비트마스크 DP 응용
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- 4. Tag & Relation Updates for Atomic Concept Studies
-- =========================================================================
INSERT IGNORE INTO tag (name, slug) VALUES
('다익스트라', 'dijkstra'),
('비트마스크', 'bitmask'),
('비트마스크 DP', 'bitmask-dp');

-- Study Tags Mapping
INSERT INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM (
    -- Atomic Concept: dijkstra-algorithm
    SELECT 'dijkstra-algorithm' AS study_slug, '다익스트라' AS tag_name UNION ALL
    SELECT 'dijkstra-algorithm', '최단 경로' UNION ALL
    SELECT 'dijkstra-algorithm', 'PriorityQueue' UNION ALL
    SELECT 'dijkstra-algorithm', '알고리즘' UNION ALL
    SELECT 'dijkstra-algorithm', 'Java' UNION ALL
    SELECT 'dijkstra-algorithm', '코딩테스트' UNION ALL

    -- Atomic Concept: bitmask-algorithm
    SELECT 'bitmask-algorithm', '비트마스크' UNION ALL
    SELECT 'bitmask-algorithm', '자료구조' UNION ALL
    SELECT 'bitmask-algorithm', '알고리즘' UNION ALL
    SELECT 'bitmask-algorithm', 'Java' UNION ALL
    SELECT 'bitmask-algorithm', '코딩테스트' UNION ALL

    -- Atomic Concept: bitmask-dp-algorithm
    SELECT 'bitmask-dp-algorithm', '비트마스크 DP' UNION ALL
    SELECT 'bitmask-dp-algorithm', '비트마스크' UNION ALL
    SELECT 'bitmask-dp-algorithm', '동적 계획법' UNION ALL
    SELECT 'bitmask-dp-algorithm', '알고리즘' UNION ALL
    SELECT 'bitmask-dp-algorithm', 'Java' UNION ALL
    SELECT 'bitmask-dp-algorithm', '코딩테스트'
) mapping
JOIN study s ON s.slug = mapping.study_slug
JOIN tag t ON t.name = mapping.tag_name
ON DUPLICATE KEY UPDATE study_id = VALUES(study_id);


-- Bi-directional Study Relations
INSERT INTO study_relation (source_study_id, target_study_id, relation_type, display_order)
SELECT s1.id, s2.id, 'PREREQUISITE', 0
FROM study s1, study s2
WHERE (s1.slug = 'dijkstra-algorithm' AND s2.slug = 'autoever-mock-01-required-checkpoints')
   OR (s1.slug = 'bitmask-algorithm' AND s2.slug = 'autoever-mock-01-required-checkpoints')
   OR (s1.slug = 'bitmask-dp-algorithm' AND s2.slug = 'autoever-mock-01-required-checkpoints')
   OR (s1.slug = 'dijkstra-algorithm' AND s2.slug = 'bitmask-dp-algorithm')
   OR (s1.slug = 'bitmask-algorithm' AND s2.slug = 'bitmask-dp-algorithm')
   OR (s1.slug = 'bitmask-dp-algorithm' AND s2.slug = 'dijkstra-algorithm')
   OR (s1.slug = 'bitmask-dp-algorithm' AND s2.slug = 'bitmask-algorithm')
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);


-- Skill Mappings for all Atomic Concept Studies
INSERT INTO study_skill (study_id, skill_id)
SELECT s.id, 1
FROM study s
WHERE s.slug IN ('dijkstra-algorithm', 'bitmask-algorithm', 'bitmask-dp-algorithm')
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);
