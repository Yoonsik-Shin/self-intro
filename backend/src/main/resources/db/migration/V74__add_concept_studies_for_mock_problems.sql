-- V74: Add 3 Independent Algorithm Concept Studies for Mock Problems 2, 3, 4

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ensure 'education' category exists
INSERT IGNORE INTO study_category (name, slug, display_order)
VALUES ('공부/학습', 'education', 2);

SET @education_category_id = (
    SELECT id FROM study_category WHERE slug = 'education' OR name = '공부/학습' LIMIT 1
);

-- =========================================================================
-- 1. 위상 정렬 (Topological Sort) 알고리즘 정리 (topological-sort-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'topological-sort-algorithm',
    '위상 정렬 (Topological Sort) 알고리즘 정리',
    '방향성 비순환 그래프(DAG)에서 정점들을 선후 관계에 맞게 일렬로 나열하는 알고리즘이다. 진입 차수(Indegree) 배열과 큐(Queue) 또는 우선순위 큐(PriorityQueue)를 활용해 O(V+E)에 정렬을 수행한다.',
    '# 위상 정렬 (Topological Sort) 알고리즘 정리

> 방향성 비순환 그래프(DAG, Directed Acyclic Graph)에서 순서가 정해져 있는 작업들을 제약 조건에 맞게 차례대로 나열하는 대표적인 그래프 알고리즘입니다.

---

## 1. 위상 정렬 동작 방식

위상 정렬은 **진입 차수(Indegree)** 관리 방식(Kahn''s Algorithm)으로 작동합니다.

```mermaid
graph TD
    A[각 정점의 진입 차수 Indegree 계산] --> B[진입 차수가 0인 정점들을 큐에 삽입]
    B --> C[큐에서 정점을 꺼내어 정렬 결과에 추가]
    C --> D[해당 정점에서 나가는 간선 제거 및 연결 정점 Indegree 1 감소]
    D --> E{새롭게 Indegree가 0이 된 정점이 있는가?}
    E -- 예 --> B
    E -- 아니오 --> F{모든 정점이 정렬되었는가?}
    F -- 예 --> G[위상 정렬 완료]
    F -- 아니오 --> H[그래프에 사이클 Cycle 존재]
```

### 1) 핵심 개념
- **진입 차수 (Indegree)**: 특정 정점으로 들어오는 유향 간선의 개수입니다. (즉, 선행되어야 하는 작업의 수)
- **DAG (Directed Acyclic Graph)**: 위상 정렬은 사이클(Cycle)이 없는 유향 그래프에서만 유효합니다. 사이클이 존재하면 진입 차수가 0이 될 수 없는 정점이 생겨 정렬 불가능 상태가 됩니다.

### 2) 알고리즘 단계
1. 그래프를 인접 리스트로 표현하고 각 정점의 `indegree[]` 배열을 구합니다.
2. `indegree` 값이 `0`인 모든 정점을 큐(Queue)에 넣습니다. (동일 우선순위 조건이 있다면 우선순위 큐 사용)
3. 큐가 빌 때까지 다음을 반복합니다:
   - 큐에서 정점 `u`를 꺼내 정렬 결과 리스트에 추가합니다.
   - `u`에서 나가는 간선 `u -> v`에 대해 `indegree[v]`를 `1` 감소시킵니다.
   - `indegree[v]`가 `0`이 되면 정점 `v`를 큐에 넣습니다.
4. 결과 리스트의 원소 수가 전체 정점 수 $V$와 같으면 정렬 성공, 적다면 사이클이 존재합니다.

---

## 2. 언제 사용할까?

- 작업 간에 **선후 관계(의존성)**가 존재하는 순서 결정 문제
- 선수 과목 이수 체계, 소프트웨어 모듈 빌드/배포 순서, 작업 스케줄링
- 그래프 내 사이클(Cycle) 존재 여부를 판별하고 싶을 때

---

## 3. 백준 2252: 줄 세우기

[문제 바로가기](https://www.acmicpc.net/problem/2252)

학생들의 키를 비교한 일부 결과가 주어졌을 때 학생들을 키 순서대로 줄을 세우는 위상 정렬 표준 기초 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. 키 비교 결과 `A B`는 `A가 B보다 앞에 서야 함(A -> B)`을 의미합니다. `indegree[B]++` 처리합니다.
2. 진입 차수가 0인 학생부터 큐에 넣고 위상 정렬을 수행합니다.

### Java 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int v = Integer.parseInt(st.nextToken());
        int e = Integer.parseInt(st.nextToken());

        int[] indegree = new int[v + 1];
        List<Integer>[] graph = new ArrayList[v + 1];
        for (int i = 1; i <= v; i++) {
            graph[i] = new ArrayList<>();
        }

        for (int i = 0; i < e; i++) {
            st = new StringTokenizer(br.readLine());
            int from = Integer.parseInt(st.nextToken());
            int to = Integer.parseInt(st.nextToken());
            graph[from].add(to);
            indegree[to]++;
        }

        Queue<Integer> queue = new LinkedList<>();
        for (int i = 1; i <= v; i++) {
            if (indegree[i] == 0) queue.offer(i);
        }

        StringBuilder sb = new StringBuilder();
        while (!queue.isEmpty()) {
            int cur = queue.poll();
            sb.append(cur).append(" ");

            for (int next : graph[cur]) {
                indegree[next]--;
                if (indegree[next] == 0) {
                    queue.offer(next);
                }
            }
        }

        System.out.println(sb.toString().trim());
    }
}
```
</details>

---

## 4. 범용 Java 템플릿 코드

```java
import java.util.*;

public class TopologicalSortTemplate {

    /**
     * 위상 정렬 수행 메서드
     * @param v 정점 개수
     * @param graph 방향 그래프 인접 리스트
     * @param indegree 진입 차수 배열
     * @return 정렬 완료된 정점 리스트 (사이클 발생 시 null 반환)
     */
    public static List<Integer> topologicalSort(int v, List<Integer>[] graph, int[] indegree) {
        Queue<Integer> queue = new LinkedList<>();
        List<Integer> result = new ArrayList<>();

        for (int i = 1; i <= v; i++) {
            if (indegree[i] == 0) {
                queue.offer(i);
            }
        }

        while (!queue.isEmpty()) {
            int cur = queue.poll();
            result.add(cur);

            for (int next : graph[cur]) {
                indegree[next]--;
                if (indegree[next] == 0) {
                    queue.offer(next);
                }
            }
        }

        // 방문한 정점 수가 전체 정점 수와 다르면 사이클 존재
        if (result.size() < v) {
            return null;
        }

        return result;
    }
}
```

---

## 5. 자주 하는 실수

1. **동일 번호 선택 조건 시 Queue 사용**: 문제 조건 중 "가능한 모듈/정점 번호가 작은 것을 먼저 배치하라"가 있을 때는 일반 Queue 대신 **우선순위 큐(PriorityQueue)**를 사용해야 함.
2. **사이클 판별 누락**: `result.size() < V` 체크를 누락하면 사이클이 존재함에도 잘못된 부분 결과를 반환할 수 있음.
3. **인접 리스트 중복 간선**: 동일 간선이 여러 번 입력될 경우 `indegree`가 중복으로 증가할 수 있으므로 필요 시 중복 체크 적용.

---

## 6. 추천 관련 문제

1. [백준 2252 — 줄 세우기](https://www.acmicpc.net/problem/2252) — 기본 위상 정렬
2. [백준 1766 — 문제집](https://www.acmicpc.net/problem/1766) — 우선순위 큐 결합 위상 정렬
3. [현대오토에버 대비 모의문제 2 — 차량 SW 배포 순서](http://localhost:3000/study/autoever-mock-02-deployment-orders) — 실전 응용 모의문제
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- 2. 구간 스케줄링 & 이분 탐색 DP (weighted-interval-scheduling-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'weighted-interval-scheduling-algorithm',
    '구간 스케줄링 & 이분 탐색 DP (Weighted Interval Scheduling) 알고리즘 정리',
    '시작 시간, 종료 시간, 가중치(수익)를 가지는 수많은 구간 중 서로 겹치지 않는 구간들을 선택하여 가중치의 합을 최대화하는 알고리즘이다. 종료 시간 정렬 후 이분 탐색(Binary Search)과 동적 계획법(DP)을 결합해 O(N log N)에 해결한다.',
    '# 구간 스케줄링 & 이분 탐색 DP (Weighted Interval Scheduling) 알고리즘 정리

> 시간 구간과 가중치(수익/우선순위)를 지닌 여러 작업 중 서로 시간이 중복되지 않도록 작업을 선택해 총 가중치를 극대화하는 DP 알고리즘 기법입니다.

---

## 1. 동작 방식

구간 스케줄링 DP는 **종료 시간 정렬 + 이분 탐색 + DP**의 3단계로 동작합니다.

```mermaid
graph TD
    A[구간 목록을 종료 시간 End Time 오름차순 정렬] --> B[DP 상태 정의 dp i : i번째 구간까지의 최대 가중치]
    B --> C[현재 구간 i를 선택할 것인가?]
    C -->|선택 안함| D[dp i-1]
    C -->|선택 함| E[구간 i 시작 시간 이하의 종료 시간을 가진 이전 구간을 이분 탐색으로 찾음]
    E --> F[profit i + dp prev]
    D --> G[dp i = max dp i-1, profit i + dp prev]
    F --> G
```

### 1) 종료 시간 정렬의 당위성
구간을 **종료 시간 기준 오름차순**으로 정렬하면, `i`번째 구간 이전의 모든 선택 가능한 구간들은 항상 `i`번째 구간보다 일찍 끝나는 성질이 보장됩니다.

### 2) 이분 탐색을 통한 비중복 구간 탐색
`i`번째 구간(시작 시간 `start_i`)을 선택할 경우, 이 구간과 시간이 겹치지 않는 가장 최근의 구간 `prev`는 `end_prev <= start_i` 조건을 만족해야 합니다. 정렬되어 있으므로 이 `prev` 인덱스는 **이분 탐색(`upper_bound`)**을 통해 $O(\log N)$에 빠르게 찾을 수 있습니다.

### 3) DP 점화식
$$\text{dp}[i] = \max(\text{dp}[i - 1], \text{profit}[i] + \text{dp}[\text{prev}])$$

---

## 2. 언제 사용할까?

- 회의실 배정, 정비 예약, 서버 작업 스케줄링 문제
- 각 작업마다 개별적인 **수익/가중치/우선순위**가 달라서 그리디 단독 선택이 불가능할 때
- 시간이 중복되지 않는 최다 선택 및 최대 이익 구하기

---

## 3. 백준 1931: 회의실 배정 (가중치 동일 버전)

[문제 바로가기](https://www.acmicpc.net/problem/1931)

모든 회의의 가중치가 1일 때 사용할 수 있는 회의실 배정의 그리디 기본 문제 (가중치가 서로 다르면 이분 탐색 DP를 사용합니다).

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
가중치가 모두 동일할 때는 단순 종료 시간 정렬 후 이전 회의 종료 시간과 비교하여 그리디로 선택할 수 있습니다.

### Java 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    static class Meeting implements Comparable<Meeting> {
        int start, end;
        Meeting(int start, int end) {
            this.start = start;
            this.end = end;
        }
        @Override
        public int compareTo(Meeting o) {
            if (this.end == o.end) return Integer.compare(this.start, o.start);
            return Integer.compare(this.end, o.end);
        }
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine());
        Meeting[] meetings = new Meeting[n];

        for (int i = 0; i < n; i++) {
            StringTokenizer st = new StringTokenizer(br.readLine());
            meetings[i] = new Meeting(Integer.parseInt(st.nextToken()), Integer.parseInt(st.nextToken()));
        }

        Arrays.sort(meetings);

        int count = 0;
        int lastEnd = 0;
        for (Meeting m : meetings) {
            if (m.start >= lastEnd) {
                count++;
                lastEnd = m.end;
            }
        }

        System.out.println(count);
    }
}
```
</details>

---

## 4. 범용 Java 템플릿 코드 (가중치 DP 버전)

```java
import java.util.*;

public class WeightedIntervalSchedulingTemplate {
    public static class Interval implements Comparable<Interval> {
        long start, end, weight;
        public Interval(long start, long end, long weight) {
            this.start = start;
            this.end = end;
            this.weight = weight;
        }
        @Override
        public int compareTo(Interval o) {
            return Long.compare(this.end, o.end);
        }
    }

    public static long getMaxWeight(Interval[] intervals) {
        int n = intervals.length;
        Arrays.sort(intervals);

        long[] dp = new long[n];
        dp[0] = intervals[0].weight;

        for (int i = 1; i < n; i++) {
            long currentChoice = intervals[i].weight;
            int prevIdx = binarySearch(intervals, i - 1, intervals[i].start);
            if (prevIdx != -1) {
                currentChoice += dp[prevIdx];
            }

            dp[i] = Math.max(dp[i - 1], currentChoice);
        }

        return dp[n - 1];
    }

    private static int binarySearch(Interval[] intervals, int high, long targetStart) {
        int low = 0, result = -1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (intervals[mid].end <= targetStart) {
                result = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return result;
    }
}
```

---

## 5. 자주 하는 실수

1. **시작 시간 기준 정렬 오답**: 종료 시간이 아닌 시작 시간 기준으로 정렬하면 DP 탐색 시 뒤에 위치한 이전 구간들을 온전히 탐색할 수 없음.
2. **이분 탐색 조건 유의**: `intervals[mid].end <= targetStart` 조건(종료 시각과 다음 시작 시각이 같아도 되는지)을 문제 제약에 맞게 꼼꼼히 확인.

---

## 6. 추천 관련 문제

1. [백준 1931 — 회의실 배정](https://www.acmicpc.net/problem/1931) — 기본 그리디 구간 스케줄링
2. [현대오토에버 대비 모의문제 3 — 정비 예약 최대 매출](http://localhost:3000/study/autoever-mock-03-maintenance-schedule) — 가중치 스케줄링 응용 문제
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- 3. 0-1 BFS & 덱 (zero-one-bfs-algorithm)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'zero-one-bfs-algorithm',
    '0-1 BFS & 덱 (0-1 BFS using Deque) 알고리즘 정리',
    '간선의 가중치가 0과 1로만 이루어진 특수한 그래프에서 최단 경로를 O(V+E) 시간복잡도에 탐색하는 최적화 알고리즘이다. 덱(Deque)을 사용해 가중치 0인 간선은 앞에, 가중치 1인 간선은 뒤에 삽입함으로써 다익스트라 O((V+E)log V)보다 빠르게 해결한다.',
    '# 0-1 BFS & 덱 (0-1 BFS using Deque) 알고리즘 정리

> 간선 가중치가 오직 0 또는 1로만 구성된 그래프에서 일반 다익스트라(PriorityQueue)보다 빠른 $O(V + E)$ 시간에 최단 경로를 탐색하는 알고리즘 기법입니다.

---

## 1. 동작 방식

0-1 BFS는 **덱(Deque, Double-ended Queue)**의 양방향 삽입 특성을 이용합니다.

```mermaid
graph TD
    A[시작 정점 거리 0 지정 및 Deque에 삽입] --> B[Deque의 맨 앞에서 정점 u 꺼냄]
    B --> C[u의 이웃 정점 v로의 이동 비용 탐색]
    C -->|가중치 0 간선| D[dist v = dist u 지정 후 Deque 맨 앞에 삽입 offerFirst]
    C -->|가중치 1 간선| E[dist v = dist u + 1 지정 후 Deque 맨 뒤에 삽입 offerLast]
    D --> F{Deque가 비어있는가?}
    E --> F
    F -- 아니오 --> B
    F -- 예 --> G[최단 거리 탐색 완료]
```

### 1) 왜 다익스트라보다 빠른가?
일반 다익스트라는 최소 거리를 찾기 위해 우선순위 큐(Min-Heap)를 사용하여 큐 삽입/삭제 시 $O(\log V)$가 소요됩니다.
하지만 간선 가중치가 0과 1뿐이라면, 덱(Deque)을 사용할 때 **덱 내부의 거리 값은 항상 단조 증가($d, d+1$) 상태가 유지**됩니다.
- 가중치 `0`인 이동: 덱의 맨 앞(`offerFirst`)에 넣어 현재 거리 `d`인 노드들과 함께 가장 먼저 처리.
- 가중치 `1`인 이동: 덱의 맨 뒤(`offerLast`)에 넣어 다음 거리 `d+1` 노드로 순차 처리.

이로써 힙 정렬 없이 **$O(V + E)$**의 선형 시간에 최단 경로를 탐색합니다.

---

## 2. 언제 사용할까?

- 간선 비용/가중치가 오직 **0 또는 1**로만 구성된 최단 경로 문제
- 격자 지도에서 **직진(비용 0)**과 **방향 회전/조향(비용 1)**
- 격자 탐색 중 **순수 이동(비용 0)**과 **벽 부수기/거울 설치(비용 1)**
- 3차원 상태 `(row, col, direction)`를 1차원 정수로 압축할 필요가 있을 때

---

## 3. 백준 13549: 숨바꼭질 3

[문제 바로가기](https://www.acmicpc.net/problem/13549)

순간이동(`2*X`) 시 0초, 걷기(`X-1`, `X+1`) 시 1초가 걸리는 0-1 BFS의 대표적 교과서 문제입니다.

<details>
<summary>풀이 방법 및 Java 코드</summary>

### 풀이 방법
1. 순간이동(`2*X`, 비용 0)은 덱의 앞에 `offerFirst`합니다.
2. 걷기(`X-1`, `X+1`, 비용 1)는 덱의 뒤에 `offerLast`합니다.

### Java 코드
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
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- =========================================================================
-- Study Relations Linking (Mock Problem -> Concept Study)
-- =========================================================================
INSERT INTO study_relation (source_study_id, target_study_id, relation_type, display_order)
SELECT source_study.id, target_study.id, 'FOLLOW_UP', 0
FROM study source_study, study target_study
WHERE source_study.slug = 'autoever-mock-02-deployment-orders'
  AND target_study.slug = 'topological-sort-algorithm'
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);

INSERT INTO study_relation (source_study_id, target_study_id, relation_type, display_order)
SELECT source_study.id, target_study.id, 'FOLLOW_UP', 0
FROM study source_study, study target_study
WHERE source_study.slug = 'autoever-mock-03-maintenance-schedule'
  AND target_study.slug = 'weighted-interval-scheduling-algorithm'
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);

INSERT INTO study_relation (source_study_id, target_study_id, relation_type, display_order)
SELECT source_study.id, target_study.id, 'FOLLOW_UP', 0
FROM study source_study, study target_study
WHERE source_study.slug = 'autoever-mock-04-minimum-steering'
  AND target_study.slug = 'zero-one-bfs-algorithm'
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);
