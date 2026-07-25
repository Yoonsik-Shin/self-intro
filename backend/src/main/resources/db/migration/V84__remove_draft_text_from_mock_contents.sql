-- V84: Clean up markdown content and summary text by removing '[초안 - DRAFT]' text while keeping DB status = 'DRAFT'

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- 1. 현대오토에버 대비 모의문제 5 — 스마트 팩토리 로봇 수송 안전거리
-- =========================================================================
UPDATE study
SET summary = '현대오토에버 스마트 팩토리 무인 운반차(AGV) 수송 시스템에서 충돌 없이 운행하기 위한 안전거리 최댓값을 구하는 모의문제다. 매개 변수 탐색과 BFS를 결합해 해결하며 정답 보기 토글 내에 자바 코드를 제공한다.',
    content_markdown = '# 현대오토에버 대비 모의문제 5 — 스마트 팩토리 로봇 수송 안전거리

> 공개된 현대오토에버 코딩테스트 후기에서 출제되는 스마트 팩토리(E-FOREST) 물류 관제 경향을 대비하기 위한 모의문제 해설 노트입니다.

---

## 1. 문제 설명

현대오토에버는 완성차 생산 공장에서 무인 운반 로봇(AGV) 관제 시스템을 운영하고 있다.

공장은 `N × M` 크기의 격자로 표현되며, 로봇은 지정된 시작 지점 `(Sr, Sc)`에서 출발하여 부품 조립 라인이 있는 목적지 `(Er, Ec)`까지 이동한다. 공장 내에는 `K`개의 고정 장애물과 다른 정지 작업대가 위치해 있다.

로봇의 크기와 회전 반지름을 고려할 때, 로봇 중심 위치와 가장 가까운 장애물 사이의 거리가 너무 가까우면 안 된다. 여기서 **안전거리 $D$**란 이동 중 로봇이 위치하는 모든 칸에서 가장 가까운 장애물까지의 맨해튼 거리 $\left(|r_1 - r_2| + |c_1 - c_2|\right)$를 의미한다.

출발지에서 목적지까지 이동하는 경로 상에서 **최소 안전거리 $D$의 최댓값**을 구하라. 만약 어떠한 경로로도 목적지에 도달할 수 없다면 `-1`을 출력한다.

---

## 2. 입력 및 제한 조건

### 입력 (프로그래머스 `solution` 함수 매개변수)
- `int n, int m`: 공장 격자의 세로/가로 크기
- `int[][] obstacles`: `K`개 장애물의 좌표 `[r, c]` (0-indexed)
- `int[] start`: 출발 좌표 `[Sr, Sc]`
- `int[] end`: 목적 좌표 `[Er, Ec]`

### 제약 조건
- $2 \\le N, M \\le 500$
- 장애물 개수 $1 \\le K \\le 1,000$
- 시작 지점과 목적지 지점에는 장애물이 존재하지 않는다.

### 예제 입출력
```text
n = 5, m = 5
obstacles = [[1, 2], [3, 3]]
start = [0, 0], end = [4, 4]

결과: 2
```

---

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법 및 문제 접근 아이디어

이 문제는 **매개 변수 탐색 (Parametric Search)**과 **BFS (너비 우선 탐색)**를 결합하여 해결합니다.

1. **안전거리 $D$에 대한 단조성 판별**:
   - 안전거리 $D$가 작을수록 선택 가능한 경로가 늘어나고, $D$가 클수록 이동 가능한 칸이 줄어듭니다.
   - 따라서 "안전거리 $D$를 유지하면서 목적지에 도달할 수 있는가?"라는 `isPossible(D)` 결정 함수로 이분 탐색을 수행합니다.
2. **사전 장애물 거리 계산 (Multi-Source BFS)**:
   - 모든 장애물 지점에서 시작하는 Multi-Source BFS를 1회 실행하여 격자 내 모든 칸 `(r, c)`의 가장 가까운 장애물까지의 거리를 `distToObstacle[r][c]`에 pre-compute 해둡니다.
3. **이분 탐색 + BFS 검증**:
   - `[0, N+M]` 범위에서 이분 탐색을 수행하며, `isPossible(mid)` 내부에서는 `distToObstacle[r][c] >= mid` 인 칸만 지나서 목적지에 도달 가능한지 BFS로 검증합니다.

---

### 완성형 Java 정답 코드 (라인별 상세 주석)

```java
import java.util.*;

class Solution {
    static final int[] DR = {-1, 1, 0, 0};
    static final int[] DC = {0, 0, -1, 1};

    public int solution(int n, int m, int[][] obstacles, int[] start, int[] end) {
        // 1. Multi-Source BFS로 각 칸에서 가장 가까운 장애물까지의 맨해튼 거리 계산
        int[][] distToObstacle = new int[n][m];
        for (int[] row : distToObstacle) Arrays.fill(row, -1);

        Queue<int[]> obsQueue = new LinkedList<>();
        for (int[] obs : obstacles) {
            int r = obs[0], c = obs[1];
            distToObstacle[r][c] = 0;
            obsQueue.offer(new int[]{r, c});
        }

        while (!obsQueue.isEmpty()) {
            int[] cur = obsQueue.poll();
            int r = cur[0], c = cur[1];

            for (int d = 0; d < 4; d++) {
                int nr = r + DR[d];
                int nc = c + DC[d];

                if (nr >= 0 && nr < n && nc >= 0 && nc < m && distToObstacle[nr][nc] == -1) {
                    distToObstacle[nr][nc] = distToObstacle[r][c] + 1;
                    obsQueue.offer(new int[]{nr, nc});
                }
            }
        }

        // 2. 안전거리 D에 대한 매개 변수 탐색 (Parametric Search)
        int low = 0;
        int high = n + m;
        int answer = -1;

        while (low <= high) {
            int mid = low + (high - low) / 2;

            if (canReach(n, m, distToObstacle, start, end, mid)) {
                answer = mid; // 가능한 안전거리 기록
                low = mid + 1; // 더 큰 안전거리 탐색
            } else {
                high = mid - 1; // 안전거리 낮춤
            }
        }

        return answer;
    }

    // 안전거리 limit 이상인 칸만 지나서 목적지에 도착 가능한지 BFS 검증
    private boolean canReach(int n, int m, int[][] distToObstacle, int[] start, int[] end, int limit) {
        if (distToObstacle[start[0]][start[1]] < limit || distToObstacle[end[0]][end[1]] < limit) {
            return false;
        }

        boolean[][] visited = new boolean[n][m];
        Queue<int[]> q = new LinkedList<>();

        visited[start[0]][start[1]] = true;
        q.offer(new int[]{start[0], start[1]});

        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1];

            if (r == end[0] && c == end[1]) return true;

            for (int d = 0; d < 4; d++) {
                int nr = r + DR[d];
                int nc = c + DC[d];

                if (nr >= 0 && nr < n && nc >= 0 && nc < m && !visited[nr][nc]) {
                    if (distToObstacle[nr][nc] >= limit) {
                        visited[nr][nc] = true;
                        q.offer(new int[]{nr, nc});
                    }
                }
            }
        }

        return false;
    }
}
```

### 복잡도 분석
- **시간복잡도**: $O(N \times M \log(N+M))$ (Multi-Source BFS $O(NM)$ + 이분 탐색 $\log(N+M)$ 회의 BFS $O(NM)$)
- **공간복잡도**: $O(N \times M)$ (거리 배열 및 BFS 방문 배열)

</details>

---

## 3. 관련 개념 학습

- [매개 변수 탐색 (Parametric Search) 알고리즘 정리](http://localhost:3000/study/parametric-search-algorithm)
- [DFS & BFS (깊이/너비 우선 탐색) 알고리즘 정리](http://localhost:3000/study/dfs-bfs-algorithm)
',
    updated_at = NOW()
WHERE slug = 'autoever-mock-05-smart-factory-robot-routing';


-- =========================================================================
-- 2. 현대오토에버 대비 모의문제 6 — 차량 OTA 서브시스템 롤백 최적화
-- =========================================================================
UPDATE study
SET summary = '무선 소프트웨어 업데이트(OTA) 중 통신 세션 단절 시 제어기 모듈 간 의존 관계를 보존하며 안정 상태로 롤백하는 모의문제다. 유니온 파인드와 위상 정렬을 결합해 해결하며 자바 정답 코드를 제공한다.',
    content_markdown = '# 현대오토에버 대비 모의문제 6 — 차량 OTA 서브시스템 롤백 최적화

> 공개된 현대오토에버 코딩테스트 후기에서 출제되는 차량 제어기 무선 업데이트(OTA, Over-The-Air) 관제 시스템 경향을 대비하기 위한 모의문제 해설 노트입니다.

---

## 1. 문제 설명

현대오토에버 커넥티드 카 플랫폼은 `N`개의 전자제어기(ECU) 소프트웨어 모듈을 관리한다.

차량 패치 업데이트 도중 네트워크 음영 지역 진입으로 인해 일부 제어기 간 통신 세션이 끊어졌다. 서로 연결된 통신 네트워크 그룹 내에서 의존 관계(`A -> B`: A 모듈 패치가 성공해야 B 모듈 패치 가능)를 검증하려 한다.

1. 서로 무선 통신망으로 연결된 **제어기 서브시스템 클러스터의 개수**를 구하라.
2. 각 서브시스템 클러스터 내부에서 의존성에 무리가 없는 **올바른 롤백 수행 순서**를 구하라. 만약 특정 서브시스템 내에 순환 의존성(Cycle)이 있어 복구가 불가능한 클러스터가 존재한다면 해당 클러스터는 제외한다.

---

## 2. 입력 및 제한 조건

### 입력 (프로그래머스 `solution` 매개변수)
- `int n`: 제어기 모듈 수 (1 ~ `N`)
- `int[][] connections`: 통신망 연결 무방향 간선 `[u, v]`
- `int[][] dependencies`: 의존 관계 유향 간선 `[from, to]`

### 제약 조건
- $1 \\le N \\le 100,000$
- 통신 간선 수 $M \\le 200,000$, 의존 간선 수 $K \\le 200,000$

---

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법 및 문제 접근 아이디어

이 문제는 **유니온 파인드 (Union-Find)**로 네트워크 클러스터를 분리하고, 각 클러스터 내부에서 **위상 정렬 (Topological Sort)**을 수행하여 순서를 결정합니다.

---

### 완성형 Java 정답 코드 (라인별 상세 주석)

```java
import java.util.*;

class Solution {
    static int[] parent;

    public int solution(int n, int[][] connections, int[][] dependencies) {
        parent = new int[n + 1];
        for (int i = 1; i <= n; i++) parent[i] = i;

        // 1. 통신 간선 기반 유니온 파인드로 서브시스템 연결 클러스터 형성
        for (int[] conn : connections) {
            union(conn[0], conn[1]);
        }

        // 2. 클러스터별 정점 그룹화
        Map<Integer, List<Integer>> clusters = new HashMap<>();
        for (int i = 1; i <= n; i++) {
            int root = find(i);
            clusters.computeIfAbsent(root, k -> new ArrayList<>()).add(i);
        }

        int validClusterCount = 0;

        // 3. 각 클러스터 내부에서 위상 정렬을 수행하여 사이클(순환 의존성) 여부 검증
        for (int root : clusters.keySet()) {
            List<Integer> nodes = clusters.get(root);
            if (isDAG(nodes, dependencies)) {
                validClusterCount++;
            }
        }

        return validClusterCount;
    }

    static int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]);
    }

    static void union(int a, int b) {
        int rA = find(a);
        int rB = find(b);
        if (rA != rB) parent[rB] = rA;
    }

    private boolean isDAG(List<Integer> nodes, int[][] dependencies) {
        Set<Integer> nodeSet = new HashSet<>(nodes);
        Map<Integer, Integer> indegree = new HashMap<>();
        Map<Integer, List<Integer>> graph = new HashMap<>();

        for (int node : nodes) {
            indegree.put(node, 0);
            graph.put(node, new ArrayList<>());
        }

        for (int[] dep : dependencies) {
            int u = dep[0], v = dep[1];
            if (nodeSet.contains(u) && nodeSet.contains(v)) {
                graph.get(u).add(v);
                indegree.put(v, indegree.get(v) + 1);
            }
        }

        Queue<Integer> q = new LinkedList<>();
        for (int node : nodes) {
            if (indegree.get(node) == 0) q.offer(node);
        }

        int processed = 0;
        while (!q.isEmpty()) {
            int cur = q.poll();
            processed++;

            for (int next : graph.get(cur)) {
                indegree.put(next, indegree.get(next) - 1);
                if (indegree.get(next) == 0) {
                    q.offer(next);
                }
            }
        }

        return processed == nodes.size();
    }
}
```

### 복잡도 분석
- **시간복잡도**: $O(N + M + K)$ (유니온 파인드 및 각 클러스터별 위상 정렬)
- **공간복잡도**: $O(N + M + K)$

</details>

---

## 3. 관련 개념 학습

- [유니온 파인드 (Union-Find) 알고리즘 정리](http://localhost:3000/study/union-find-algorithm)
- [위상 정렬 (Topological Sort) 알고리즘 정리](http://localhost:3000/study/topological-sort-algorithm)
',
    updated_at = NOW()
WHERE slug = 'autoever-mock-06-ota-subsystem-rollback';


-- =========================================================================
-- 3. 현대오토에버 대비 모의문제 7 — 라이다 센서 밀도 구간 필터링
-- =========================================================================
UPDATE study
SET summary = '자율주행 시험로 격자에서 라이다(LiDAR) 포인트 밀도가 임계값 이상인 최대 정사각형 서브 영역을 탐색하는 모의문제다. 2차원 누적 합과 이분 탐색을 결합해 해결하며 정답 보기 토글 내에 자바 코드를 제공한다.',
    content_markdown = '# 현대오토에버 대비 모의문제 7 — 라이다 센서 밀도 구간 필터링

> 공개된 현대오토에버 코딩테스트 후기에서 출제되는 자율주행 라이다(LiDAR) 데이터 수집 및 구간 필터링 경향을 대비하기 위한 모의문제 해설 노트입니다.

---

## 1. 문제 설명

자율주차 및 자율주행 시험장은 `N × M` 격자로 표현된다.

각 칸 `(r, c)`에는 센서가 감지한 **포인트 클라우드 수 `grid[r][c]`**가 입력된다. 자율주행 인지 알고리즘의 유효성을 검증하기 위해, **포인트 총합이 `T` 이상인 정사각형 영역의 최소 변의 길이**를 찾으려 한다.

조건을 만족하는 정사각형 영역이 존재하지 않는다면 `-1`을 반환한다.

---

## 2. 입력 및 제한 조건

### 입력 (프로그래머스 `solution` 매개변수)
- `int[][] grid`: `N × M` 센서 데이터 격자 ($1 \\le grid[r][c] \\le 1,000$)
- `int target`: 최소 필요 포인트 총합 `T` ($1 \\le T \\le 1,000,000,000$)

### 제약 조건
- $1 \\le N, M \\le 1,000$

---

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법 및 문제 접근 아이디어

이 문제는 **2차원 누적 합 (2D Prefix Sum)**으로 $O(1)$ 영역합을 구하고, **이분 탐색 (Binary Search)**으로 정사각형 변의 길이 `K`를 탐색하여 해결합니다.

---

### 완성형 Java 정답 코드 (라인별 상세 주석)

```java
class Solution {
    public int solution(int[][] grid, int target) {
        int n = grid.length;
        int m = grid[0].length;

        // 1. 2차원 누적 합 전처리
        long[][] p = new long[n + 1][m + 1];
        for (int r = 1; r <= n; r++) {
            for (int c = 1; c <= m; c++) {
                p[r][c] = p[r - 1][c] + p[r][c - 1] - p[r - 1][c - 1] + grid[r - 1][c - 1];
            }
        }

        // 2. 정사각형 변의 길이 K에 대한 이분 탐색
        int low = 1;
        int high = Math.min(n, m);
        int answer = -1;

        while (low <= high) {
            int k = low + (high - low) / 2;

            if (hasValidSquare(n, m, p, k, target)) {
                answer = k; // 가능한 변의 길이 기록
                high = k - 1; // 더 작은 변의 길이 탐색 (최소 변 길이)
            } else {
                low = k + 1; // 변의 길이 늘림
            }
        }

        return answer;
    }

    private boolean hasValidSquare(int n, int m, long[][] p, int k, int target) {
        for (int r = k; r <= n; r++) {
            for (int c = k; c <= m; c++) {
                long sum = p[r][c] - p[r - k][c] - p[r][c - k] + p[r - k][c - k];
                if (sum >= target) return true;
            }
        }
        return false;
    }
}
```

### 복잡도 분석
- **시간복잡도**: $O(N \times M \log(\min(N, M)))$ (누적 합 전처리 $O(NM)$ + 이분 탐색 $\log(\min(N,M))$ 회의 $O(NM)$ 스캔)
- **공간복잡도**: $O(N \times M)$

</details>

---

## 3. 관련 개념 학습

- [누적 합 (Prefix Sum) & 2차원 누적 합 알고리즘 정리](http://localhost:3000/study/prefix-sum-algorithm)
- [매개 변수 탐색 (Parametric Search) 알고리즘 정리](http://localhost:3000/study/parametric-search-algorithm)
',
    updated_at = NOW()
WHERE slug = 'autoever-mock-07-lidar-sensor-segment-collection';
