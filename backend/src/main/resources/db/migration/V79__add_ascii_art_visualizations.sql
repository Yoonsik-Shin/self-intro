-- V79: Add ASCII Art Visualizations and Diagrams to Algorithm Concept Studies

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- 1. 매개 변수 탐색 (Parametric Search) - Add ASCII Art
-- =========================================================================
UPDATE study
SET content_markdown = '# 매개 변수 탐색 (Parametric Search) & 이분 탐색 알고리즘 정리

> "최솟값의 최댓값" 또는 "최댓값의 최솟값"을 구하는 최적화 문제를 "값 `mid`가 조건 `isPossible(mid)`를 만족하는가?"라는 단조성 결정 문제로 변환하여 탐색하는 강력한 알고리즘 기법입니다.

---

## 1. 데이터 흐름 및 아스키 아트(ASCII Art) 시각화

### 1) 이분 탐색 범위 조절 아스키 아트

```text
절단기 높이 탐색 범위 [low, high]:
[ 0m ------------------------ Mid: 15m ------------------------ 30m (Max Tree) ]
                               │
                               ▼ isPossible(15m) -> 나무 합계 7m >= 6m (조건 성립!)
                               ★ answer = 15m 기록 후 오른쪽(low = 16m) 더 높은 절단기 탐색
```

### 2) 데이터 흐름도

```mermaid
graph TD
    A["초기 범위 설정 (low = minVal, high = maxVal)"] --> B["중앙값 계산: mid = low + (high - low) / 2"]
    B --> C{"결정 함수 검증: isPossible(mid)"}
    C -- "true (조건 만족)" --> D["최적 해 기록: answer = mid"]
    D --> E["범위 상향 (low = mid + 1): 더 큰 정답 탐색"]
    C -- "false (조건 불만족)" --> F["범위 하향 (high = mid - 1): 절반으로 범위 축소"]
    E --> G{"탐색 종료 여부 (low > high)"}
    F --> G
    G -- "아니오 (탐색 계속)" --> B
    G -- "예 (최적 해 확정)" --> H["최종 정답 answer 반환"]
```

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
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법
1. 절단기 높이 범위 `low = 0`, `high = max(treeHeight)`로 설정합니다.
2. `mid` 높이로 잘랐을 때 가져갈 수 있는 나무 길이 합이 `M` 이상인지 검증합니다.

### 완성형 Java 정답 코드
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
                low = mid + 1;
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

1. [백준 2805 — 나무 자르기](https://www.acmicpc.net/problem/2805)
2. [백준 1654 — 랜선 자르기](https://www.acmicpc.net/problem/1654)
3. [구간 스케줄링 & 이분 탐색 DP 정리](http://localhost:3000/study/weighted-interval-scheduling-algorithm)
',
    updated_at = NOW()
WHERE slug = 'parametric-search-algorithm';


-- =========================================================================
-- 2. 유니온 파인드 (Union-Find) - Add ASCII Art
-- =========================================================================
UPDATE study
SET content_markdown = '# 유니온 파인드 (Union-Find / Disjoint Set) 알고리즘 정리

> 원소들을 중복되지 않는 부분집합(Disjoint Set)들로 나누어 관리하며, 두 원소가 같은 집합에 속해 있는지 확인(Find)하고 두 집합을 하나로 합치는(Union) 알고리즘입니다.

---

## 1. 데이터 흐름 및 경로 압축(Path Compression) 아스키 아트 시각화

```text
[경로 압축 전 (깊은 트리)]          [경로 압축 후 (find(4) 수행 시 트리 평평화)]
         (1)                                   (1)
          │                                 ┌──┼──┐
         (2)                                ▼  ▼  ▼
          │                                (2)(3)(4)
         (3)
          │
         (4)  <-- find(4) 호출 시 모든 부모가 직접 루트 (1)을 가리키도록 갱신됨
```

---

## 2. 언제 사용할까?

- 그래프에서 두 정점이 **같은 연결 요소(Connected Component)**에 속해 있는지 판별할 때
- 크루스칼(Kruskal) 알고리즘을 사용해 **최소 신장 트리(MST)**를 만들 때
- 무방향 그래프에서 **사이클(Cycle)** 발생 여부를 실시간으로 감지할 때

---

## 3. 백준 1717: 집합의 표현

[문제 바로가기](https://www.acmicpc.net/problem/1717)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법
1. `parent[i] = i`로 초기화합니다.
2. `union(a, b)`로 두 집합을 합치고, `find(a) == find(b)`로 같은 집합 여부를 판단합니다.

### 완성형 Java 정답 코드
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

## 4. 추천 관련 문제

1. [백준 1717 — 집합의 표현](https://www.acmicpc.net/problem/1717)
2. [백준 1197 — 최소 스패닝 트리](https://www.acmicpc.net/problem/1197)
',
    updated_at = NOW()
WHERE slug = 'union-find-algorithm';


-- =========================================================================
-- 3. 누적 합 (Prefix Sum) - Add ASCII Art
-- =========================================================================
UPDATE study
SET content_markdown = '# 누적 합 (Prefix Sum) & 2차원 누적 합 알고리즘 정리

> 배열이나 2차원 격자에서 특정 구간의 합을 매번 덧셈하지 않고 미리 누적합 배열을 전처리하여 $O(1)$ 시간에 빠르게 구하는 기법입니다.

---

## 1. 데이터 흐름 및 2차원 구간 합 아스키 아트 시각화

```text
(r1, c1)부터 (r2, c2)까지 부분 격자 합 계산 원리:

  0     c1-1        c2
0 ┌───────┬──────────┐
  │  (D)  │   (B)    │
r1-1──────┼──────────┤
  │  (C)  │  [정답]  │  <-- 구하고자 하는 (r1,c1) ~ (r2,c2) 영역
r2└───────┴──────────┘
                      (r2, c2)

공식: Sum = P[r2][c2] - P[r1-1][c2] - P[r2][c1-1] + P[r1-1][c1-1]
```

---

## 2. 백준 11660: 구간 합 구하기 5

[문제 바로가기](https://www.acmicpc.net/problem/11660)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 완성형 Java 정답 코드
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
',
    updated_at = NOW()
WHERE slug = 'prefix-sum-algorithm';


-- =========================================================================
-- 4. DFS & BFS - Add ASCII Art Delta Grid
-- =========================================================================
UPDATE study
SET content_markdown = '# DFS & BFS (깊이/너비 우선 탐색) 알고리즘 정리

> 그래프나 2차원 격자 지도에서 모든 정점을 방문하는 대표적인 두 가지 기본 탐색 알고리즘입니다.

---

## 1. 격자 지도 4방향 이동 아스키 아트 시각화

```text
                  [상: r-1, c] (d=0)
                       ▲
                       │
  [좌: r, c-1] ◀── [r, c] ──▶ [우: r, c+1]
   (d=2)               │       (d=3)
                       ▼
                  [하: r+1, c] (d=1)
```

```java
// 상, 하, 좌, 우 델타 이동 배열
static final int[] DR = {-1, 1, 0, 0};
static final int[] DC = {0, 0, -1, 1};
```

---

## 2. 백준 2178: 미로 탐색 (BFS)

[문제 바로가기](https://www.acmicpc.net/problem/2178)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

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
',
    updated_at = NOW()
WHERE slug = 'dfs-bfs-algorithm';


-- =========================================================================
-- 5. 0-1 BFS - Add ASCII Art Deque
-- =========================================================================
UPDATE study
SET content_markdown = '# 0-1 BFS & 덱 (0-1 BFS using Deque) 알고리즘 정리

> 간선 가중치가 오직 0 또는 1로만 구성된 그래프에서 일반 다익스트라(PriorityQueue)보다 빠른 $O(V + E)$ 시간에 최단 경로를 탐색하는 알고리즘 기법입니다.

---

## 1. Deque(양방향 큐) 구조 아스키 아트 시각화

```text
Deque (Double-Ended Queue):
┌─────────────────────────────────────────────────────────────┐
│ ◀-- [offerFirst()]        [노드 탐색]        [offerLast()] --▶ │
│    비용 0 이동 (직진)                       비용 1 이동 (회전)   │
└─────────────────────────────────────────────────────────────┘
  ▲ (우선 순위 가장 높게 처리)               ▲ (다음 레벨 처리)
```

---

## 2. 백준 13549: 숨바꼭질 3

[문제 바로가기](https://www.acmicpc.net/problem/13549)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

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
',
    updated_at = NOW()
WHERE slug = 'zero-one-bfs-algorithm';
