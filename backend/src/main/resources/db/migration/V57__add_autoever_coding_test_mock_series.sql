-- 2025년 이후 공개 후기의 출제 경향을 참고한 오리지널 모의문제 4편을 추가한다.
-- 실제 기출문제를 복원한 콘텐츠가 아니며, 관리자 검토 후 발행할 수 있도록 초안으로 저장한다.

INSERT IGNORE INTO tag (name, slug) VALUES
('Java', 'java'),
('코딩테스트', '코딩테스트'),
('현대오토에버', '현대오토에버'),
('모의문제', '모의문제'),
('다익스트라', '다익스트라'),
('비트마스크 DP', '비트마스크-dp'),
('최단 경로', '최단-경로'),
('위상정렬', '위상정렬'),
('경우의 수', '경우의-수'),
('동적 계획법', '동적-계획법'),
('이분 탐색', '이분-탐색'),
('시간복잡도', '시간복잡도'),
('0-1 BFS', '0-1-bfs'),
('그래프 탐색', '그래프-탐색'),
('메모리 최적화', '메모리-최적화');

INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id,
    learned_at, published_at, created_at, updated_at
) VALUES
('autoever-mock-01-required-checkpoints', '현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카', '필수 점검소를 모두 방문하는 최소 운행 시간을 구하는 오리지널 모의문제다. 중요 지점에서 다익스트라를 실행하고 점검소 방문 순서를 비트마스크 DP로 최적화한다.', '# 현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카

> 공개된 응시 후기에서 언급된 조건부 최단 경로와 DP 경향을 참고해 새로 만든 문제다. 실제 기출문제를 복원한 내용이 아니다.

## 문제

현대오토에버는 새로운 차량 관제 시스템을 검증하기 위해 테스트카를 운행한다.

도로망에는 `N`개의 지점과 `M`개의 양방향 도로가 있다. 각 도로를 통과하는 데 필요한 시간은 서로 다를 수 있다. 테스트카는 `1`번 지점에서 출발해 `N`번 지점으로 이동해야 한다.

운행 중에는 지정된 `K`개의 필수 점검소를 모두 한 번 이상 방문해야 한다. 점검소를 방문하는 순서는 자유이며, 같은 지점이나 도로를 여러 번 지나도 된다.

모든 필수 점검소를 방문한 뒤 `N`번 지점에 도착하는 최소 시간을 구하라. 이동할 수 없다면 `-1`을 출력한다.

## 입력

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

## 제한

- `2 ≤ N ≤ 100,000`
- `1 ≤ M ≤ 200,000`
- `1 ≤ K ≤ 8`
- `1 ≤ w ≤ 1,000,000`
- 필수 점검소는 `1`번과 `N`번이 아니다.
- 동일한 두 지점을 연결하는 도로가 여러 개 존재할 수 있다.
- 정답은 `int` 범위를 넘을 수 있다.

## 출력

조건을 만족하는 최소 이동 시간을 출력한다. 이동할 수 없다면 `-1`을 출력한다.

## 예제

```text
입력
5 6 2
2 4
1 2 2
2 3 2
3 5 3
1 4 5
4 3 1
2 4 2

출력
8
```

테스트카는 `1 → 2 → 4 → 3 → 5` 순서로 이동할 수 있다. 총 이동 시간은 `2 + 2 + 1 + 3 = 8`이다.

## 부분점수 아이디어

- `K = 1`: 출발점, 점검소, 도착점 사이의 최단 거리만 구해도 된다.
- `N ≤ 500`: 플로이드–워셜로 모든 쌍의 최단 거리를 구할 수 있다.
- 전체 제한: 필요한 지점에서만 다익스트라를 실행하고 방문 상태를 DP로 관리한다.

---

## 풀이

전체 도로에서 점검소 방문 순서까지 한 번에 탐색하면 상태 수가 너무 커진다. 문제를 두 단계로 나눈다.

1. 출발점, `K`개 점검소, 도착점에서 각각 다익스트라를 실행한다.
2. 이렇게 얻은 중요 지점 사이의 최단 거리로 비트마스크 DP를 수행한다.

`dp[mask][last]`를 `mask`에 포함된 점검소를 방문했고 마지막으로 `last` 점검소에 있는 최소 시간으로 정의한다.

점검소가 최대 8개이므로 DP 상태 수는 `2^K × K`다.

### 시간복잡도

- 다익스트라: `O((K + 2) × (N + M) log N)`
- 비트마스크 DP: `O(2^K × K²)`

## Java 코드

```java
import java.io.*;
import java.util.*;

public class Main {
    static final long INF = Long.MAX_VALUE / 4;

    static class Edge {
        int to;
        int weight;

        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    static class State implements Comparable<State> {
        int node;
        long distance;

        State(int node, long distance) {
            this.node = node;
            this.distance = distance;
        }

        @Override
        public int compareTo(State other) {
            return Long.compare(distance, other.distance);
        }
    }

    static List<Edge>[] graph;

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());
        int k = Integer.parseInt(st.nextToken());

        int[] important = new int[k + 2];
        important[0] = 1;
        important[k + 1] = n;

        st = new StringTokenizer(br.readLine());
        for (int i = 0; i < k; i++) {
            important[i + 1] = Integer.parseInt(st.nextToken());
        }

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

        long[][] between = new long[k + 2][k + 2];
        for (int i = 0; i < k + 2; i++) {
            long[] distance = dijkstra(important[i], n);
            for (int j = 0; j < k + 2; j++) {
                between[i][j] = distance[important[j]];
            }
        }

        int fullMask = (1 << k) - 1;
        long[][] dp = new long[1 << k][k];
        for (long[] row : dp) {
            Arrays.fill(row, INF);
        }

        for (int i = 0; i < k; i++) {
            dp[1 << i][i] = between[0][i + 1];
        }

        for (int mask = 1; mask <= fullMask; mask++) {
            for (int last = 0; last < k; last++) {
                if (dp[mask][last] >= INF) {
                    continue;
                }

                for (int next = 0; next < k; next++) {
                    if ((mask & (1 << next)) != 0) {
                        continue;
                    }

                    int nextMask = mask | (1 << next);
                    long candidate = dp[mask][last] + between[last + 1][next + 1];
                    dp[nextMask][next] = Math.min(dp[nextMask][next], candidate);
                }
            }
        }

        long answer = INF;
        for (int last = 0; last < k; last++) {
            answer = Math.min(answer, dp[fullMask][last] + between[last + 1][k + 1]);
        }

        System.out.println(answer >= INF ? -1 : answer);
    }

    static long[] dijkstra(int start, int n) {
        long[] distance = new long[n + 1];
        Arrays.fill(distance, INF);

        PriorityQueue<State> queue = new PriorityQueue<>();
        distance[start] = 0;
        queue.offer(new State(start, 0));

        while (!queue.isEmpty()) {
            State current = queue.poll();
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

## 자주 하는 실수

- 모든 정점에서 다익스트라를 실행한다.
- 중요 지점 사이가 연결되지 않았는데 `INF`끼리 더한다.
- 거리와 DP 값을 `int`로 선언한다.
- `mask`의 점검소 번호와 중요 지점 배열의 인덱스를 혼동한다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-23', NULL, NOW(), NOW()),
('autoever-mock-02-deployment-orders', '현대오토에버 대비 모의문제 2 — 차량 SW 배포 순서', '모듈 간 선행 조건을 만족하는 전체 배포 순서의 수를 계산하는 오리지널 모의문제다. 위상 관계를 비트마스크로 압축하고 부분집합 DP로 가능한 순서를 센다.', '# 현대오토에버 대비 모의문제 2 — 차량 SW 배포 순서

> 공개된 응시 후기에서 언급된 위상 관계와 재귀·DP 경향을 참고해 새로 만든 문제다. 실제 기출문제를 복원한 내용이 아니다.

## 문제

차량용 소프트웨어는 `N`개의 모듈로 구성되어 있다. 각 모듈은 정확히 한 번 배포해야 한다.

일부 모듈은 다른 모듈이 먼저 배포되어야만 배포할 수 있다. 예를 들어 `A B`라는 조건은 모듈 `A`가 모듈 `B`보다 먼저 배포되어야 한다는 뜻이다.

모든 선행 조건을 만족하면서 `N`개 모듈을 배포하는 서로 다른 순서의 수를 구하라. 두 순서는 어느 한 위치의 모듈이 다르면 서로 다른 순서다.

정답이 매우 클 수 있으므로 `1,000,000,007`로 나눈 나머지를 출력한다. 선행 조건에 모순이 있어 모든 모듈을 배포할 수 없다면 `0`을 출력한다.

## 입력

첫째 줄에 모듈 수 `N`과 선행 조건 수 `M`이 주어진다.

다음 `M`개 줄에는 `A B`가 주어진다. 모듈 `A`를 모듈 `B`보다 먼저 배포해야 한다.

```text
N M
A1 B1
...
AM BM
```

## 제한

- `1 ≤ N ≤ 20`
- `0 ≤ M ≤ N × (N - 1)`
- `1 ≤ A, B ≤ N`
- `A ≠ B`
- 같은 선행 조건이 여러 번 주어질 수 있다.

## 출력

가능한 전체 배포 순서의 수를 `1,000,000,007`로 나눈 나머지를 출력한다.

## 예제 1

```text
입력
3 2
1 3
2 3

출력
2
```

가능한 순서는 `1, 2, 3`과 `2, 1, 3`이다.

## 예제 2

```text
입력
2 2
1 2
2 1

출력
0
```

## 부분점수 아이디어

- 선행 조건이 없다면 정답은 `N!`이다.
- `N ≤ 10`이면 모든 순열을 생성해 조건을 검사할 수 있다.
- 전체 제한에서는 지금까지 배포한 모듈 집합을 하나의 상태로 압축해야 한다.

---

## 풀이

각 모듈의 선행 모듈 집합을 비트마스크로 저장한다.

`prerequisite[i]`는 `i`번 모듈보다 먼저 배포되어야 하는 모듈의 집합이다. 현재 배포된 집합이 `mask`일 때 다음 조건을 만족하는 모듈만 추가할 수 있다.

```text
(prerequisite[next] & mask) == prerequisite[next]
```

`dp[mask]`를 `mask`에 포함된 모듈까지 배포하는 순서의 수라고 정의한다. 아직 배포하지 않았고 모든 선행 모듈이 이미 포함된 모듈을 하나씩 추가한다.

그래프에 사이클이 있다면 전체 모듈이 포함된 상태에 도달하지 못하므로 자연스럽게 `0`이 나온다.

### 시간복잡도

- 시간복잡도: `O(2^N × N)`
- 공간복잡도: `O(2^N + N)`

## Java 코드

```java
import java.io.*;
import java.util.*;

public class Main {
    static final long MOD = 1_000_000_007L;

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());

        int[] prerequisite = new int[n];
        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int before = Integer.parseInt(st.nextToken()) - 1;
            int after = Integer.parseInt(st.nextToken()) - 1;
            prerequisite[after] |= 1 << before;
        }

        int stateCount = 1 << n;
        long[] dp = new long[stateCount];
        dp[0] = 1;

        for (int mask = 0; mask < stateCount; mask++) {
            if (dp[mask] == 0) {
                continue;
            }

            for (int next = 0; next < n; next++) {
                int bit = 1 << next;
                if ((mask & bit) != 0) {
                    continue;
                }
                if ((prerequisite[next] & mask) != prerequisite[next]) {
                    continue;
                }

                int nextMask = mask | bit;
                dp[nextMask] = (dp[nextMask] + dp[mask]) % MOD;
            }
        }

        System.out.println(dp[stateCount - 1]);
    }
}
```

## 자주 하는 실수

- `prerequisite[before]`에 `after`를 저장해 간선 방향을 반대로 만든다.
- 중복 선행 조건을 별도로 세어 진입 차수를 잘못 증가시킨다.
- 순열 전체를 저장해 메모리를 낭비한다.
- 경우의 수를 더할 때 나머지 연산을 늦게 적용한다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-23', NULL, NOW(), NOW()),
('autoever-mock-03-maintenance-schedule', '현대오토에버 대비 모의문제 3 — 정비 예약 최대 매출', '겹치지 않는 정비 예약을 선택해 최대 매출을 구하는 오리지널 모의문제다. O(N²) 탐색을 종료 시각 정렬, upper bound, 동적 계획법으로 O(N log N)에 개선한다.', '# 현대오토에버 대비 모의문제 3 — 정비 예약 최대 매출

> 공개된 응시 후기에서 언급된 메모이제이션과 시간복잡도 개선 경향을 참고해 새로 만든 문제다. 실제 기출문제를 복원한 내용이 아니다.

## 문제

한 정비소에 하루 동안 `N`개의 차량 정비 요청이 들어왔다. 정비 요청 `i`는 시작 시각 `Si`, 종료 시각 `Ei`, 매출 `Pi`를 가진다.

정비소에는 작업 공간이 하나뿐이므로 동시에 두 차량을 정비할 수 없다. 한 요청이 시각 `t`에 끝나고 다른 요청이 시각 `t`에 시작하는 경우에는 두 요청을 모두 처리할 수 있다.

일부 요청을 선택해 얻을 수 있는 최대 매출을 구하라.

## 입력

첫째 줄에 요청 수 `N`이 주어진다.

다음 `N`개 줄에는 각 요청의 시작 시각 `S`, 종료 시각 `E`, 매출 `P`가 주어진다.

```text
N
S1 E1 P1
...
SN EN PN
```

## 제한

- `1 ≤ N ≤ 200,000`
- `0 ≤ S < E ≤ 1,000,000,000`
- `1 ≤ P ≤ 1,000,000,000`
- 정답은 `int` 범위를 넘을 수 있다.

## 출력

얻을 수 있는 최대 매출을 출력한다.

## 예제

```text
입력
4
1 3 50
2 5 20
3 6 70
6 7 40

출력
160
```

`[1, 3]`, `[3, 6]`, `[6, 7]` 요청을 처리하면 `50 + 70 + 40 = 160`의 매출을 얻는다.

## 부분점수 아이디어

- `N ≤ 20`: 각 요청을 선택하거나 선택하지 않는 모든 경우를 확인할 수 있다.
- `N ≤ 5,000`: 각 요청 이전의 호환 가능한 요청을 선형 탐색하는 `O(N²)` DP가 가능하다.
- 전체 제한: 정렬과 이분 탐색으로 이전 상태를 `O(log N)`에 찾아야 한다.

---

## 풀이

요청을 종료 시각 기준으로 정렬한다.

`dp[i]`를 정렬된 요청 중 앞의 `i`개만 고려했을 때 얻을 수 있는 최대 매출이라고 정의한다. `i`번째 요청을 선택하는 경우에는 시작 시각 이하에 끝나는 마지막 구간까지의 최적값을 더한다.

```text
dp[i] = max(
    dp[i - 1],
    현재 요청의 매출 + dp[현재 시작 시각 이하에 끝난 요청 수]
)
```

종료 시각 배열이 정렬되어 있으므로 호환 가능한 요청의 수는 upper bound로 찾을 수 있다.

### 시간복잡도

- 정렬: `O(N log N)`
- 각 요청의 이분 탐색: `O(N log N)`
- 전체: `O(N log N)`

## Java 코드

```java
import java.io.*;
import java.util.*;

public class Main {
    static class Job {
        int start;
        int end;
        long profit;

        Job(int start, int end, long profit) {
            this.start = start;
            this.end = end;
            this.profit = profit;
        }
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine());
        Job[] jobs = new Job[n];

        for (int i = 0; i < n; i++) {
            StringTokenizer st = new StringTokenizer(br.readLine());
            int start = Integer.parseInt(st.nextToken());
            int end = Integer.parseInt(st.nextToken());
            long profit = Long.parseLong(st.nextToken());
            jobs[i] = new Job(start, end, profit);
        }

        Arrays.sort(jobs, Comparator.comparingInt(job -> job.end));

        int[] ends = new int[n];
        long[] dp = new long[n + 1];

        for (int i = 0; i < n; i++) {
            ends[i] = jobs[i].end;
            int compatibleCount = upperBound(ends, i, jobs[i].start);
            long select = dp[compatibleCount] + jobs[i].profit;
            dp[i + 1] = Math.max(dp[i], select);
        }

        System.out.println(dp[n]);
    }

    static int upperBound(int[] values, int length, int target) {
        int left = 0;
        int right = length;

        while (left < right) {
            int mid = left + (right - left) / 2;
            if (values[mid] <= target) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        return left;
    }
}
```

## 자주 하는 실수

- 시작 시각과 종료 시각이 같은 두 요청을 겹친다고 처리한다.
- 시작 시각 기준으로 정렬한 뒤 같은 DP 점화식을 사용한다.
- 호환 가능한 요청을 매번 처음부터 탐색해 `O(N²)`이 된다.
- 매출 합을 `int`로 저장한다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-23', NULL, NOW(), NOW()),
('autoever-mock-04-minimum-steering', '현대오토에버 대비 모의문제 4 — 최소 조향 자율주차', '장애물 격자에서 자율주차 차량의 최소 조향 횟수를 구하는 오리지널 모의문제다. 위치와 방향을 상태로 만들고 0-1 BFS와 정수 상태 압축으로 시간과 메모리를 관리한다.', '# 현대오토에버 대비 모의문제 4 — 최소 조향 자율주차

> 공개된 응시 후기에서 언급된 구현과 메모리 관리 경향을 참고해 새로 만든 문제다. 실제 기출문제를 복원한 내용이 아니다.

## 문제

자율주차 테스트 공간은 `N × M` 격자로 표현된다. 빈 공간은 `.`, 장애물은 `#`으로 주어진다.

차량은 시작 칸에서 도착 칸까지 이동해야 한다. 차량의 초기 방향은 자유롭게 선택할 수 있다. 차량은 다음 동작을 할 수 있다.

1. 현재 방향으로 한 칸 전진한다. 조향 횟수는 증가하지 않는다.
2. 현재 칸에서 왼쪽 또는 오른쪽으로 90도 회전한다. 회전할 때마다 조향 횟수가 1 증가한다.

격자 밖으로 이동하거나 장애물이 있는 칸으로 전진할 수 없다.

도착 칸에 도달하는 데 필요한 최소 조향 횟수를 구하라. 도착할 수 없다면 `-1`을 출력한다.

## 입력

첫째 줄에 격자의 행 수 `N`과 열 수 `M`이 주어진다.

다음 `N`개 줄에는 격자 정보가 주어진다.

마지막 줄에는 시작 좌표 `Sr Sc`와 도착 좌표 `Er Ec`가 주어진다. 좌표는 1부터 시작한다.

```text
N M
grid row 1
...
grid row N
Sr Sc Er Ec
```

## 제한

- `2 ≤ N, M ≤ 1,000`
- `N × M ≤ 1,000,000`
- 시작 칸과 도착 칸은 빈 공간이다.
- 메모리 제한을 고려해 상태 객체를 과도하게 생성하지 않아야 한다.

## 출력

최소 조향 횟수를 출력한다. 도착할 수 없다면 `-1`을 출력한다.

## 예제

```text
입력
5 5
.....
.###.
...#.
.#...
.....
1 1 5 5

출력
1
```

초기 방향을 아래쪽으로 선택해 5행까지 이동한 뒤 왼쪽에서 오른쪽 방향으로 한 번 회전하면 도착할 수 있다.

## 부분점수 아이디어

- 장애물이 없다면 시작점과 도착점이 같은 행 또는 열인지 확인하는 것으로 충분하다.
- `N, M ≤ 100`이면 객체 기반 상태와 일반 다익스트라도 사용할 수 있다.
- 전체 제한에서는 좌표와 방향을 하나의 정수로 압축하고 0-1 BFS를 사용한다.

---

## 풀이

같은 칸에 있어도 차량이 바라보는 방향에 따라 이후 필요한 회전 수가 달라진다. 따라서 상태를 `(행, 열, 방향)`으로 정의한다.

- 전진 간선의 비용: `0`
- 왼쪽·오른쪽 회전 간선의 비용: `1`

간선 비용이 0 또는 1이므로 0-1 BFS를 사용할 수 있다. 비용 0으로 이동한 상태는 덱의 앞에, 비용 1로 이동한 상태는 덱의 뒤에 넣는다.

초기 방향은 자유로우므로 시작 칸의 네 방향 상태를 모두 비용 0으로 시작한다.

메모리를 줄이기 위해 다음과 같이 상태를 하나의 정수로 인코딩한다.

```text
cell = row × M + col
state = cell × 4 + direction
```

### 시간복잡도

- 상태 수: `4 × N × M`
- 간선 수: 상태마다 최대 3개
- 시간복잡도: `O(N × M)`
- 거리 배열 공간복잡도: `O(N × M)`

## Java 코드

```java
import java.io.*;
import java.util.*;

public class Main {
    static final int INF = Integer.MAX_VALUE / 4;
    static final int[] DR = {-1, 0, 1, 0};
    static final int[] DC = {0, 1, 0, -1};

    static class IntDeque {
        int[] values;
        int head;
        int size;

        IntDeque(int capacity) {
            values = new int[Math.max(16, capacity)];
        }

        boolean isEmpty() {
            return size == 0;
        }

        void offerFirst(int value) {
            ensureCapacity();
            head = (head - 1 + values.length) % values.length;
            values[head] = value;
            size++;
        }

        void offerLast(int value) {
            ensureCapacity();
            values[(head + size) % values.length] = value;
            size++;
        }

        int pollFirst() {
            int value = values[head];
            head = (head + 1) % values.length;
            size--;
            return value;
        }

        void ensureCapacity() {
            if (size < values.length) {
                return;
            }

            int[] expanded = new int[values.length * 2];
            for (int i = 0; i < size; i++) {
                expanded[i] = values[(head + i) % values.length];
            }
            values = expanded;
            head = 0;
        }
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());

        char[][] board = new char[n][];
        for (int row = 0; row < n; row++) {
            board[row] = br.readLine().toCharArray();
        }

        st = new StringTokenizer(br.readLine());
        int startRow = Integer.parseInt(st.nextToken()) - 1;
        int startCol = Integer.parseInt(st.nextToken()) - 1;
        int endRow = Integer.parseInt(st.nextToken()) - 1;
        int endCol = Integer.parseInt(st.nextToken()) - 1;

        int stateCount = n * m * 4;
        int[] distance = new int[stateCount];
        Arrays.fill(distance, INF);

        IntDeque deque = new IntDeque(Math.min(stateCount, 1 << 20));
        int startCell = startRow * m + startCol;
        for (int direction = 0; direction < 4; direction++) {
            int state = startCell * 4 + direction;
            distance[state] = 0;
            deque.offerLast(state);
        }

        while (!deque.isEmpty()) {
            int state = deque.pollFirst();
            int direction = state % 4;
            int cell = state / 4;
            int row = cell / m;
            int col = cell % m;
            int currentDistance = distance[state];

            int nextRow = row + DR[direction];
            int nextCol = col + DC[direction];
            if (nextRow >= 0 && nextRow < n && nextCol >= 0 && nextCol < m
                    && board[nextRow][nextCol] != ''#'') {
                int nextCell = nextRow * m + nextCol;
                int nextState = nextCell * 4 + direction;
                if (currentDistance < distance[nextState]) {
                    distance[nextState] = currentDistance;
                    deque.offerFirst(nextState);
                }
            }

            int leftDirection = (direction + 3) % 4;
            int rightDirection = (direction + 1) % 4;

            int leftState = cell * 4 + leftDirection;
            if (currentDistance + 1 < distance[leftState]) {
                distance[leftState] = currentDistance + 1;
                deque.offerLast(leftState);
            }

            int rightState = cell * 4 + rightDirection;
            if (currentDistance + 1 < distance[rightState]) {
                distance[rightState] = currentDistance + 1;
                deque.offerLast(rightState);
            }
        }

        int endCell = endRow * m + endCol;
        int answer = INF;
        for (int direction = 0; direction < 4; direction++) {
            answer = Math.min(answer, distance[endCell * 4 + direction]);
        }

        System.out.println(answer == INF ? -1 : answer);
    }
}
```

## 메모리 주의사항

`Node` 객체를 이동마다 생성하거나 `int[N][M][4]`처럼 다차원 배열을 만들면 Java에서는 객체와 배열 헤더 때문에 예상보다 많은 메모리를 사용한다. 큰 격자에서는 상태를 정수로 인코딩하고 `int[]` 하나에 거리를 저장하는 편이 안전하다.

## 자주 하는 실수

- 같은 칸의 네 방향을 하나의 방문 상태로 처리한다.
- 일반 BFS를 사용해 회전과 전진을 같은 비용으로 계산한다.
- 초기 방향을 하나로 고정한다.
- 좌표를 상태로 인코딩할 때 `int` 범위를 확인하지 않는다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-23', NULL, NOW(), NOW());

INSERT INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM (
    SELECT 'autoever-mock-01-required-checkpoints' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints' AS study_slug, '현대오토에버' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints' AS study_slug, '모의문제' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints' AS study_slug, '다익스트라' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints' AS study_slug, '비트마스크 DP' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints' AS study_slug, '최단 경로' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS study_slug, '현대오토에버' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS study_slug, '모의문제' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS study_slug, '위상정렬' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS study_slug, '비트마스크 DP' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS study_slug, '경우의 수' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS study_slug, '현대오토에버' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS study_slug, '모의문제' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS study_slug, '동적 계획법' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS study_slug, '이분 탐색' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS study_slug, '시간복잡도' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-04-minimum-steering' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-04-minimum-steering' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-04-minimum-steering' AS study_slug, '현대오토에버' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-04-minimum-steering' AS study_slug, '모의문제' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-04-minimum-steering' AS study_slug, '0-1 BFS' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-04-minimum-steering' AS study_slug, '그래프 탐색' AS tag_name
    UNION ALL
    SELECT 'autoever-mock-04-minimum-steering' AS study_slug, '메모리 최적화' AS tag_name
) mapping
JOIN study s ON s.slug = mapping.study_slug
JOIN tag t ON t.name = mapping.tag_name;

INSERT INTO study_skill (study_id, skill_id)
SELECT s.id, skill.id
FROM study s
JOIN skill ON skill.name = 'Java'
WHERE s.slug IN ('autoever-mock-01-required-checkpoints', 'autoever-mock-02-deployment-orders', 'autoever-mock-03-maintenance-schedule', 'autoever-mock-04-minimum-steering');

INSERT INTO study_relation (
    source_study_id, target_study_id, relation_type, display_order
)
SELECT source_study.id, target_study.id, mapping.relation_type, mapping.display_order
FROM (
    SELECT 'java-coding-test-07-templates-and-mistakes' AS source_slug, 'autoever-mock-01-required-checkpoints' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints' AS source_slug, 'java-coding-test-07-templates-and-mistakes' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'autoever-mock-01-required-checkpoints' AS source_slug, 'autoever-mock-02-deployment-orders' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS source_slug, 'autoever-mock-01-required-checkpoints' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'autoever-mock-02-deployment-orders' AS source_slug, 'autoever-mock-03-maintenance-schedule' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS source_slug, 'autoever-mock-02-deployment-orders' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'autoever-mock-03-maintenance-schedule' AS source_slug, 'autoever-mock-04-minimum-steering' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'autoever-mock-04-minimum-steering' AS source_slug, 'autoever-mock-03-maintenance-schedule' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
) mapping
JOIN study source_study ON source_study.slug = mapping.source_slug
JOIN study target_study ON target_study.slug = mapping.target_slug;
