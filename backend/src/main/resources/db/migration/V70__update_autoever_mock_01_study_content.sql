-- V70: Update 현대오토에버 대비 모의문제 1 (autoever-mock-01-required-checkpoints) Study content (Problem & Solution Code with detailed comments only)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE study
SET title = '현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카',
    summary = '필수 점검소를 모두 방문하는 최소 운행 시간을 구하는 현대오토에버 모의문제 풀이 노트다. 라인별 상세 한글 주석이 포함된 자바 정답 코드와 입출력 예제를 제공하며, 핵심 이론은 비트마스크 DP & 다익스트라 알고리즘 스터디와 연동된다.',
    content_markdown = '# 현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카

> 공개된 현대오토에버 코딩테스트 후기에서 출제되는 조건부 최단 경로와 DP 결합 경향을 대비하기 위한 모의문제 상세 해설 노트입니다.
> 💡 **이론 연동**: 본 문제를 해결하는 핵심 알고리즘(비트마스크 DP & 다익스트라)의 일반화된 가이드라인은 **[비트마스크 DP & 다익스트라 알고리즘 정리](http://localhost:3000/study/bitmask-dp-dijkstra-algorithm)** 노트에서 확인하실 수 있습니다.

---

## 1. 문제

현대오토에버는 새로운 차량 관제 시스템을 검증하기 위해 테스트카를 운행한다.

도로망에는 `N`개의 지점과 `M`개의 양방향 도로가 있다. 각 도로를 통과하는 데 필요한 시간은 서로 다를 수 있다. 테스트카는 `1`번 지점에서 출발해 `N`번 지점으로 이동해야 한다.

운행 중에는 지정된 `K`개의 필수 점검소를 모두 한 번 이상 방문해야 한다. 점검소를 방문하는 순서는 자유이며, 같은 지점이나 도로를 여러 번 지나도 된다.

모든 필수 점검소를 방문한 뒤 `N`번 지점에 도착하는 최소 시간을 구하라. 이동할 수 없다면 `-1`을 출력한다.

---

## 2. 입력 및 제한 조건

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

### 제약 조건
- $2 \\le N \\le 100,000$ (지점 수)
- $1 \\le M \\le 200,000$ (도로 수)
- $1 \\le K \\le 8$ (필수 점검소 수)
- $1 \\le w \\le 1,000,000$ (도로 가중치)
- 필수 점검소는 `1`번과 `N`번이 아니다.
- 동일한 두 지점을 연결하는 도로가 여러 개 존재할 수 있다.
- 정답은 `int` 범위를 초과할 수 있으므로 `long` 타입을 사용한다.

### 예제
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

## 3. 정답 코드 & 세부 한글 주석 (Line-by-Line Annotated Solution)

이 문제의 풀이는 출발점(`1`), 점검소 `K`개, 도착점(`N`) 총 $(K+2)$개 지점에서 다익스트라를 실행해 최단 거리 행렬 `between`을 만든 후, 비트마스크 DP로 최적 방문 순서를 구한다.

```java
import java.io.*;
import java.util.*;

public class Main {
    // 덧셈 연산 시 정수 오버플로우를 방지하기 위한 대형 INF 값 (Long.MAX_VALUE / 4)
    static final long INF = Long.MAX_VALUE / 4;

    // 양방향 도로 그래프 간선 클래스
    static class Edge {
        int to;      // 연결된 도착 지점 번호
        int weight;  // 통과 소요 시간 (도로 가중치)

        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    // 다익스트라 우선순위 큐(PriorityQueue) 탐색 상태 클래스
    static class State implements Comparable<State> {
        int node;       // 현재 위치 지점 번호
        long distance;  // 출발 지점으로부터의 최단 누적 소요 시간

        State(int node, long distance) {
            this.node = node;
            this.distance = distance;
        }

        // 거리(distance) 오름차순 정렬 (최소 힙)
        @Override
        public int compareTo(State other) {
            return Long.compare(this.distance, other.distance);
        }
    }

    // 도로망 인접 리스트
    static List<Edge>[] graph;

    public static void main(String[] args) throws Exception {
        // 빠른 입출력을 위한 BufferedReader 및 StringTokenizer
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken()); // 전체 지점 수 N
        int m = Integer.parseInt(st.nextToken()); // 전체 도로 수 M
        int k = Integer.parseInt(st.nextToken()); // 필수 점검소 수 K

        // [중요 지점 인덱스 매핑]
        // index 0     : 출발 지점 (1번 지점)
        // index 1 ~ K : K개의 필수 점검소 지점 번호
        // index K + 1 : 최종 도착 지점 (N번 지점)
        int[] important = new int[k + 2];
        important[0] = 1;
        important[k + 1] = n;

        st = new StringTokenizer(br.readLine());
        for (int i = 0; i < k; i++) {
            important[i + 1] = Integer.parseInt(st.nextToken());
        }

        // 그래프 메모리 할당 및 양방향 도로 정보 추가
        graph = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) {
            graph[i] = new ArrayList<>();
        }

        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int from = Integer.parseInt(st.nextToken());
            int to = Integer.parseInt(st.nextToken());
            int weight = Integer.parseInt(st.nextToken());

            // 양방향 그래프이므로 양쪽에 추가
            graph[from].add(new Edge(to, weight));
            graph[to].add(new Edge(from, weight));
        }

        // [1단계: (K+2)개의 중요 지점 간 다익스트라 최단 거리 테이블 between[][] 생성]
        // between[i][j] : important[i] 지점에서 important[j] 지점까지의 최단 이동 거리
        long[][] between = new long[k + 2][k + 2];
        for (int i = 0; i < k + 2; i++) {
            long[] distance = dijkstra(important[i], n);
            for (int j = 0; j < k + 2; j++) {
                between[i][j] = distance[important[j]];
            }
        }

        // [2단계: 비트마스크 DP 수행]
        // fullMask : K개의 모든 점검소를 방문한 비트 상태 (예: K=3 ➔ 0b111 = 7)
        int fullMask = (1 << k) - 1;

        // dp[mask][last] : 방문한 점검소 집합 비트가 mask이고, 마지막 위치가 last 점검소일 때의 최소 소요 시간
        long[][] dp = new long[1 << k][k];
        for (long[] row : dp) {
            Arrays.fill(row, INF);
        }

        // [초기 상태 설정]
        // 출발점(important[0])에서 첫 번째로 방문할 점검소(important[i+1])로 직접 이동
        for (int i = 0; i < k; i++) {
            dp[1 << i][i] = between[0][i + 1];
        }

        // [DP 상태 전이 반복문]
        for (int mask = 1; mask <= fullMask; mask++) {
            for (int last = 0; last < k; last++) {
                // 도달 불가능한 유효하지 않은 상태는 스킵
                if (dp[mask][last] >= INF) {
                    continue;
                }

                // 다음으로 방문할 점검소 next 선택
                for (int next = 0; next < k; next++) {
                    // 이미 현재 mask에 포함된 점검소는 스킵 (AND 연산)
                    if ((mask & (1 << next)) != 0) {
                        continue;
                    }

                    // next 점검소를 추가로 방문 처리 (OR 연산)
                    int nextMask = mask | (1 << next);

                    // last 점검소(important[last+1])에서 next 점검소(important[next+1])로 이동하는 소요 시간 누적
                    long candidate = dp[mask][last] + between[last + 1][next + 1];

                    // 최솟값 갱신 (Relaxation)
                    dp[nextMask][next] = Math.min(dp[nextMask][next], candidate);
                }
            }
        }

        // [3단계: 모든 점검소 방문(fullMask) 후 최종 N번 도착점으로 이동하는 최솟값 계산]
        long answer = INF;
        for (int last = 0; last < k; last++) {
            if (dp[fullMask][last] < INF && between[last + 1][k + 1] < INF) {
                answer = Math.min(answer, dp[fullMask][last] + between[last + 1][k + 1]);
            }
        }

        // 이동 불가능할 시 -1, 가능할 시 최소 운행 시간 출력
        System.out.println(answer >= INF ? -1 : answer);
    }

    /**
     * 다익스트라(Dijkstra) 최단 경로 알고리즘
     * @param start 탐색 출발 정점 번호
     * @param n 전체 정점 개수
     * @return 출발 정점으로부터 모든 정점까지의 최단 거리 배열 distance[]
     */
    static long[] dijkstra(int start, int n) {
        long[] distance = new long[n + 1];
        Arrays.fill(distance, INF);

        PriorityQueue<State> queue = new PriorityQueue<>();
        distance[start] = 0;
        queue.offer(new State(start, 0));

        while (!queue.isEmpty()) {
            State current = queue.poll();

            // 이미 처리된 낡은 거리는 스킵 (다익스트라 시간복잡도 보장)
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

## 4. 시간 및 공간 복잡도

- **시간복잡도**: $O((K + 2)(N + M) \\log N + 2^K \\cdot K^2)$ ($N=100,000, M=200,000, K=8$ 기준 약 0.08초 소요)
- **공간복잡도**: $O(N + M + 2^K \\cdot K)$
',
    status = 'PUBLISHED',
    published_at = NOW(),
    updated_at = NOW()
WHERE slug = 'autoever-mock-01-required-checkpoints';
