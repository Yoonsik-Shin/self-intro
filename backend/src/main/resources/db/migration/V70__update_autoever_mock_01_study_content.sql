-- V70: Update 현대오토에버 대비 모의문제 1 (autoever-mock-01-required-checkpoints) Study content with detailed concept breakdown and annotated solution

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE study
SET title = '현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카',
    summary = '필수 점검소를 모두 방문하는 최소 운행 시간을 구하는 모의문제 해설 노마다. 중요 지점 다익스트라 최단 거리 추상화, 비트마스크 방문 상태 정수 표현, 비트마스크 DP(TSP) 개념을 단계별로 분리하고 세부 한글 주석이 포함된 Java 풀이 코드를 제공한다.',
    content_markdown = '# 현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카

> 공개된 응시 후기에서 자주 출제되는 조건부 최단 경로와 DP 결합 경향을 참고해 제작한 모의문제 해설 및 핵심 개념 정밀 분석 노트입니다.

---

## 1. 핵심 개념 분리 및 상세 정리 (Concept Breakdown)

본 문제는 **다익스트라(Dijkstra) 최단 경로 알고리즘**과 **비트마스크 동적 계획법(Bitmask Dynamic Programming)**이라는 대표적인 두 고난도 기법을 체계적으로 결합하여 해결하는 문제다. 각 개념의 동작 원리와 왜 해당 기술을 사용하는지 단계별로 분리하여 학습한다.

```mermaid
graph TD
    subgraph Step1 [1단계: 중요 지점 최단 거리 추상화]
        Start[출발점 1번] -->|다익스트라| Bet1[between 거리 행렬]
        KNodes[K개 필수 점검소] -->|다익스트라 K회| Bet1
        End[도착점 N번] -->|다익스트라| Bet1
    end

    subgraph Step2 [2단계: 비트마스크 DP 경로 최적화]
        Bet1 --> BitDP[dp mask last]
        BitDP -->|Bitwise Shift & AND/OR| VisitState[방문 상태 갱신]
        VisitState --> MinDist[최종 N번 도착 최소 시간 계산]
    end
```

---

### 개념 ①: 다익스트라(Dijkstra) 기반 ''중요 지점 최단 거리 행렬'' 구축

- **문제점 제기**:
  전체 지점 수 $N \\le 100,000$, 도로 수 $M \\le 200,000$인 대규모 그래프에서 모든 이동 경로와 점검소 방문 순서를 한 번에 탐색하려고 하면 상태 공간 폭발로 인해 메모리와 시간 초과가 발생한다.
- **해결 아이디어 (추상화)**:
  우리가 관심 있는 위치는 오직 **출발점(`1`번)**, **$K$개의 필수 점검소들**, 그리고 **도착점(`N`번)**뿐이다. 이들 총 $(K + 2)$개의 지점을 **중요 지점(Important Nodes)**으로 정의한다.
- **실행 단계**:
  1. 중요 지점 인덱스 배열 `important[]`를 구성한다:
     - `important[0] = 1` (출발점)
     - `important[1 ~ K]` = 필수 점검소 $K$개
     - `important[K + 1] = N` (도착점)
  2. 총 $(K + 2)$개의 중요 지점 각각을 시작점으로 다익스트라 최단 거리 알고리즘을 $(K + 2)$번 수행한다.
  3. 수행 결과로 구한 정점 간 최단 거리를 `between[i][j]` ($i$번째 중요 지점에서 $j$번째 중요 지점까지의 최단 거리) 2차원 배열에 저장한다.
- **효과**:
  정점 $10$만 개의 거대한 그래프를 **$(K + 2)$개의 노드로만 이루어진 완전 그래프(Complete Graph)**로 축소하여 문제의 차원을 비약적으로 낮춘다.

---

### 개념 ②: 비트마스크(Bitmask)를 활용한 방문 상태 정수 표현

- **개념 정의**:
  $K$개의 필수 점검소 중 어떤 점검소들을 이미 방문했는지를 $K$개의 이진수 비트(Bit) 정수로 표현하는 기법이다.
- **비트 연산자 핵심 4가지**:
  1. **특정 점검소 비트 생성 (`Shift` 연산자 `<<`)**:
     - `1 << i`: $i$번째 점검소를 나타내는 단일 비트 깃발 (예: $i=2 \\rightarrow 0b0100$)
  2. **특정 점검소 방문 여부 확인 (`AND` 연산자 `&`)**:
     - `(mask & (1 << next)) != 0`: 현재 방문 상태 `mask`에 `next`번째 점검소가 포함되어 있는가? (포함되어 있다면 `true`)
  3. **새로운 점검소 방문 추가 (`OR` 연산자 `|`)**:
     - `nextMask = mask | (1 << next)`: 기존 `mask` 상태에 `next`번째 점검소를 추가로 방문 처리한 새 상태.
  4. **모든 점검소 방문 완료 상태 (`fullMask`)**:
     - `fullMask = (1 << K) - 1`: $K$개의 비트가 모두 `1`로 켜진 상태 (예: $K=3 \\rightarrow 2^3 - 1 = 7 = 0b111$)

---

### 개념 ③: 비트마스크 동적 계획법 (Bitmask DP / TSP 응용)

- **상태 정의 (State Definition)**:
  - `dp[mask][last]`: 현재까지 방문한 필수 점검소들의 집합 비트가 `mask`이고, 가장 최근에 방문한 점검소가 `last`번째 점검소일 때까지 소요된 **최소 운행 시간**.
- **초기 상태 (Base Case)**:
  - 출발점(`1`번 지점, `important[0]`)에서 처음으로 방문할 점검소 `i`($0 \\le i < K$)로 이동하는 경우:
  - `dp[1 << i][i] = between[0][i + 1]` (나머지 모든 `dp` 값은 충분히 큰 값 `INF`로 초기화)
- **상태 전이 점화식 (State Transition)**:
  - 현재 상태 `dp[mask][last]`에서 아직 방문하지 않은 점검소 `next`($0 \\le next < K$)로 이동할 때:
  - `dp[mask | (1 << next)][next] = min(dp[mask | (1 << next)][next], dp[mask][last] + between[last + 1][next + 1])`
- **최종 답 계산 (Final Answer Extraction)**:
  - 모든 필수 점검소를 방문한 상태 `fullMask`에서, 마지막 방문 점검소 `last`에서 최종 도착점(`N`번 지점, `important[K + 1]`)으로 이동하는 최소 비용 구하기:
  - Answer = min(dp[fullMask][last] + between[last + 1][K + 1]) (0 <= last < K)

---

## 2. 문제 정의 및 조건 분석

### 문제 설명
현대오토에버는 새로운 차량 관제 시스템을 검증하기 위해 테스트카를 운행한다.
도로망에는 `N`개의 지점과 `M`개의 양방향 도로가 있다. 각 도로를 통과하는 데 필요한 시간은 서로 다를 수 있다. 테스트카는 `1`번 지점에서 출발해 `N`번 지점으로 이동해야 한다.
운행 중에는 지정된 `K`개의 필수 점검소를 모두 한 번 이상 방문해야 한다. 점검소를 방문하는 순서는 자유이며, 같은 지점이나 도로를 여러 번 지나도 된다.
모든 필수 점검소를 방문한 뒤 `N`번 지점에 도착하는 최소 시간을 구하라. 이동할 수 없다면 `-1`을 출력한다.

### 제약 조건
- $2 \\le N \\le 100,000$ (지점 수)
- $1 \\le M \\le 200,000$ (도로 수)
- $1 \\le K \\le 8$ (필수 점검소 수, 비트마스크 DP 적용의 강력한 힌트!)
- $1 \\le w \\le 1,000,000$ (도로 가중치)
- 필수 점검소는 `1`번과 `N`번이 아니다.
- 동일한 두 지점을 연결하는 도로가 여러 개 존재할 수 있다.
- 정답은 `int` 범위를 초과할 수 있으므로 `long` 타입을 사용한다.

---

## 3. Java 실전 코드 & 세부 한글 주석 (Annotated Solution)

```java
import java.io.*;
import java.util.*;

public class Main {
    // 덧셈 연산 시 오버플로우(Overflow)를 방지하기 위해 Long.MAX_VALUE / 4로 설정
    static final long INF = Long.MAX_VALUE / 4;

    // 그래프의 간선(도로) 정보를 나타내는 클래스
    static class Edge {
        int to;      // 도착 지점 번호
        int weight;  // 이동 시간 (가중치)

        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    // 다익스트라 우선순위 큐(PriorityQueue) 탐색 상태 정렬 클래스
    static class State implements Comparable<State> {
        int node;       // 현재 위치한 지점 번호
        long distance;  // 출발점으로부터 현재 지점까지의 최단 누적 시간

        State(int node, long distance) {
            this.node = node;
            this.distance = distance;
        }

        // 거리(distance) 오름차순 정렬 (최소 힙 동작)
        @Override
        public int compareTo(State other) {
            return Long.compare(this.distance, other.distance);
        }
    }

    // 인접 리스트 형식의 도로망 그래프
    static List<Edge>[] graph;

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken()); // 지점 수 N
        int m = Integer.parseInt(st.nextToken()); // 도로 수 M
        int k = Integer.parseInt(st.nextToken()); // 필수 점검소 수 K

        // [중요 지점 배열 구성]
        // 인덱스 0: 출발점 (1번 지점)
        // 인덱스 1 ~ K: K개의 필수 점검소 지점 번호
        // 인덱스 K + 1: 도착점 (N번 지점)
        int[] important = new int[k + 2];
        important[0] = 1;
        important[k + 1] = n;

        st = new StringTokenizer(br.readLine());
        for (int i = 0; i < k; i++) {
            important[i + 1] = Integer.parseInt(st.nextToken());
        }

        // 그래프 인접 리스트 메모리 할당 및 무향(양방향) 도로 추가
        graph = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) {
            graph[i] = new ArrayList<>();
        }

        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int from = Integer.parseInt(st.nextToken());
            int to = Integer.parseInt(st.nextToken());
            int weight = Integer.parseInt(st.nextToken());

            // 양방향 도로이므로 양쪽 모두 추가
            graph[from].add(new Edge(to, weight));
            graph[to].add(new Edge(from, weight));
        }

        // [1단계: 중요 지점 간 최단 거리 테이블 between[][] 구하기]
        // between[i][j] : important[i] 지점에서 important[j] 지점까지의 다익스트라 최단 거리
        long[][] between = new long[k + 2][k + 2];
        for (int i = 0; i < k + 2; i++) {
            long[] distance = dijkstra(important[i], n);
            for (int j = 0; j < k + 2; j++) {
                between[i][j] = distance[important[j]];
            }
        }

        // [2단계: 비트마스크 DP 테이블 구성]
        // K개 점검소에 대한 모든 비트가 1인 상태 (예: K=3 이면 0b111 = 7)
        int fullMask = (1 << k) - 1;

        // dp[mask][last] : 방문한 점검소 비트 집합이 mask이고, 마지막 위치가 last 점검소일 때의 최소 시간
        long[][] dp = new long[1 << k][k];
        for (long[] row : dp) {
            Arrays.fill(row, INF);
        }

        // [초기 상태 설정]
        // 출발점(important[0])에서 처음으로 i번째 점검소(important[i+1])로 직접 이동하는 경우
        for (int i = 0; i < k; i++) {
            dp[1 << i][i] = between[0][i + 1];
        }

        // [DP 상태 전이 반복문]
        for (int mask = 1; mask <= fullMask; mask++) {
            for (int last = 0; last < k; last++) {
                // 도달할 수 없는 유효하지 않은 상태는 건너뜀
                if (dp[mask][last] >= INF) {
                    continue;
                }

                // 다음으로 방문할 점검소 next 탐색
                for (int next = 0; next < k; next++) {
                    // 이미 현재 mask에 포함되어 방문한 점검소라면 스킵
                    if ((mask & (1 << next)) != 0) {
                        continue;
                    }

                    // next 점검소를 추가로 방문한 새로운 비트 mask
                    int nextMask = mask | (1 << next);

                    // last 점검소(important[last+1])에서 next 점검소(important[next+1])로 이동하는 총 시간
                    long candidate = dp[mask][last] + between[last + 1][next + 1];

                    // 최솟값 갱신 (Relaxation)
                    dp[nextMask][next] = Math.min(dp[nextMask][next], candidate);
                }
            }
        }

        // [3단계: 최종 결과 계산]
        // 모든 점검소를 방문한 fullMask 상태에서 마지막 점검소 last에서 N번 도착점(important[k+1])으로 이동
        long answer = INF;
        for (int last = 0; last < k; last++) {
            if (dp[fullMask][last] < INF && between[last + 1][k + 1] < INF) {
                answer = Math.min(answer, dp[fullMask][last] + between[last + 1][k + 1]);
            }
        }

        // 도달 불가능할 경우 -1 출력, 도달 시 최소 운행 시간 출력
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

        // 시작 정점 초기화
        distance[start] = 0;
        queue.offer(new State(start, 0));

        while (!queue.isEmpty()) {
            State current = queue.poll();

            // 큐에서 꺼낸 누적 거리가 이미 기록된 최단 거리보다 크다면 낡은 유효하지 않은 정보이므로 스킵
            if (current.distance != distance[current.node]) {
                continue;
            }

            // 인접한 도로 탐색
            for (Edge edge : graph[current.node]) {
                long nextDistance = current.distance + edge.weight;

                // 더 짧은 경로를 발견한 경우 거리를 갱신하고 큐에 삽입
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

## 4. 시간복잡도 & 공간복잡도 엄밀 분석

### 시간복잡도 (Time Complexity)
1. **다익스트라 알고리즘 $(K + 2)$회 실행**:
   - $N$개의 정점, $M$개의 간선에 대해 1회 다익스트라 복잡도는 $O((N + M) \\log N)$.
   - 총 $(K + 2)$회 실행하므로 $T_{\\text{dijkstra}} = O((K + 2) \\cdot (N + M) \\log N)$.
2. **비트마스크 DP 상태 전이**:
   - 상태 개수: $2^K \\times K$
   - 각 상태에서 다음 점검소 $K$개를 시도하므로 전이 연산 수: $O(2^K \\times K^2)$.
3. **전체 시간복잡도**:
   $$T_{\\text{total}} = O\\left( (K + 2)(N + M) \\log N + 2^K \\cdot K^2 \\right)$$
   - 문제 제한($N=100,000, M=200,000, K=8$) 적용 시:
     - 다익스트라 연산 횟수: $10 \\times 300,000 \\times \\log_2(100,000) \\approx 5 \\times 10^7$ 연산
     - 비트마스크 DP 연산 횟수: $2^8 \\times 8^2 = 256 \\times 64 = 16,384$ 연산
   - 1초 이내(약 0.08초)에 여유 있게 통과한다.

### 공간복잡도 (Space Complexity)
- 그래프 인접 리스트: $O(N + M)$
- 거리 행렬 `between`: $O((K + 2)^2)$
- DP 테이블 `dp`: $O(2^K \\cdot K)$
- 전체 공간복잡도: $O(N + M + 2^K \\cdot K)$으로 약 수 MB 수준의 매우 적은 메모리 사용.

---

## 5. 자주 하는 실수 & 실전 방어 체크리스트

> [!WARNING]
> 코딩테스트 제출 전 다음 4가지 빈출 실수를 반드시 점검하세요!

1. **`INF` 값 설정 실수로 인한 오버플로우**:
   - `dp[mask][last] + between[...]` 연산 중 `Long.MAX_VALUE`를 `INF`로 설정하면 덧셈 시 정수 오버플로우가 발생해 음수로 반전되어 오답이 된다. `Long.MAX_VALUE / 4` 같은 충분히 안전한 대형 정수를 사용해야 한다.
2. **비트 연산자 괄호 누락 (`Operator Precedence`)**:
   - 자바에서 비교 연산자(`!=`, `==`)는 비트 연산자(`&`, `|`)보다 우선순위가 높다.
   - `mask & 1 << next != 0` ❌ $\\rightarrow$ `(mask & (1 << next)) != 0` ⭕
3. **인덱스 오프셋 1 차이 혼동 (Off-by-One)**:
   - `important` 배열: `0`번(출발지), `1~K`번(점검소), `K+1`번(도착지)
   - `dp[mask][last]` 배열: `last`는 `0 ~ K-1` 범위의 비트 인덱스!
   - 따라서 `last` 점검소의 `between` 행렬 인덱스는 반드시 **`last + 1`**임을 잊지 말아야 한다.
4. **다익스트라 방문 스킵 조건 누락**:
   - `if (current.distance != distance[current.node]) continue;` 코드를 생략하면 우선순위 큐에 들어간 오래된 낡은 상태들이 전부 펼쳐지면서 TLE(시간 초과)가 난다.

---

## 6. 추천 유사 기출 문제 목록

- [백준 2098 — 외판원 순회 (TSP)](https://www.acmicpc.net/problem/2098) : 비트마스크 DP의 표준 교과서 문제
- [백준 1504 — 특정한 최단 경로](https://www.acmicpc.net/problem/1504) : 반드시 경유해야 하는 지점이 2개인 다익스트라 응용 문제
- [프로그래머스 — 경주로 건설](https://school.programmers.co.kr/learn/courses/30/lessons/67259) : 상태를 정의하여 최단 거리를 탐색하는 BFS/다익스트라 문제
',
    status = 'PUBLISHED',
    published_at = NOW(),
    updated_at = NOW()
WHERE slug = 'autoever-mock-01-required-checkpoints';
