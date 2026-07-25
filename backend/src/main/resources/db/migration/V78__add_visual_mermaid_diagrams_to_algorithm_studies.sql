-- V78: Add Rich Mermaid Visual Diagrams and Data Flow Visualizations to Algorithm Concept Studies

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- 1. 매개 변수 탐색 (Parametric Search) - Add Data Flow & Range Shift Visualization
-- =========================================================================
UPDATE study
SET content_markdown = '# 매개 변수 탐색 (Parametric Search) & 이분 탐색 알고리즘 정리

> "최솟값의 최댓값" 또는 "최댓값의 최솟값"을 구하는 최적화 문제를 "값 `mid`가 조건 `isPossible(mid)`를 만족하는가?"라는 단조성 결정 문제로 변환하여 탐색하는 강력한 알고리즘 기법입니다.

---

## 1. 데이터 흐름 및 탐색 범위 시각화

매개 변수 탐색은 탐색 범위 `[low, high]`를 반씩 줄여나가며 결정 함수(`isPossible`)를 검증하는 구조입니다.

```mermaid
graph TD
    subgraph 탐색범위축소데이터흐름 ["탐색 범위 [low, high] 데이터 흐름"]
        A["초기 범위 설정 (low = minVal, high = maxVal)"] --> B["중앙값 계산: mid = low + (high - low) / 2"]
        B --> C{"결정 함수 검증: isPossible(mid)"}
        C -- "true (조건 만족)" --> D["최적 해 기록: answer = mid"]
        D --> E["범위 상향 (low = mid + 1): 더 큰 정답 탐색"]
        C -- "false (조건 불만족)" --> F["범위 하향 (high = mid - 1): 절반으로 범위 축소"]
        E --> G{"탐색 종료 여부 (low > high)"}
        F --> G
        G -- "아니오 (탐색 계속)" --> B
        G -- "예 (최적 해 확정)" --> H["최종 정답 answer 반환"]
    end
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
    updated_at = NOW()
WHERE slug = 'parametric-search-algorithm';


-- =========================================================================
-- 2. 유니온 파인드 (Union-Find) - Add Tree Flattening Path Compression Visualization
-- =========================================================================
UPDATE study
SET content_markdown = '# 유니온 파인드 (Union-Find / Disjoint Set) 알고리즘 정리

> 원소들을 중복되지 않는 부분집합(Disjoint Set)들로 나누어 관리하며, 두 원소가 같은 집합에 속해 있는지 확인(Find)하고 두 집합을 하나로 합치는(Union) 알고리즘입니다.

---

## 1. 데이터 흐름 및 경로 압축(Path Compression) 시각화

유니온 파인드는 탐색 과정에서 부모 노드를 루트로 직접 연결하는 **경로 압축(Path Compression)**을 적용해 트리 높이를 1로 압축합니다.

```mermaid
graph TD
    subgraph 압축전 ["경로 압축 전 (트리 높이가 깊음)"]
        A1["1 (루트)"] --> B1["2"]
        B1 --> C1["3"]
        C1 --> D1["4 (find 대상)"]
    end

    subgraph 압축후 ["경로 압축 후 (모든 노드가 루트 1에 직접 연결)"]
        A2["1 (루트)"] --> B2["2"]
        A2 --> C2["3"]
        A2 --> D2["4"]
    end
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
    updated_at = NOW()
WHERE slug = 'union-find-algorithm';


-- =========================================================================
-- 3. 누적 합 (Prefix Sum) - Add Area Subtraction Inclusion-Exclusion Principle Diagram
-- =========================================================================
UPDATE study
SET content_markdown = '# 누적 합 (Prefix Sum) & 2차원 누적 합 알고리즘 정리

> 배열이나 2차원 격자에서 특정 구간의 합을 매번 덧셈하지 않고 미리 누적합 배열을 전처리하여 $O(1)$ 시간에 빠르게 구하는 기법입니다.

---

## 1. 데이터 흐름 및 2차원 구간 합 영역 포함-배제 원리 시각화

2차원 누적 합은 (r1, c1)부터 (r2, c2)까지의 영역 합을 포함-배제 원리로 $O(1)$ 계산합니다.

```mermaid
graph TD
    subgraph 영역포함배제계산 ["2차원 구간 합 P[r2][c2] 계산 영역"]
        A["전체 영역 P[r2][c2]"] --> B["상단 제외 영역 - P[r1-1][c2]"]
        A --> C["좌측 제외 영역 - P[r2][c1-1]"]
        B --> D["중복 차감 보정 + P[r1-1][c1-1]"]
        C --> D
        D --> E["최종 (r1,c1) ~ (r2,c2) 부분격자 합 도출"]
    end
```

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
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법
1. 2차원 누적 합 배열 `P[r][c]`를 전처리합니다.
2. 쿼리마다 `P[r2][c2] - P[r1-1][c2] - P[r2][c1-1] + P[r1-1][c1-1]` 공식을 적용합니다.

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
3. [투 포인터 알고리즘 정리](http://localhost:3000/study/투포인터-two-pointer) — 슬라이딩 윈도우/투포인터 연동
',
    updated_at = NOW()
WHERE slug = 'prefix-sum-algorithm';


-- =========================================================================
-- 4. DFS & BFS - Add Grid Traversal Order & Delta Movement Diagram
-- =========================================================================
UPDATE study
SET content_markdown = '# DFS & BFS (깊이/너비 우선 탐색) 알고리즘 정리

> 그래프나 2차원 격자 지도에서 모든 정점을 방문하는 대표적인 두 가지 기본 탐색 알고리즘입니다.

---

## 1. 격자 지도 4방향 이동 데이터 흐름 시각화

격자 지도에서 `DR`과 `DC` 델타 배열을 통해 상/하/좌/우로 움직이는 데이터 흐름입니다.

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

## 4. 자주 하는 실수

1. **BFS 큐 삽입 시 방문 처리 누락**: 큐에서 꺼낼 때 `visited`를 체크하면 동일 노드가 큐에 중복으로 수백 개 들어가 **메모리 초과** 발생. 반드시 **큐에 넣을 때(`offer`) 방문 처리**해야 함.

---

## 5. 추천 관련 문제

1. [백준 1260 — DFS와 BFS](https://www.acmicpc.net/problem/1260)
2. [백준 2178 — 미로 탐색](https://www.acmicpc.net/problem/2178)
3. [0-1 BFS & 덱 정리](http://localhost:3000/study/zero-one-bfs-algorithm) — 가중치 0/1 덱 확장 연동
',
    updated_at = NOW()
WHERE slug = 'dfs-bfs-algorithm';
