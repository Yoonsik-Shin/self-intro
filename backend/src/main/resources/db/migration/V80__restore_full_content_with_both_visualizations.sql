-- V80: Restore 100% full content for all algorithm concept studies, integrating both Mermaid diagrams AND ASCII Art visualizations with full sections

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- 1. DFS & BFS (dfs-bfs-algorithm)
-- =========================================================================
UPDATE study
SET content_markdown = '# DFS & BFS (깊이/너비 우선 탐색) 알고리즘 정리

> 그래프나 2차원 격자 지도에서 모든 정점을 방문하는 대표적인 두 가지 기본 탐색 알고리즘입니다.

---

## 1. 시각화 및 데이터 흐름

### 1) 격자 지도 4방향 이동 아스키 아트

```text
                  [상: r-1, c] (d=0)
                       ▲
                       │
  [좌: r, c-1] ◀── [r, c] ──▶ [우: r, c+1]
   (d=2)               │       (d=3)
                       ▼
                  [하: r+1, c] (d=1)
```

### 2) 4방향 델타 탐색 순서도 (Mermaid)

```mermaid
graph TD
    subgraph 격자4방향이동흐름 ["2차원 격자 (r, c) 4방향 델타 탐색 흐름"]
        P["현재 위치 (r, c)"] -->|d=0| N1["상 (-1, 0)"]
        P -->|d=1| N2["하 (+1, 0)"]
        P -->|d=2| N3["좌 (0, -1)"]
        P -->|d=3| N4["우 (0, +1)"]
        N1 --> V{"격자 범위 및 미방문 검증"}
        N2 --> V
        N3 --> V
        N4 --> V
        V -- "유효 조건 만족" --> Q["visited[nr][nc] = true 후 Queue/Stack 삽입"]
    end
```

---

## 2. DFS vs BFS 동작 비교

| 구분 | DFS (Depth-First Search) | BFS (Breadth-First Search) |
| :--- | :--- | :--- |
| **구현 방식** | 재귀(Recursion) 또는 Stack | Queue |
| **탐색 특징** | 한 경로를 끝까지 깊게 탐색 | 시작점에서 가까운 정점부터 레벨 순 탐색 |
| **주요 용도** | 연결 요소 개수, 경로 존재 여부, 백트래킹 | **가중치가 동일한 그래프의 최단 거리** |
| **시간복잡도** | $O(V + E)$ | $O(V + E)$ |

---

## 3. 백준 2178: 미로 탐색 (BFS)

[문제 바로가기](https://www.acmicpc.net/problem/2178)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법
1. 2차원 배열 `dist[n][m]`을 선언하고 시작점 (0,0)에 거리 1을 지정합니다.
2. BFS 큐에서 좌표를 하나씩 꺼내 4방향 이동 가능성을 탐색합니다.

### 완성형 Java 정답 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    static final int[] DR = {-1, 1, 0, 0};
    static final int[] DC = {0, 0, -1, 1};

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());

        char[][] board = new char[n][];
        for (int i = 0; i < n; i++) {
            board[i] = br.readLine().toCharArray();
        }

        int[][] dist = new int[n][m];
        Queue<int[]> queue = new LinkedList<>();

        dist[0][0] = 1;
        queue.offer(new int[]{0, 0});

        while (!queue.isEmpty()) {
            int[] cur = queue.poll();
            int r = cur[0], c = cur[1];

            if (r == n - 1 && c == m - 1) {
                System.out.println(dist[r][c]);
                return;
            }

            for (int d = 0; d < 4; d++) {
                int nr = r + DR[d];
                int nc = c + DC[d];

                if (nr >= 0 && nr < n && nc >= 0 && nc < m && board[nr][nc] == ''1'' && dist[nr][nc] == 0) {
                    dist[nr][nc] = dist[r][c] + 1;
                    queue.offer(new int[]{nr, nc});
                }
            }
        }
    }
}
```
</details>

---

## 4. 범용 Java 템플릿 코드

```java
import java.util.*;

public class DFSTemplate {
    // DFS 재귀 탐색
    public static void dfs(int cur, List<Integer>[] graph, boolean[] visited) {
        visited[cur] = true;
        for (int next : graph[cur]) {
            if (!visited[next]) {
                dfs(next, graph, visited);
            }
        }
    }

    // BFS 큐 탐색
    public static void bfs(int start, List<Integer>[] graph, boolean[] visited) {
        Queue<Integer> queue = new LinkedList<>();
        visited[start] = true;
        queue.offer(start);

        while (!queue.isEmpty()) {
            int cur = queue.poll();
            for (int next : graph[cur]) {
                if (!visited[next]) {
                    visited[next] = true;
                    queue.offer(next);
                }
            }
        }
    }
}
```

---

## 5. 자주 하는 실수

1. **BFS 큐 삽입 시 방문 처리 누락**: 큐에서 꺼낼 때 `visited`를 체크하면 동일 노드가 큐에 중복으로 수백 개 들어가 **메모리 초과** 발생. 반드시 **큐에 넣을 때(`offer`) 방문 처리**해야 함.

---

## 6. 추천 관련 문제

1. [백준 1260 — DFS와 BFS](https://www.acmicpc.net/problem/1260)
2. [백준 2178 — 미로 탐색](https://www.acmicpc.net/problem/2178)
3. [0-1 BFS & 덱 정리](http://localhost:3000/study/zero-one-bfs-algorithm) — 가중치 0/1 덱 확장 연동
',
    updated_at = NOW()
WHERE slug = 'dfs-bfs-algorithm';


-- =========================================================================
-- 2. 0-1 BFS (zero-one-bfs-algorithm)
-- =========================================================================
UPDATE study
SET content_markdown = '# 0-1 BFS & 덱 (0-1 BFS using Deque) 알고리즘 정리

> 간선 가중치가 오직 0 또는 1로만 구성된 그래프에서 일반 다익스트라(PriorityQueue)보다 빠른 $O(V + E)$ 시간에 최단 경로를 탐색하는 알고리즘 기법입니다.

---

## 1. 시각화 및 데이터 흐름

### 1) Deque(양방향 큐) 구조 아스키 아트

```text
Deque (Double-Ended Queue):
┌─────────────────────────────────────────────────────────────┐
│ ◀-- [offerFirst()]        [노드 탐색]        [offerLast()] --▶ │
│    비용 0 이동 (직진)                       비용 1 이동 (회전)   │
└─────────────────────────────────────────────────────────────┘
  ▲ (우선 순위 가장 높게 처리)               ▲ (다음 레벨 처리)
```

### 2) 0-1 BFS 탐색 순서도 (Mermaid)

```mermaid
graph TD
    A["시작 정점 거리 0 지정 및 Deque에 삽입"] --> B["Deque의 맨 앞에서 정점 u 꺼냄"]
    B --> C["u의 이웃 정점 v로의 이동 비용 탐색"]
    C -->|가중치 0 간선| D["dist v = dist u 지정 후 Deque 맨 앞에 삽입 offerFirst"]
    C -->|가중치 1 간선| E["dist v = dist u + 1 지정 후 Deque 맨 뒤에 삽입 offerLast"]
    D --> F{"Deque가 비어있는가?"}
    E --> F
    F -- "아니오" --> B
    F -- "예" --> G["최단 거리 탐색 완료"]
```

---

## 2. 언제 사용할까?

- 간선 비용/가중치가 오직 **0 또는 1**로만 구성된 최단 경로 문제
- 격자 지도에서 **직진(비용 0)**과 **방향 회전/조향(비용 1)**
- 격자 탐색 중 **순수 이동(비용 0)**과 **벽 부수기/거울 설치(비용 1)**

---

## 3. 백준 13549: 숨바꼭질 3

[문제 바로가기](https://www.acmicpc.net/problem/13549)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법
1. 순간이동(`2*X`, 비용 0)은 덱의 앞에 `offerFirst`합니다.
2. 걷기(`X-1`, `X+1`, 비용 1)는 덱의 뒤에 `offerLast`합니다.

### 완성형 Java 정답 코드
```java
import java.util.*;

public class Main {
    static final int MAX = 100000;
    static final int INF = Integer.MAX_VALUE / 4;

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int k = sc.nextInt();

        int[] dist = new int[MAX + 1];
        Arrays.fill(dist, INF);

        Deque<Integer> deque = new ArrayDeque<>();
        dist[n] = 0;
        deque.offer(n);

        while (!deque.isEmpty()) {
            int cur = deque.pollFirst();

            if (cur == k) {
                System.out.println(dist[cur]);
                return;
            }

            // 1. 순간이동 (비용 0)
            if (cur * 2 <= MAX && dist[cur * 2] > dist[cur]) {
                dist[cur * 2] = dist[cur];
                deque.offerFirst(cur * 2);
            }

            // 2. 뒤로 걷기 (비용 1)
            if (cur - 1 >= 0 && dist[cur - 1] > dist[cur] + 1) {
                dist[cur - 1] = dist[cur] + 1;
                deque.offerLast(cur - 1);
            }

            // 3. 앞으로 걷기 (비용 1)
            if (cur + 1 <= MAX && dist[cur + 1] > dist[cur] + 1) {
                dist[cur + 1] = dist[cur] + 1;
                deque.offerLast(cur + 1);
            }
        }
    }
}
```
</details>

---

## 4. 범용 Java 템플릿 코드

```java
import java.util.*;

public class ZeroOneBFSTemplate {
    static class Edge {
        int to;
        int weight; // 0 또는 1
        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    public static int[] zeroOneBFS(int start, int v, List<Edge>[] graph) {
        int[] dist = new int[v + 1];
        Arrays.fill(dist, Integer.MAX_VALUE / 4);

        Deque<Integer> deque = new ArrayDeque<>();
        dist[start] = 0;
        deque.offer(start);

        while (!deque.isEmpty()) {
            int cur = deque.pollFirst();

            for (Edge edge : graph[cur]) {
                int next = edge.to;
                int weight = edge.weight;

                if (dist[next] > dist[cur] + weight) {
                    dist[next] = dist[cur] + weight;
                    if (weight == 0) {
                        deque.offerFirst(next);
                    } else {
                        deque.offerLast(next);
                    }
                }
            }
        }

        return dist;
    }
}
```

---

## 5. 자주 하는 실수

1. **일반 Queue 사용 실수**: 가중치 0 이동을 일반 Queue로 처리하면 최소 비용 노드가 먼저 꺼내지지 않아 오답이 발생함.
2. **다차원 메모리 초과**: `int[N][M][4]` 다차원 배열 선언 시 자바 객체 헤더 오버헤드로 메모리 초과가 날 수 있으므로 `(row * M + col) * 4 + dir` 1차원 정수 인코딩 권장.

---

## 6. 추천 관련 문제

1. [백준 13549 — 숨바꼭질 3](https://www.acmicpc.net/problem/13549) — 0-1 BFS 기본 문제
2. [백준 1261 — 알고스팟](https://www.acmicpc.net/problem/1261) — 미로 벽 부수기 0-1 BFS
3. [현대오토에버 대비 모의문제 4 — 최소 조향 자율주차](http://localhost:3000/study/autoever-mock-04-minimum-steering) — 실전 응용 모의문제
',
    updated_at = NOW()
WHERE slug = 'zero-one-bfs-algorithm';


-- =========================================================================
-- 3. 플로이드 워셜 (Floyd-Warshall)
-- =========================================================================
UPDATE study
SET content_markdown = '# 플로이드 워셜 (Floyd-Warshall) 알고리즘 정리

> 모든 정점 쌍(All-Pairs) 사이의 최단 경로를 구하는 다이나믹 프로그래밍 기반 최단 경로 알고리즘입니다.

---

## 1. 시각화 및 데이터 흐름

### 1) 3중 반복문(k -> i -> j) 아스키 아트

```text
모든 정점 i, j에 대해 거쳐가는 노드 k를 경유하는 최단 거리 탐색:

[출발 노드 i] ──────────────────────────▶ [도착 노드 j] (기존 dist[i][j])
       │                                       ▲
       │ (dist[i][k])             (dist[k][j]) │
       └───────────────▶ [거쳐가는 노드 k] ───────┘

점화식: dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j])
```

---

## 2. 언제 사용할까?

- 정점 수 $V$가 소규모일 때 ($V \le 500$) **모든 쌍 최단 경로**를 구해야 하는 경우
- 음수 가중치 간선이 존재할 때 (음수 사이클 감지 가능)
- 정점 간 도달 가능 여부(Transitive Closure) 판별

---

## 3. 백준 11404: 플로이드

[문제 바로가기](https://www.acmicpc.net/problem/11404)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법
1. `dist[i][j]`를 자기 자신은 0, 직접 간선은 가중치, 나머지는 `INF`로 초기화합니다.
2. 3중 `for`문으로 `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`를 수행합니다.

### 완성형 Java 정답 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    static final int INF = Integer.MAX_VALUE / 4;

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine());
        int m = Integer.parseInt(br.readLine());

        int[][] dist = new int[n + 1][n + 1];
        for (int i = 1; i <= n; i++) {
            Arrays.fill(dist[i], INF);
            dist[i][i] = 0;
        }

        for (int i = 0; i < m; i++) {
            StringTokenizer st = new StringTokenizer(br.readLine());
            int u = Integer.parseInt(st.nextToken());
            int v = Integer.parseInt(st.nextToken());
            int w = Integer.parseInt(st.nextToken());
            dist[u][v] = Math.min(dist[u][v], w); // 중복 간선 처리
        }

        for (int k = 1; k <= n; k++) {
            for (int i = 1; i <= n; i++) {
                for (int j = 1; j <= n; j++) {
                    if (dist[i][k] < INF && dist[k][j] < INF) {
                        dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
                    }
                }
            }
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= n; j++) {
                sb.append(dist[i][j] == INF ? 0 : dist[i][j]).append(j == n ? "" : " ");
            }
            sb.append("\n");
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

public class FloydWarshallTemplate {
    static final int INF = Integer.MAX_VALUE / 4;

    public static int[][] floydWarshall(int n, int[][] edges) {
        int[][] dist = new int[n + 1][n + 1];
        for (int i = 1; i <= n; i++) {
            Arrays.fill(dist[i], INF);
            dist[i][i] = 0;
        }

        for (int[] edge : edges) {
            int u = edge[0], v = edge[1], w = edge[2];
            dist[u][v] = Math.min(dist[u][v], w);
        }

        for (int k = 1; k <= n; k++) {
            for (int i = 1; i <= n; i++) {
                for (int j = 1; j <= n; j++) {
                    if (dist[i][k] < INF && dist[k][j] < INF) {
                        dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
                    }
                }
            }
        }

        return dist;
    }
}
```

---

## 5. 자주 하는 실수

1. **3중 `for`문 순서 혼동**: 반드시 가장 바깥쪽 루프가 **`k` (거쳐가는 정점)**이어야 함.
2. **`INF` 오버플로우**: `dist[i][k] + dist[k][j]` 계산 시 `dist[i][k] < INF && dist[k][j] < INF` 체크 필수.

---

## 6. 추천 관련 문제

1. [백준 11404 — 플로이드](https://www.acmicpc.net/problem/11404)
2. [다익스트라 알고리즘 정리](http://localhost:3000/study/dijkstra-algorithm)
',
    updated_at = NOW()
WHERE slug = 'floyd-warshall-algorithm';
