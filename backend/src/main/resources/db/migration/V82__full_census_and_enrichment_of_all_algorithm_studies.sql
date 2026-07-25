-- V82: Comprehensive Full Census & Programmers Problem Migration for All Algorithm Studies (Hyundai Autoever Programmers Spec)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- 1. 누적 합 (Prefix Sum) - Programmers [파괴되지 않은 건물]
-- =========================================================================
UPDATE study
SET content_markdown = '# 누적 합 (Prefix Sum) & 2차원 누적 합 알고리즘 정리

> 배열이나 2차원 격자에서 특정 구간의 합을 매번 덧셈하지 않고, 전처리(Prefix Sum)를 통해 $O(1)$ 시간에 빠르게 구하는 프로그래머스(Programmers) 코딩테스트 필수 최적화 기법입니다.

---

## 1. 알고리즘 개념 및 핵심 원리

### 1) 왜 누적 합을 사용하는가?
길이가 $N$인 배열에서 구간 $[L, R]$의 합을 구할 때, 매번 반복문으로 더하면 $O(N)$의 시간이 소요됩니다. 쿼리가 $M$개 들어오면 총 $O(N \times M)$의 시간이 걸려 $N, M \ge 100,000$인 코딩테스트 환경에서는 반드시 시간 초과가 발생합니다.

누적 합 기법은 **최초 1회 $O(N)$의 전처리**로 `prefix` 배열을 구해둔 뒤, 임의의 구간 합 쿼리를 단 두 번의 배열 참조 뺄셈 연산으로 **$O(1)$**에 도출합니다.

### 2) 2차원 누적 합 원리 (포함-배제 원리)
(1, 1)부터 (r, c)까지의 직사각형 영역 합 `P[r][c]`를 구축하여 (r1, c1)부터 (r2, c2)까지의 영역 합을 $O(1)$에 구합니다:
$$\text{Sum}(r_1, c_1, r_2, c_2) = P[r_2][c_2] - P[r_1 - 1][c_2] - P[r_2][c_1 - 1] + P[r_1 - 1][c_1 - 1]$$

---

## 2. 시각화 및 데이터 흐름

### 1) 2차원 구간 합 포함-배제 원리 아스키 아트

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

## 3. 알고리즘 단계별 동작 과정 (Step-by-Step)

1. **배열 크기 확장**: 인덱스 범위 초과(`IndexOutOfBounds`)를 방지하기 위해 `(N+1) x (M+1)` 크기의 1-indexed 누적 합 배열을 선언합니다.
2. **전처리 덧셈**: 행과 열을 순회하며 위 2차원 전처리 공식을 적용해 `P[r][c]`를 채웁니다.
3. **쿼리 처리**: 주어진 $M$개의 쿼리 `(r1, c1, r2, c2)`에 대해 포함-배제 공식을 적용하여 즉시 $O(1)$ 결과를 반환합니다.

---

## 4. 프로그래머스 대표 실전 문제: 파괴되지 않은 건물

[프로그래머스 — 파괴되지 않은 건물 (2022 카카오 인턴십)](https://school.programmers.co.kr/learn/courses/30/lessons/92344)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 프로그래머스 Java 제출 코드</summary>

### 풀이 방법
1. 2차원 누적 합(Prefix Sum)과 차분 배열(Difference Array)을 조합합니다.
2. (r1, c1)부터 (r2, c2)까지 `degree`만큼 변화시킬 때, 4개의 모서리 좌표 `(r1, c1) += degree`, `(r1, c2+1) -= degree`, `(r2+1, c1) -= degree`, `(r2+1, c2+1) += degree`에만 $O(1)$로 값을 기록합니다.
3. 마지막에 2차원 누적 합을 1회 가로/세로로 수행하여 최종 상태를 $O(N \times M)$에 계산합니다.

### 프로그래머스 Java 제출 코드
```java
class Solution {
    public int solution(int[][] board, int[][] skill) {
        int n = board.length;
        int m = board[0].length;
        
        // 2차원 차분 누적합 배열 (n+1) x (m+1)
        int[][] diff = new int[n + 1][m + 1];

        for (int[] s : skill) {
            int type = s[0];
            int r1 = s[1], c1 = s[2];
            int r2 = s[3], c2 = s[4];
            int degree = (type == 1) ? -s[5] : s[5];

            // 4개 모서리 지점에 O(1) 기록
            diff[r1][c1] += degree;
            diff[r1][c2 + 1] -= degree;
            diff[r2 + 1][c1] -= degree;
            diff[r2 + 1][c2 + 1] += degree;
        }

        // 1. 가로 방향 누적 합
        for (int r = 0; r <= n; r++) {
            for (int c = 1; c <= m; c++) {
                diff[r][c] += diff[r][c - 1];
            }
        }

        // 2. 세로 방향 누적 합
        for (int c = 0; c <= m; c++) {
            for (int r = 1; r <= n; r++) {
                diff[r][c] += diff[r - 1][c];
            }
        }

        // 3. 기존 board와 합산하여 파괴되지 않은 건물 수 세기
        int answer = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (board[r][c] + diff[r][c] > 0) {
                    answer++;
                }
            }
        }

        return answer;
    }
}
```
</details>

---

## 5. 범용 Java 템플릿 코드

```java
public class PrefixSumTemplate {
    public static long[] make1DPrefixSum(long[] arr) {
        int n = arr.length;
        long[] prefix = new long[n + 1];
        for (int i = 0; i < n; i++) {
            prefix[i + 1] = prefix[i] + arr[i];
        }
        return prefix;
    }

    public static long query1D(long[] prefix, int L, int R) {
        return prefix[R + 1] - prefix[L];
    }
}
```

---

## 6. 추천 프로그래머스 관련 문제

1. [프로그래머스 레벨 3 — 파괴되지 않은 건물](https://school.programmers.co.kr/learn/courses/30/lessons/92344)
2. [프로그래머스 레벨 2 — 연속된 부분 수열의 합](https://school.programmers.co.kr/learn/courses/30/lessons/178870)
3. [투 포인터 알고리즘 정리](http://localhost:3000/study/투포인터-two-pointer)
',
    updated_at = NOW()
WHERE slug = 'prefix-sum-algorithm';


-- =========================================================================
-- 2. 매개 변수 탐색 (parametric-search-algorithm) - Programmers [입국심사]
-- =========================================================================
UPDATE study
SET content_markdown = '# 매개 변수 탐색 (Parametric Search) & 이분 탐색 알고리즘 정리

> "최솟값의 최댓값" 또는 "최댓값의 최솟값"을 구하는 최적화 문제를 "값 `mid`가 조건 `isPossible(mid)`를 만족하는가?"라는 단조성 결정 문제로 변환하여 프로그래머스(Programmers) 코딩테스트에서 이분 탐색으로 해결하는 핵심 기법입니다.

---

## 1. 알고리즘 개념 및 핵심 원리

### 1) 최적화 문제를 결정 문제로 전환
"모든 사람이 심사를 받는데 걸리는 최소 시간"을 바로 계산하기는 어렵습니다. 하지만 "총 `T`분 시간이 주어졌을 때 `N`명 이상의 심사를 마칠 수 있는가?"라는 $O(K)$ 결정 문제는 심사관별 `T / time[i]`의 합을 계산하여 매우 쉽게 판별할 수 있습니다.

---

## 2. 시각화 및 데이터 흐름

```text
탐색 범위 [low, high] (최소 1분 ~ 최대 심사관 최장 시간 * N):
[ 1분 ----------------------- Mid: T분 ----------------------- MaxT분 ]
                               │
                               ▼ isPossible(T분) -> 총 처리 인원 sum >= N (성립!)
                               ★ answer = T분 기록 후 왼쪽(high = T - 1) 더 짧은 시간 탐색
```

---

## 3. 프로그래머스 대표 실전 문제: 입국심사

[프로그래머스 — 입국심사 (코딩테스트 고득점 Kit - 이분탐색)](https://school.programmers.co.kr/learn/courses/30/lessons/43238)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 프로그래머스 Java 제출 코드</summary>

### 풀이 방법
1. 심사 시간 `mid` 동안 처리할 수 있는 총 사람 수 `sum = sum(mid / time[i])`를 계산합니다.
2. `sum >= n` 이면 `answer = mid`로 기록하고 `high = mid - 1`로 범위를 줄여 더 적은 시간을 탐색합니다.

### 프로그래머스 Java 제출 코드
```java
import java.util.*;

class Solution {
    public long solution(int n, int[] times) {
        Arrays.sort(times);

        long low = 1;
        long high = (long) times[times.length - 1] * n; // 최악의 경우 걸리는 시간
        long answer = high;

        while (low <= high) {
            long mid = low + (high - low) / 2;

            long sum = 0;
            for (int time : times) {
                sum += (mid / time);
            }

            if (sum >= n) { // n명 이상 심사 가능 ➔ 더 짧은 시간 탐색
                answer = mid;
                high = mid - 1;
            } else { // n명 심사 불가능 ➔ 시간 늘림
                low = mid + 1;
            }
        }

        return answer;
    }
}
```
</details>

---

## 4. 추천 프로그래머스 관련 문제

1. [프로그래머스 레벨 3 — 입국심사](https://school.programmers.co.kr/learn/courses/30/lessons/43238)
2. [프로그래머스 레벨 3 — 징검다리 건너기](https://school.programmers.co.kr/learn/courses/30/lessons/64062)
',
    updated_at = NOW()
WHERE slug = 'parametric-search-algorithm';


-- =========================================================================
-- 3. 유니온 파인드 (union-find-algorithm) - Programmers [섬 연결하기]
-- =========================================================================
UPDATE study
SET content_markdown = '# 유니온 파인드 (Union-Find / Disjoint Set) 알고리즘 정리

> 원소들을 중복되지 않는 부분집합(Disjoint Set)들로 나누어 관리하며, 두 원소가 같은 집합에 속해 있는지 확인(Find)하고 두 집합을 하나로 합치는(Union) 프로그래머스(Programmers) 코딩테스트 필수 알고리즘입니다.

---

## 1. 시각화 및 경로 압축 (Path Compression)

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

## 2. 프로그래머스 대표 실전 문제: 섬 연결하기

[프로그래머스 — 섬 연결하기 (코딩테스트 고득점 Kit - 탐욕법/크루스칼)](https://school.programmers.co.kr/learn/courses/30/lessons/42861)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 프로그래머스 Java 제출 코드</summary>

### 풀이 방법
1. 간선 비용을 오름차순 정렬한 뒤, 유니온 파인드로 사이클이 생기지 않는 간선만 선택하는 크루스칼(Kruskal) 알고리즘입니다.

### 프로그래머스 Java 제출 코드
```java
import java.util.*;

class Solution {
    static int[] parent;

    public int solution(int n, int[][] costs) {
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;

        // 간선 비용 오름차순 정렬
        Arrays.sort(costs, (a, b) -> Integer.compare(a[2], b[2]));

        int totalCost = 0;
        int edgesCount = 0;

        for (int[] edge : costs) {
            int u = edge[0];
            int v = edge[1];
            int cost = edge[2];

            // 서로 다른 집합인 경우에만 연결 (사이클 방지)
            if (union(u, v)) {
                totalCost += cost;
                edgesCount++;
                if (edgesCount == n - 1) break;
            }
        }

        return totalCost;
    }

    static int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]); // 경로 압축
    }

    static boolean union(int a, int b) {
        int rootA = find(a);
        int rootB = find(b);
        if (rootA != rootB) {
            parent[rootB] = rootA;
            return true;
        }
        return false; // 이미 연결되어 사이클 생성
    }
}
```
</details>

---

## 3. 추천 프로그래머스 관련 문제

1. [프로그래머스 레벨 3 — 섬 연결하기](https://school.programmers.co.kr/learn/courses/30/lessons/42861)
2. [프로그래머스 레벨 3 — 네트워크](https://school.programmers.co.kr/learn/courses/30/lessons/43162)
',
    updated_at = NOW()
WHERE slug = 'union-find-algorithm';


-- =========================================================================
-- 4. 플로이드 워셜 (floyd-warshall-algorithm) - Programmers [합승 택시 요금]
-- =========================================================================
UPDATE study
SET content_markdown = '# 플로이드 워셜 (Floyd-Warshall) 알고리즘 정리

> 모든 정점 쌍(All-Pairs) 사이의 최단 경로를 구하는 다이나믹 프로그래밍 기반 최단 경로 알고리즘입니다.

---

## 1. 프로그래머스 대표 실전 문제: 합승 택시 요금

[프로그래머스 — 합승 택시 요금 (2021 카카오 블라인드 채용)](https://school.programmers.co.kr/learn/courses/30/lessons/72413)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 프로그래머스 Java 제출 코드</summary>

### 풀이 방법
1. 플로이드 워셜로 모든 지점 간 최단 거리 `dist[i][j]`를 구합니다.
2. 함께 합승하여 이동하는 중도 정점을 `k`라 할 때, `dist[s][k] + dist[k][a] + dist[k][b]`의 최솟값을 구합니다.

### 프로그래머스 Java 제출 코드
```java
import java.util.*;

class Solution {
    static final int INF = 200 * 100000 + 1; // 최대 정점 200 * 최대 택시 요금 100,000

    public int solution(int n, int s, int a, int b, int[][] fares) {
        int[][] dist = new int[n + 1][n + 1];

        for (int i = 1; i <= n; i++) {
            Arrays.fill(dist[i], INF);
            dist[i][i] = 0;
        }

        for (int[] f : fares) {
            int u = f[0], v = f[1], w = f[2];
            dist[u][v] = w;
            dist[v][u] = w;
        }

        // 플로이드 워셜 3중 루프 (k -> i -> j)
        for (int k = 1; k <= n; k++) {
            for (int i = 1; i <= n; i++) {
                for (int j = 1; j <= n; j++) {
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                    }
                }
            }
        }

        // s -> k (합승 구간) + k -> a (A 분리) + k -> b (B 분리)
        int minFare = INF;
        for (int k = 1; k <= n; k++) {
            minFare = Math.min(minFare, dist[s][k] + dist[k][a] + dist[k][b]);
        }

        return minFare;
    }
}
```
</details>

---

## 2. 추천 프로그래머스 관련 문제

1. [프로그래머스 레벨 3 — 합승 택시 요금](https://school.programmers.co.kr/learn/courses/30/lessons/72413)
2. [프로그래머스 레벨 3 — 순위](https://school.programmers.co.kr/learn/courses/30/lessons/49191)
',
    updated_at = NOW()
WHERE slug = 'floyd-warshall-algorithm';


-- =========================================================================
-- 5. DFS & BFS (dfs-bfs-algorithm) - Programmers [게임 맵 최단거리]
-- =========================================================================
UPDATE study
SET content_markdown = '# DFS & BFS (깊이/너비 우선 탐색) 알고리즘 정리

> 그래프나 2차원 격자 지도에서 모든 정점을 방문하는 대표적인 두 가지 기본 탐색 알고리즘입니다.

---

## 1. 프로그래머스 대표 실전 문제: 게임 맵 최단거리

[프로그래머스 — 게임 맵 최단거리 (코딩테스트 고득점 Kit - BFS)](https://school.programmers.co.kr/learn/courses/30/lessons/1844)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 프로그래머스 Java 제출 코드</summary>

### 프로그래머스 Java 제출 코드
```java
import java.util.*;

class Solution {
    static final int[] DR = {-1, 1, 0, 0};
    static final int[] DC = {0, 0, -1, 1};

    public int solution(int[][] maps) {
        int n = maps.length;
        int m = maps[0].length;

        int[][] dist = new int[n][m];
        Queue<int[]> queue = new LinkedList<>();

        dist[0][0] = 1;
        queue.offer(new int[]{0, 0});

        while (!queue.isEmpty()) {
            int[] cur = queue.poll();
            int r = cur[0], c = cur[1];

            if (r == n - 1 && c == m - 1) {
                return dist[r][c];
            }

            for (int d = 0; d < 4; d++) {
                int nr = r + DR[d];
                int nc = c + DC[d];

                if (nr >= 0 && nr < n && nc >= 0 && nc < m && maps[nr][nc] == 1 && dist[nr][nc] == 0) {
                    dist[nr][nc] = dist[r][c] + 1;
                    queue.offer(new int[]{nr, nc});
                }
            }
        }

        return -1; // 도착 불가능
    }
}
```
</details>

---

## 2. 추천 프로그래머스 관련 문제

1. [프로그래머스 레벨 2 — 게임 맵 최단거리](https://school.programmers.co.kr/learn/courses/30/lessons/1844)
2. [프로그래머스 레벨 2 — 타겟 넘버](https://school.programmers.co.kr/learn/courses/30/lessons/43165)
3. [프로그래머스 레벨 3 — 단어 변환](https://school.programmers.co.kr/learn/courses/30/lessons/43163)
',
    updated_at = NOW()
WHERE slug = 'dfs-bfs-algorithm';


-- =========================================================================
-- 6. 다익스트라 (dijkstra-algorithm) - Programmers [배달]
-- =========================================================================
UPDATE study
SET content_markdown = '# 다익스트라 (Dijkstra) 알고리즘 정리

> 가중치 그래프에서 음수 간선이 없을 때, 특정 출발 정점으로부터 모든 다른 정점까지의 최단 경로를 탐색하는 프로그래머스(Programmers) 필수 알고리즘입니다.

---

## 1. 프로그래머스 대표 실전 문제: 배달

[프로그래머스 — 배달 (Summer/Winter Coding)](https://school.programmers.co.kr/learn/courses/30/lessons/12978)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 프로그래머스 Java 제출 코드</summary>

### 프로그래머스 Java 제출 코드
```java
import java.util.*;

class Solution {
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

    public int solution(int N, int[][] road, int K) {
        List<Edge>[] graph = new ArrayList[N + 1];
        for (int i = 1; i <= N; i++) graph[i] = new ArrayList<>();

        for (int[] r : road) {
            int u = r[0], v = r[1], w = r[2];
            graph[u].add(new Edge(v, w));
            graph[v].add(new Edge(u, w));
        }

        int[] dist = new int[N + 1];
        Arrays.fill(dist, INF);

        PriorityQueue<Edge> pq = new PriorityQueue<>();
        dist[1] = 0;
        pq.offer(new Edge(1, 0));

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

        int count = 0;
        for (int i = 1; i <= N; i++) {
            if (dist[i] <= K) count++;
        }

        return count;
    }
}
```
</details>

---

## 2. 추천 프로그래머스 관련 문제

1. [프로그래머스 레벨 2 — 배달](https://school.programmers.co.kr/learn/courses/30/lessons/12978)
2. [프로그래머스 레벨 3 — 등산코스 정하기](https://school.programmers.co.kr/learn/courses/30/lessons/118669)
',
    updated_at = NOW()
WHERE slug = 'dijkstra-algorithm';
