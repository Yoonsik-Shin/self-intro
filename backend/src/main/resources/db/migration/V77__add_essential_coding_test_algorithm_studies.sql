-- V77: Add 5 Essential Coding Test Algorithm Concept Studies (Parametric Search, Union-Find, Floyd-Warshall, DFS/BFS, Prefix Sum)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ensure 'education' category exists
INSERT IGNORE INTO study_category (name, slug, display_order)
VALUES ('공부/학습', 'education', 2);

SET @education_category_id = (
    SELECT id FROM study_category WHERE slug = 'education' OR name = '공부/학습' LIMIT 1
);

-- =========================================================================
-- 1. 매개 변수 탐색 & 이분 탐색 (parametric-search-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'parametric-search-algorithm',
    '매개 변수 탐색 (Parametric Search) & 이분 탐색 알고리즘 정리',
    '최적화 문제(최댓값/최솟값 구하기)를 결정 문제(isPossible(mid) 조건 만족 여부)로 전환하여 이분 탐색(Binary Search)으로 해결하는 필수 핵심 알고리즘이다. O(N log(max-min)) 시간에 최적 해를 도출한다.',
    '# 매개 변수 탐색 (Parametric Search) & 이분 탐색 알고리즘 정리

> "최솟값의 최댓값" 또는 "최댓값의 최솟값"을 구하는 최적화 문제를 "값 `mid`가 조건 `isPossible(mid)`를 만족하는가?"라는 단조성 결정 문제로 변환하여 탐색하는 강력한 알고리즘 기법입니다.

---

## 1. 동작 방식

매개 변수 탐색은 **탐색 범위 설정 + 결정 함수 검증 + 이분 탐색**으로 동작합니다.

```mermaid
graph TD
    A[정답의 최솟값 low, 최댓값 high 설정] --> B[mid = low + high / 2 계산]
    B --> C{결정 함수 isPossible mid 검증}
    C -- 조건 만족 true --> D[answer = mid 기록 및 더 큰/작은 범위 탐색 low = mid + 1]
    C -- 조건 불만족 false --> E[범위 축소 high = mid - 1]
    D --> F{low <= high 인가?}
    E --> F
    F -- 예 --> B
    F -- 아니오 --> G[최적 해 answer 반환]
```

### 1) 핵심 개념
- **단조 감소/증가 성질**: 값 $X$에서 조건이 성립한다면, $X$보다 작은(또는 큰) 모든 값에서도 조건이 일관되게 성립해야 이분 탐색을 적용할 수 있습니다.
- **결정 함수 (`isPossible(mid)`)**: 정답 후보 `mid`를 파라미터로 받아 해당 값이 문제 조건을 만족하는지 $O(N)$ 시간 내에 판단합니다.

---

## 2. 언제 사용할까?

- **"최솟값의 최댓값"**, **"최댓값의 최솟값"**, **"조건을 만족하는 최소/최대 시간"** 구하기
- 정답의 범위가 $1 \sim 1,000,000,000$처럼 매우 커서 완전탐색이 불가능할 때
- 탐색 대상을 결정했을 때 조건 만족 여부를 쉽게 판단할 수 있을 때

---

## 3. 백준 2805: 나무 자르기

[문제 바로가기](https://www.acmicpc.net/problem/2805)

절단기 높이 `H`를 조절하여 적어도 `M`미터의 나무를 가져가기 위한 높이 `H`의 최댓값을 구하는 매개 변수 탐색 기본 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. 절단기 높이 범위 `low = 0`, `high = max(treeHeight)`로 설정합니다.
2. `mid` 높이로 잘랐을 때 가져갈 수 있는 나무 길이 합이 `M` 이상인지 검증합니다.

### Java 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken());
        long m = Long.parseLong(st.nextToken());

        long[] trees = new long[n];
        long maxH = 0;
        st = new StringTokenizer(br.readLine());
        for (int i = 0; i < n; i++) {
            trees[i] = Long.parseLong(st.nextToken());
            maxH = Math.max(maxH, trees[i]);
        }

        long low = 0, high = maxH, answer = 0;
        while (low <= high) {
            long mid = low + (high - low) / 2;

            if (isPossible(trees, mid, m)) {
                answer = mid; // 가능한 높이 기록
                low = mid + 1; // 더 높은 절단기 높이 탐색
            } else {
                high = mid - 1; // 절단기 높이 낮춤
            }
        }

        System.out.println(answer);
    }

    static boolean isPossible(long[] trees, long h, long m) {
        long sum = 0;
        for (long tree : trees) {
            if (tree > h) {
                sum += (tree - h);
            }
        }
        return sum >= m;
    }
}
```
</details>

---

## 4. 범용 Java 템플릿 코드

```java
public class ParametricSearchTemplate {

    public static long parametricSearch(long minPossible, long maxPossible, java.util.function.LongPredicate isPossible) {
        long low = minPossible;
        long high = maxPossible;
        long answer = minPossible;

        while (low <= high) {
            long mid = low + (high - low) / 2;

            if (isPossible.test(mid)) {
                answer = mid;
                low = mid + 1; // 최댓값 탐색 시 (최솟값 탐색 시 high = mid - 1)
            } else {
                high = mid - 1;
            }
        }

        return answer;
    }
}
```

---

## 5. 자주 하는 실수

1. **`mid` 덧셈 오버플로우**: `(low + high) / 2` 대신 `low + (high - low) / 2` 사용 권장.
2. **`isPossible` 내 누적합 오버플로우**: 나무 길이나 개수 합산 시 `int` 대신 `long` 타입 사용 필수.
3. **탐색 범위를 찾지 못함**: `answer` 변수를 갱신하지 않고 루프 탈출 시 `low`나 `high`를 직접 출력하면 1 차이 오답 발생.

---

## 6. 추천 관련 문제

1. [백준 2805 — 나무 자르기](https://www.acmicpc.net/problem/2805) — 매개 변수 탐색 기본
2. [백준 1654 — 랜선 자르기](https://www.acmicpc.net/problem/1654) — K개 이상 만드는 최대 길이
3. [구간 스케줄링 & 이분 탐색 DP 정리](http://localhost:3000/study/weighted-interval-scheduling-algorithm) — 이분 탐색 DP 연동
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- 2. 유니온 파인드 (Union-Find / Disjoint Set) 알고리즘 정리 (union-find-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'union-find-algorithm',
    '유니온 파인드 (Union-Find / Disjoint Set) 알고리즘 정리',
    '서로소 집합(Disjoint Set)을 효율적으로 표현하고 정점 간 같은 집합 포함 여부 판별(Find) 및 병합(Union)을 거의 O(1) 시간에 수행하는 필수 자료구조 및 알고리즘이다.',
    '# 유니온 파인드 (Union-Find / Disjoint Set) 알고리즘 정리

> 원소들을 중복되지 않는 부분집합(Disjoint Set)들로 나누어 관리하며, 두 원소가 같은 집합에 속해 있는지 확인(Find)하고 두 집합을 하나로 합치는(Union) 알고리즘입니다.

---

## 1. 동작 방식

유니온 파인드는 **부모 노드 배열 `parent[]` + 경로 압축(Path Compression)**으로 작동합니다.

```mermaid
graph TD
    A[find x : x의 루트 노드 탐색] --> B{parent x == x 인가?}
    B -- 예 --> C[루트 노드 x 반환]
    B -- 아니오 --> D[parent x = find parent x 루트 갱신 경로 압축]
    D --> C
    C --> E[union x y : 두 노드가 속한 집합 병합]
    E --> F[rootX = find x, rootY = find y]
    F --> G{rootX != rootY 인가?}
    G -- 예 --> H[parent rootY = rootX 병합 완료]
```

### 1) 핵심 테크닉
- **경로 압축 (Path Compression)**: `find(x)` 호출 시 재귀적으로 루트 노드를 찾아 부모 배열 `parent[x]`를 직접 루트로 갱신합니다. 이를 통해 트리의 높이가 1로 압축되어 거의 $O(1)$ ($O(\alpha(N))$, 아커만 함수 역함수)에 작동합니다.

---

## 2. 언제 사용할까?

- 그래프에서 두 정점이 **같은 연결 요소(Connected Component)**에 속해 있는지 판별할 때
- 크루스칼(Kruskal) 알고리즘을 사용해 **최소 신장 트리(MST)**를 만들 때
- 무방향 그래프에서 **사이클(Cycle)** 발생 여부를 실시간으로 감지할 때

---

## 3. 백준 1717: 집합의 표현

[문제 바로가기](https://www.acmicpc.net/problem/1717)

`0 a b` (합집합 연산)과 `1 a b` (두 원소가 같은 집합에 있는지 확인 연산)을 수행하는 유니온 파인드 대표 표준 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. `parent[i] = i`로 초기화합니다.
2. `union(a, b)`로 두 집합을 합치고, `find(a) == find(b)`로 같은 집합 여부를 판단합니다.

### Java 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    static int[] parent;

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());

        parent = new int[n + 1];
        for (int i = 0; i <= n; i++) parent[i] = i;

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int type = Integer.parseInt(st.nextToken());
            int a = Integer.parseInt(st.nextToken());
            int b = Integer.parseInt(st.nextToken());

            if (type == 0) {
                union(a, b);
            } else {
                if (find(a) == find(b)) {
                    sb.append("YES\n");
                } else {
                    sb.append("NO\n");
                }
            }
        }

        System.out.print(sb);
    }

    static int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]); // ★ 경로 압축
    }

    static void union(int a, int b) {
        int rootA = find(a);
        int rootB = find(b);
        if (rootA != rootB) {
            parent[rootB] = rootA;
        }
    }
}
```
</details>

---

## 4. 범용 Java 템플릿 코드

```java
public class UnionFindTemplate {
    private int[] parent;

    public UnionFindTemplate(int n) {
        parent = new int[n + 1];
        for (int i = 0; i <= n; i++) parent[i] = i;
    }

    public int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]);
    }

    public boolean union(int a, int b) {
        int rootA = find(a);
        int rootB = find(b);
        if (rootA != rootB) {
            parent[rootB] = rootA;
            return true;
        }
        return false;
    }
}
```

---

## 5. 자주 하는 실수

1. **`find` 시 경로 압축 누락**: `return find(parent[x]);`로만 작성하면 일자 트리가 되어 $O(N)$으로 성능 저하 발생. `return parent[x] = find(parent[x]);`로 작성 필수.
2. **`union` 시 대표값 대신 원소 직접 병합**: `parent[b] = a`로 합치면 부모 노드가 무너짐. 반드시 **`parent[find(b)] = find(a)`**로 대표 노드끼리 합쳐야 함.

---

## 6. 추천 관련 문제

1. [백준 1717 — 집합의 표현](https://www.acmicpc.net/problem/1717) — 유니온 파인드 기본
2. [백준 1197 — 최소 스패닝 트리](https://www.acmicpc.net/problem/1197) — 크루스칼 알고리즘
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- 3. 플로이드 워셜 (Floyd-Warshall) 알고리즘 정리 (floyd-warshall-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'floyd-warshall-algorithm',
    '플로이드 워셜 (Floyd-Warshall) 알고리즘 정리',
    '모든 정점 쌍(All-Pairs) 간의 최단 경로를 구하는 동적 계획법(DP) 기반 그래프 알고리즘이다. 3중 반복문(거쳐가는 정점 k -> 출발 정점 i -> 도착 정점 j)을 통해 O(V^3) 시간에 최단 거리를 탐색한다.',
    '# 플로이드 워셜 (Floyd-Warshall) 알고리즘 정리

> 모든 정점 쌍(All-Pairs) 사이의 최단 경로를 구하는 다이나믹 프로그래밍 기반 최단 경로 알고리즘입니다.

---

## 1. 동작 방식

플로이드 워셜은 **"정점 $k$를 거쳐 지나가는 것이 더 짧은가?"**라는 점화식으로 작동합니다.

$$\text{dist}[i][j] = \min(\text{dist}[i][j], \; \text{dist}[i][k] + \text{dist}[k][j])$$

```java
// ★ 3중 for문 순서: k (거쳐가는 노드) -> i (출발 노드) -> j (도착 노드)
for (int k = 1; k <= v; k++) {
    for (int i = 1; i <= v; i++) {
        for (int j = 1; j <= v; j++) {
            if (dist[i][k] < INF && dist[k][j] < INF) {
                dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
            }
        }
    }
}
```

---

## 2. 언제 사용할까?

- 정점 수 $V$가 소규모일 때 ($V \le 500$) **모든 쌍 최단 경로**를 구해야 하는 경우
- 음수 가중치 간선이 존재할 때 (음수 사이클 감지 가능)
- 정점 간 도달 가능 여부(Transitive Closure) 판별

---

## 3. 백준 11404: 플로이드

[문제 바로가기](https://www.acmicpc.net/problem/11404)

모든 도시 쌍 `(A, B)`에 대해 도시 A에서 B로 가는 데 필요한 최소 비용을 구하는 플로이드 워셜 표준 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. `dist[i][j]`를 자기 자신은 0, 직접 간선은 가중치, 나머지는 `INF`로 초기화합니다.
2. 3중 `for`문으로 `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`를 수행합니다.

### Java 코드
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

## 4. 자주 하는 실수

1. **3중 `for`문 순서 혼동**: 반드시 가장 바깥쪽 루프가 **`k` (거쳐가는 정점)**이어야 함.
2. **`INF` 오버플로우**: `dist[i][k] + dist[k][j]` 계산 시 `dist[i][k] < INF && dist[k][j] < INF` 체크 필수.

---

## 5. 추천 관련 문제

1. [백준 11404 — 플로이드](https://www.acmicpc.net/problem/11404) — 기본 플로이드
2. [다익스트라 알고리즘 정리](http://localhost:3000/study/dijkstra-algorithm) — 단일 출발지 최단 경로 연동
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- 4. DFS & BFS (dfs-bfs-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'dfs-bfs-algorithm',
    'DFS & BFS (깊이/너비 우선 탐색) 알고리즘 정리',
    '그래프와 격자 지도(Grid) 탐색의 가장 기본이 되는 깊이 우선 탐색(DFS)과 너비 우선 탐색(BFS)이다. 방문 배열(Visited), Queue/재귀, 4방향 델타 배열(DR/DC)을 활용해 O(V+E)에 탐색한다.',
    '# DFS & BFS (깊이/너비 우선 탐색) 알고리즘 정리

> 그래프나 2차원 격자 지도에서 모든 정점을 방문하는 대표적인 두 가지 기본 탐색 알고리즘입니다.

---

## 1. DFS vs BFS 동작 비교

| 구분 | DFS (Depth-First Search) | BFS (Breadth-First Search) |
| :--- | :--- | :--- |
| **구현 방식** | 재귀(Recursion) 또는 Stack | Queue |
| **탐색 특징** | 한 경로를 끝까지 깊게 탐색 | 시작점에서 가까운 정점부터 레벨 순 탐색 |
| **주요 용도** | 연결 요소 개수, 경로 존재 여부, 백트래킹 | **가중치가 동일한 그래프의 최단 거리** |
| **시간복잡도** | $O(V + E)$ | $O(V + E)$ |

---

## 2. 격자 탐색 4방향 델타 배열 필수 공식

```java
// 상, 하, 좌, 우 델타 이동 배열
static final int[] DR = {-1, 1, 0, 0};
static final int[] DC = {0, 0, -1, 1};

for (int d = 0; d < 4; d++) {
    int nr = r + DR[d];
    int nc = c + DC[d];
    if (nr >= 0 && nr < N && nc >= 0 && nc < M && !visited[nr][nc] && board[nr][nc] != ''#'') {
        visited[nr][nc] = true;
        queue.offer(new int[]{nr, nc});
    }
}
```

---

## 3. 백준 2178: 미로 탐색 (BFS)

[문제 바로가기](https://www.acmicpc.net/problem/2178)

<details>
<summary>풀이 방법 및 Java 코드</summary>

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

## 4. 자주 하는 실수

1. **BFS 큐 삽입 시 방문 처리 누락**: 큐에서 꺼낼 때 `visited`를 체크하면 동일 노드가 큐에 중복으로 수백 개 들어가 **메모리 초과** 발생. 반드시 **큐에 넣을 때(`offer`) 방문 처리**해야 함.

---

## 5. 추천 관련 문제

1. [백준 1260 — DFS와 BFS](https://www.acmicpc.net/problem/1260)
2. [백준 2178 — 미로 탐색](https://www.acmicpc.net/problem/2178)
3. [0-1 BFS & 덱 정리](http://localhost:3000/study/zero-one-bfs-algorithm) — 가중치 0/1 덱 확장 연동
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- 5. 누적 합 (Prefix Sum) & 2차원 누적 합 (prefix-sum-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'prefix-sum-algorithm',
    '누적 합 (Prefix Sum) & 2차원 누적 합 알고리즘 정리',
    '배열의 연속된 구간 합 쿼리를 O(1)에 구하는 전처리 기법이다. 1차원 prefix[i] = prefix[i-1] + arr[i] 및 2차원 구간 합 공식 P[r][c] = P[r-1][c] + P[r][c-1] - P[r-1][c-1] + A[r][c]를 학습한다.',
    '# 누적 합 (Prefix Sum) & 2차원 누적 합 알고리즘 정리

> 배열이나 2차원 격자에서 특정 구간의 합을 매번 덧셈하지 않고 미리 누적합 배열을 전처리하여 $O(1)$ 시간에 빠르게 구하는 기법입니다.

---

## 1. 동작 방식

### 1) 1차원 누적 합
- **전처리**: `prefix[i] = prefix[i - 1] + arr[i]`
- **구간 [L, R] 합**: `sum(L, R) = prefix[R] - prefix[L - 1]`

### 2) 2차원 누적 합
- **전처리**: `P[r][c] = P[r - 1][c] + P[r][c - 1] - P[r - 1][c - 1] + A[r][c]`
- **(r1, c1)부터 (r2, c2)까지 부분 격자 합**:
  $$\text{Sum} = P[r_2][c_2] - P[r_1 - 1][c_2] - P[r_2][c_1 - 1] + P[r_1 - 1][c_1 - 1]$$

---

## 2. 백준 11660: 구간 합 구하기 5

[문제 바로가기](https://www.acmicpc.net/problem/11660)

<details>
<summary>풀이 방법 및 Java 코드</summary>

```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());

        int[][] p = new int[n + 1][n + 1];
        for (int r = 1; r <= n; r++) {
            st = new StringTokenizer(br.readLine());
            for (int c = 1; c <= n; c++) {
                int val = Integer.parseInt(st.nextToken());
                p[r][c] = p[r - 1][c] + p[r][c - 1] - p[r - 1][c - 1] + val;
            }
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int r1 = Integer.parseInt(st.nextToken());
            int c1 = Integer.parseInt(st.nextToken());
            int r2 = Integer.parseInt(st.nextToken());
            int c2 = Integer.parseInt(st.nextToken());

            int sum = p[r2][c2] - p[r1 - 1][c2] - p[r2][c1 - 1] + p[r1 - 1][c1 - 1];
            sb.append(sum).append("\n");
        }

        System.out.print(sb);
    }
}
```
</details>

---

## 3. 추천 관련 문제

1. [백준 11659 — 구간 합 구하기 4](https://www.acmicpc.net/problem/11659)
2. [백준 11660 — 구간 합 구하기 5](https://www.acmicpc.net/problem/11660)
3. [투 포인터 알고리즘 정리](http://localhost:3000/study/투포인터-two-pointer) — 슬라이딩 윈도우/투포인터 연동
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- Tags, Relations, Skills Mappings for V77
-- =========================================================================
INSERT IGNORE INTO tag (name, slug) VALUES
('이분 탐색', 'binary-search-kr'),
('유니온 파인드', 'union-find'),
('플로이드 워셜', 'floyd-warshall'),
('DFS', 'dfs-tag'),
('누적 합', 'prefix-sum-kr');

-- Tag Mappings
INSERT INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM (
    SELECT 'parametric-search-algorithm' AS study_slug, '이분 탐색' AS tag_name UNION ALL
    SELECT 'parametric-search-algorithm', '알고리즘' UNION ALL
    SELECT 'parametric-search-algorithm', 'Java' UNION ALL
    SELECT 'parametric-search-algorithm', '코딩테스트' UNION ALL

    SELECT 'union-find-algorithm', '유니온 파인드' UNION ALL
    SELECT 'union-find-algorithm', '자료구조' UNION ALL
    SELECT 'union-find-algorithm', '알고리즘' UNION ALL
    SELECT 'union-find-algorithm', 'Java' UNION ALL
    SELECT 'union-find-algorithm', '코딩테스트' UNION ALL

    SELECT 'floyd-warshall-algorithm', '플로이드 워셜' UNION ALL
    SELECT 'floyd-warshall-algorithm', '최단 경로' UNION ALL
    SELECT 'floyd-warshall-algorithm', '동적 계획법' UNION ALL
    SELECT 'floyd-warshall-algorithm', '알고리즘' UNION ALL
    SELECT 'floyd-warshall-algorithm', 'Java' UNION ALL
    SELECT 'floyd-warshall-algorithm', '코딩테스트' UNION ALL

    SELECT 'dfs-bfs-algorithm', 'DFS' UNION ALL
    SELECT 'dfs-bfs-algorithm', 'BFS' UNION ALL
    SELECT 'dfs-bfs-algorithm', '그래프 탐색' UNION ALL
    SELECT 'dfs-bfs-algorithm', '알고리즘' UNION ALL
    SELECT 'dfs-bfs-algorithm', 'Java' UNION ALL
    SELECT 'dfs-bfs-algorithm', '코딩테스트' UNION ALL

    SELECT 'prefix-sum-algorithm', '누적 합' UNION ALL
    SELECT 'prefix-sum-algorithm', '알고리즘' UNION ALL
    SELECT 'prefix-sum-algorithm', 'Java' UNION ALL
    SELECT 'prefix-sum-algorithm', '코딩테스트'
) mapping
JOIN study s ON s.slug = mapping.study_slug
JOIN tag t ON t.name = mapping.tag_name
ON DUPLICATE KEY UPDATE study_id = VALUES(study_id);

-- Study Relations
INSERT INTO study_relation (source_study_id, target_study_id, relation_type, display_order)
SELECT s1.id, s2.id, 'PREREQUISITE', 0
FROM study s1, study s2
WHERE (s1.slug = 'parametric-search-algorithm' AND s2.slug = 'weighted-interval-scheduling-algorithm')
   OR (s1.slug = 'weighted-interval-scheduling-algorithm' AND s2.slug = 'parametric-search-algorithm')
   OR (s1.slug = 'dfs-bfs-algorithm' AND s2.slug = 'zero-one-bfs-algorithm')
   OR (s1.slug = 'zero-one-bfs-algorithm' AND s2.slug = 'dfs-bfs-algorithm')
   OR (s1.slug = 'dijkstra-algorithm' AND s2.slug = 'floyd-warshall-algorithm')
   OR (s1.slug = 'floyd-warshall-algorithm' AND s2.slug = 'dijkstra-algorithm')
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);

-- Skill Mappings for Java
INSERT INTO study_skill (study_id, skill_id)
SELECT s.id, 1
FROM study s
WHERE s.slug IN (
    'parametric-search-algorithm',
    'union-find-algorithm',
    'floyd-warshall-algorithm',
    'dfs-bfs-algorithm',
    'prefix-sum-algorithm'
)
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);
