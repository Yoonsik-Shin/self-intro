-- V70: Update 현대오토에버 대비 모의문제 1 (autoever-mock-01-required-checkpoints) Study content with annotated solution and reference to algorithm study

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE study
SET title = '현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카',
    summary = '필수 점검소를 모두 방문하는 최소 운행 시간을 구하는 현대오토에버 모의문제 해설 노마다. 풀이 전략과 세부 한글 주석이 포함된 완성형 Java 해설 코드를 제공하며, 관련 핵심 알고리즘(비트마스크 DP & 다익스트라) 상세 개념 노트와 연결된다.',
    content_markdown = '# 현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카

> 공개된 현대오토에버 코딩테스트 후기에서 출제된 조건부 최단 경로와 DP 결합 경향을 대비하기 위한 모의문제 상세 해설 노트입니다.
> 💡 본 문제의 기반이 되는 알고리즘 개념은 **[비트마스크 DP & 다익스트라 알고리즘 정리](http://localhost:3000/study/bitmask-dp-dijkstra-algorithm)** 노트를 함께 참고하세요.

---

## 1. 문제 정의 및 예제

### 문제 설명
현대오토에버는 새로운 차량 관제 시스템을 검증하기 위해 테스트카를 운행한다.

도로망에는 `N`개의 지점과 `M`개의 양방향 도로가 있다. 각 도로를 통과하는 데 필요한 시간은 서로 다를 수 있다. 테스트카는 `1`번 지점에서 출발해 `N`번 지점으로 이동해야 한다.

운행 중에는 지정된 `K`개의 필수 점검소를 모두 한 번 이상 방문해야 한다. 점검소를 방문하는 순서는 자유이며, 같은 지점이나 도로를 여러 번 지나도 된다.

모든 필수 점검소를 방문한 뒤 `N`번 지점에 도착하는 최소 시간을 구하라. 이동할 수 없다면 `-1`을 출력한다.

### 입력
첫째 줄에 지점 수 `N`, 도로 수 `M`, 필수 점검소 수 `K`가 주어진다.
둘째 줄에 서로 다른 필수 점검소 번호 `K`개가 주어진다.
다음 `M`개 줄에는 도로의 양 끝점 `u`, `v`와 이동 시간 `w`가 주어진다.

```text
N M K
c1 c2 ... cK
u1 v1 w1
...
uM vM wM
```

### 제한 조건
- $2 \\le N \\le 100,000$ (지점 수)
- $1 \\le M \\le 200,000$ (도로 수)
- $1 \\le K \\le 8$ (필수 점검소 수 $\\rightarrow$ 비트마스크 DP 적용의 강력한 힌트!)
- $1 \\le w \\le 1,000,000$ (도로 가중치)
- 필수 점검소는 `1`번과 `N`번이 아니다.
- 동일한 두 지점을 연결하는 도로가 여러 개 존재할 수 있다.
- 정답은 `int` 범위를 초과할 수 있으므로 `long` 타입을 사용한다.

### 예제 입출력
```text
입력:
5 6 2
2 4
1 2 2
2 3 2
3 5 3
1 4 5
4 3 1
2 4 2

출력:
8
```
*설명*: 테스트카는 `1 → 2 → 4 → 3 → 5` 순서로 이동할 수 있다. 총 이동 시간은 `2 + 2 + 1 + 3 = 8`이다.

---

## 2. 문제 접근 및 풀이 단계

1. **중요 지점 축소 (Dijkstra)**:
   - 전체 지점 수 $N=100,000$인 그래프를 한 번에 비트마스크 탐색할 수 없다.
   - 출발점(`1`), 필수 점검소 $K$개, 도착점(`N`) 총 $(K+2)$개 중요 지점에서 다익스트라를 $(K+2)$번 수행하여 지점 간 최단 거리 테이블 `between[i][j]`를 구한다.
2. **방문 순서 최적화 (Bitmask DP)**:
   - $K \le 8$이므로 점검소 방문 집합을 비트마스크(`mask`)로 표현한다.
   - `dp[mask][last]` (방문 집합 `mask`, 마지막 위치 `last`) 점화식으로 최단 이동 시간을 갱신한다.
3. **최종 답 도출**:
   - `fullMask` (모든 점검소 방문 완료) 상태에서 `N`번 도착점으로 이동하는 최솟값을 구한다.

---

## 3. Java 정답 코드 & 세부 한글 주석 (Detailed Annotated Solution)

```java
import java.io.*;
import java.util.*;

public class Main {
    // 덧셈 연산 시 오버플로우(Overflow)를 방지하기 위해 Long.MAX_VALUE / 4로 설정
    static final long INF = Long.MAX_VALUE / 4;

    // 도로망의 간선 정보를 나타내는 클래스
    static class Edge {
        int to;      // 도착 지점 번호
        int weight;  // 통과 시간 (가중치)

        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    // 다익스트라 우선순위 큐(PriorityQueue) 탐색 상태 클래스
    static class State implements Comparable<State> {
        int node;       // 현재 위치한 지점 번호
        long distance;  // 출발 지점으로부터 현재 지점까지의 최단 누적 시간

        State(int node, long distance) {
            this.node = node;
            this.distance = distance;
        }

        // 최단 거리가 짧은 노드가 먼저 선택되도록 오름차순 정렬
        @Override
        public int compareTo(State other) {
            return Long.compare(this.distance, other.distance);
        }
    }

    // 그래프 인접 리스트
    static List<Edge>[] graph;

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken()); // 지점 수 N
        int m = Integer.parseInt(st.nextToken()); // 도로 수 M
        int k = Integer.parseInt(st.nextToken()); // 필수 점검소 수 K

        // [중요 지점 인덱스 배열 구성]
        // important[0] : 출발점 (1번 지점)
        // important[1 ~ K] : 필수 점검소 지점 번호들
        // important[K + 1] : 도착점 (N번 지점)
        int[] important = new int[k + 2];
        important[0] = 1;
        important[k + 1] = n;

        st = new StringTokenizer(br.readLine());
        for (int i = 0; i < k; i++) {
            important[i + 1] = Integer.parseInt(st.nextToken());
        }

        // 인접 리스트 생성 및 양방향 도로 가중치 저장
        graph = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) {
            graph[i] = new ArrayList<>();
        }

        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int from = Integer.parseInt(st.nextToken());
            int to = Integer.parseInt(st.nextToken());
            int weight = Integer.parseInt(st.nextToken());

            graph[from].add(new Edge(to, weight));
            graph[to].add(new Edge(from, weight));
        }

        // [1단계: (K+2)개 중요 지점 사이의 다익스트라 최단 거리 테이블 구축]
        // between[i][j] : important[i] 지점에서 important[j] 지점까지의 최단 거리
        long[][] between = new long[k + 2][k + 2];
        for (int i = 0; i < k + 2; i++) {
            long[] distance = dijkstra(important[i], n);
            for (int j = 0; j < k + 2; j++) {
                between[i][j] = distance[important[j]];
            }
        }

        // [2단계: 비트마스크 DP 준비]
        // fullMask : K개의 모든 점검소를 방문한 비트 상태 (예: K=3 ➔ 0b111 = 7)
        int fullMask = (1 << k) - 1;

        // dp[mask][last] : 방문한 점검소 집합 비트가 mask이고, 마지막으로 위치한 점검소가 last일 때의 최소 시간
        long[][] dp = new long[1 << k][k];
        for (long[] row : dp) {
            Arrays.fill(row, INF);
        }

        // [기초 상태 초기화]
        // 출발점(important[0])에서 첫 점검소(important[i+1])로 직접 이동하는 경우
        for (int i = 0; i < k; i++) {
            dp[1 << i][i] = between[0][i + 1];
        }

        // [DP 상태 전이 루프]
        for (int mask = 1; mask <= fullMask; mask++) {
            for (int last = 0; last < k; last++) {
                // 도달할 수 없는 상태는 스킵
                if (dp[mask][last] >= INF) {
                    continue;
                }

                // 다음으로 방문할 점검소 next 선택
                for (int next = 0; next < k; next++) {
                    // 이미 현재 mask에 포함된 점검소라면 건너뜀 (AND 비트 연산)
                    if ((mask & (1 << next)) != 0) {
                        continue;
                    }

                    // next 점검소를 추가로 방문 처리 (OR 비트 연산)
                    int nextMask = mask | (1 << next);

                    // last 점검소에서 next 점검소로 이동하는 시간 누적
                    long candidate = dp[mask][last] + between[last + 1][next + 1];

                    // 최소 시간으로 DP 값 갱신
                    dp[nextMask][next] = Math.min(dp[nextMask][next], candidate);
                }
            }
        }

        // [3단계: 최종 N번 도착점으로 이동하는 최솟값 도출]
        long answer = INF;
        for (int last = 0; last < k; last++) {
            if (dp[fullMask][last] < INF && between[last + 1][k + 1] < INF) {
                answer = Math.min(answer, dp[fullMask][last] + between[last + 1][k + 1]);
            }
        }

        // 이동이 불가능한 경우 -1, 가능한 경우 최소 시간 출력
        System.out.println(answer >= INF ? -1 : answer);
    }

    /**
     * 다익스트라(Dijkstra) 최단 경로 알고리즘
     */
    static long[] dijkstra(int start, int n) {
        long[] distance = new long[n + 1];
        Arrays.fill(distance, INF);

        PriorityQueue<State> queue = new PriorityQueue<>();
        distance[start] = 0;
        queue.offer(new State(start, 0));

        while (!queue.isEmpty()) {
            State current = queue.poll();

            // 이미 처리된 낡은 거리는 스킵
            if (current.distance != distance[current.node]) {
                continue;
            }

            for (Edge edge : graph[current.node]) {
                long nextDistance = current.distance + edge.weight;

                if (nextDistance < distance[edge.to]) {
                    distance[edge.to] = nextDistance;
                    queue.offer(new State(edge.to, nextDistance));
                }
            }
        }

        return distance;
    }
}
```

---

## 4. 핵심 복잡도 요약

- **시간복잡도**: $O((K + 2)(N + M) \log N + 2^K \cdot K^2)$ ($N=100,000, M=200,000, K=8$ 시 약 0.08초 내 통과)
- **공간복잡도**: $O(N + M + 2^K \cdot K)$

---

## 5. 실전 오답 주의사항

> [!WARNING]
> 제출 전 오버플로우와 연산자 우선순위를 반드시 확인하세요!

- `INF` 값은 `Long.MAX_VALUE` 대신 `Long.MAX_VALUE / 4`로 지정하여 덧셈 오버플로우 방지.
- 자바 비트 연산 괄호: `(mask & (1 << next)) != 0` 필수.
- `important` 배열 인덱스는 `last + 1`임에 주의.
',
    status = 'PUBLISHED',
    published_at = NOW(),
    updated_at = NOW()
WHERE slug = 'autoever-mock-01-required-checkpoints';
