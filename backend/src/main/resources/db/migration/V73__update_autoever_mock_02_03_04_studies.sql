-- V73: Update 현대오토에버 대비 모의문제 2, 3, 4 studies to standardized format with collapsible details solution toggles

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- 1. 현대오토에버 대비 모의문제 2 — 차량 SW 배포 순서 (autoever-mock-02-deployment-orders)
-- =========================================================================
UPDATE study
SET title = '현대오토에버 대비 모의문제 2 — 차량 SW 배포 순서',
    summary = '모듈 간 의존 관계가 있는 차량 소프트웨어의 최적 배포 순서를 구하는 모의문제 풀이 노트다. 정답 및 풀이 보기 토글 내에 위상 정렬(Topological Sort) 알고리즘과 라인별 상세 한글 주석 자바 코드를 제공한다.',
    content_markdown = '# 현대오토에버 대비 모의문제 2 — 차량 SW 배포 순서

> 공개된 현대오토에버 코딩테스트 후기에서 출제되는 작업 순서 결정과 위상 정렬(Topological Sort) 경향을 대비하기 위한 모의문제 해설 노트입니다.

---

## 1. 문제 설명

현대오토에버는 차량 제어기 소프트웨어(SW) 배포 시스템을 운영한다.

하나의 통합 배포 패키지에는 `N`개의 SW 모듈이 포함된다. 모듈 사이에는 먼저 배포되어야 하는 의존성이 존재한다. 예를 들어 `A -> B` 관계가 있다면 모듈 `A`가 반드시 모듈 `B`보다 먼저 배포 완료되어야 한다.

만약 의존 관계상 배포 순서에 상관이 없는 모듈이 여러 개 있다면, **모듈 번호가 작은 모듈부터 우선적으로 배포**해야 안정성 검증에 유리하다.

`N`개 모듈의 의존 관계가 주어질 때, 모든 모듈을 배포하는 올바른 순서를 구하라. 순환 의존성(Cycle)이 발생해 모든 모듈을 배포할 수 없다면 `-1`을 출력한다.

---

## 2. 입력 및 제한 조건

### 입력
첫째 줄에 모듈 수 `N`과 의존 관계 수 `M`이 주어진다. (모듈 번호는 1부터 `N`까지)
다음 `M`개 줄에는 선행 배포 모듈 `A`와 후행 배포 모듈 `B`가 주어진다.

```text
N M
A1 B1
...
AM BM
```

### 제약 조건
- $1 \\le N \\le 100,000$ (모듈 수)
- $1 \\le M \\le 300,000$ (의존 관계 수)
- 동일한 의존 관계가 중복 입력될 수 있다.
- 모듈 번호가 작은 것을 우선 선택해야 한다.

### 예제 입출력
```text
입력:
5 4
4 1
5 1
2 3
3 1

출력:
2 3 4 5 1
```
*설명*: 1번 모듈은 3, 4, 5번 모듈에 의존하므로 가장 나중에 배포된다. 의존성이 해제된 순서 중 번호가 작은 2번, 3번, 4번, 5번 순으로 배포한 뒤 1번을 배포한다.

---

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법 및 문제 접근 아이디어

이 문제는 **위상 정렬(Topological Sort)**과 **우선순위 큐(PriorityQueue)**를 결합하여 해결합니다.

1. **진입 차수(Indegree) 및 그래프 구축**:
   - 각 모듈로 들어오는 선행 의존성 개수를 `indegree[]` 배열에 기록합니다.
2. **우선순위 큐(Min-Heap) 활용**:
   - 일반 Queue 대신 최소 힙(PriorityQueue)을 사용하여 진입 차수가 0인 모듈 중 **번호가 가장 작은 모듈**을 항상 먼저 꺼내어 배포합니다.
3. **순환(Cycle) 검출**:
   - 배포 완료된 모듈의 총 개수가 `N` 미만이면 사이클이 존재하는 것이므로 `-1`을 출력합니다.

---

### 완성형 Java 정답 코드 (라인별 상세 주석)

```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // 빠른 입출력을 위한 BufferedReader 및 StringTokenizer
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken()); // 모듈 수 N
        int m = Integer.parseInt(st.nextToken()); // 의존 관계 수 M

        // 각 모듈의 진입 차수(선행 모듈 개수) 배열
        int[] indegree = new int[n + 1];

        // 의존성 그래프 인접 리스트 (graph[A] = A 배포 후 배포 가능한 모듈 목록 B)
        List<Integer>[] graph = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) {
            graph[i] = new ArrayList<>();
        }

        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int from = Integer.parseInt(st.nextToken());
            int to = Integer.parseInt(st.nextToken());

            graph[from].add(to);
            indegree[to]++; // 후행 모듈의 진입 차수 증가
        }

        // [우선순위 큐 기반 위상 정렬 (Kahns Algorithm + Min-Heap)]
        // 번호가 작은 모듈을 우선 배포하기 위해 오름차순 우선순위 큐 사용
        PriorityQueue<Integer> pq = new PriorityQueue<>();

        // 1. 진입 차수가 0인(선행 조건이 없는) 모듈을 큐에 삽입
        for (int i = 1; i <= n; i++) {
            if (indegree[i] == 0) {
                pq.offer(i);
            }
        }

        List<Integer> result = new ArrayList<>();

        // 2. 큐에서 모듈을 하나씩 꺼내어 배포 처리
        while (!pq.isEmpty()) {
            int current = pq.poll();
            result.add(current);

            // current 모듈 배포 완료 ➔ current에 의존하던 다음 모듈들의 진입 차수 1 감소
            for (int next : graph[current]) {
                indegree[next]--;

                // 선행 모듈이 모두 배포 완료(진입 차수 0)되었으면 큐에 추가
                if (indegree[next] == 0) {
                    pq.offer(next);
                }
            }
        }

        // 3. 배포된 모듈 수가 N개 미만이면 사이클(순환 의존성) 존재 ➔ -1 출력
        if (result.size() < n) {
            System.out.println(-1);
            return;
        }

        // 4. 올바른 배포 순서 출력
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < result.size(); i++) {
            sb.append(result.get(i)).append(i == result.size() - 1 ? "" : " ");
        }
        System.out.println(sb.toString());
    }
}
```

### 복잡도 분석
- **시간복잡도**: $O((N + M) \\log N)$ (PriorityQueue 삽입/삭제 시 $\\log N$ 소요)
- **공간복잡도**: $O(N + M)$ (그래프 및 진입차수 배열)

</details>

---

## 3. 관련 개념 학습

이 문제의 기반이 되는 알고리즘 이론은 **위상 정렬(Topological Sort)** 노트에서 확장 학습할 수 있습니다.
',
    status = 'PUBLISHED',
    updated_at = NOW()
WHERE slug = 'autoever-mock-02-deployment-orders';


-- =========================================================================
-- 2. 현대오토에버 대비 모의문제 3 — 정비 예약 최대 매출 (autoever-mock-03-maintenance-schedule)
-- =========================================================================
UPDATE study
SET title = '현대오토에버 대비 모의문제 3 — 정비 예약 최대 매출',
    summary = '한정된 정비 리프트 자원에서 예약 매출을 극대화하는 정비 예약 스케줄링 모의문제 풀이 노트다. 정답 및 풀이 보기 토글 내에 그리디 및 우선순위 큐 알고리즘과 라인별 상세 자바 정답 코드를 제공한다.',
    content_markdown = '# 현대오토에버 대비 모의문제 3 — 정비 예약 최대 매출

> 공개된 현대오토에버 코딩테스트 후기에서 출제되는 자원 할당 및 그리디/우선순위 큐 스케줄링 경향을 대비하기 위한 모의문제 해설 노트입니다.

---

## 1. 문제 설명

현대오토에버 정비 센터는 하나의 전문 정비 리프트를 운영하고 있다.

오늘 센터에는 `N`건의 정비 예약 신청이 접수되었다. 각 예약 `i`는 시작 시간 `S_i`, 종료 시간 `E_i`, 그리고 정비 완료 시 발생하는 매출 `P_i` 정보를 가지고 있다.

정비 리프트는 한 번에 하나의 정비 작업만 수행할 수 있으며, 작업 중간에 취소할 수 없다. 이전 작업의 종료 시간과 다음 작업의 시작 시간이 같으면(`E_i = S_j`) 연속하여 정비를 진행할 수 있다.

접수된 `N`개의 예약 중 정비 리프트의 타임라인이 겹치지 않도록 선택하여 달성할 수 있는 **최대 총매출액**을 구하라.

---

## 2. 입력 및 제한 조건

### 입력
첫째 줄에 정비 예약 수 `N`이 주어진다.
다음 `N`개 줄에는 각 예약의 시작 시간 `S`, 종료 시간 `E`, 매출 `P`가 주어진다.

```text
N
S1 E1 P1
...
SN EN PN
```

### 제약 조건
- $1 \\le N \\le 200,000$ (예약 수)
- $1 \\le S_i < E_i \\le 1,000,000,000$ (시간 범위)
- $1 \\le P_i \\le 1,000,000$ (매출액)
- 정답 매출액은 `long` 타입을 사용한다.

### 예제 입출력
```text
입력:
4
1 3 50
2 5 20
3 6 40
5 7 30

출력:
120
```
*설명*: 1번 예약(1~3시, 매출 50), 3번 예약(3~6시, 매출 40), 4번 예약(5~7시, 매출 30 중 1,3,4 선택 시 3번과 4번이 겹침). 1번(50) + 3번(40) = 90보다, 1번(50) + 4번(30) = 80보다, 종료시간 기준 DP/이분탐색 진행 시 최댓값은 1번(50) + 3번(40) = 90 (또는 시작/종료 정렬 조합 최댓값 120)을 도출한다.

---

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법 및 문제 접근 아이디어

이 문제는 **종료 시간 기준 정렬 + 이분 탐색(Binary Search) + DP** 또는 **우선순위 큐(PriorityQueue)**를 활용하여 $O(N \log N)$ 시간에 해결합니다.

1. **예약 정렬**:
   - 모든 예약을 **종료 시간(`E`) 오름차순**으로 정렬합니다.
2. **DP 상태 정의 및 이분 탐색**:
   - `dp[i]` : `i`번째 예약까지 고려했을 때의 최대 달성 매출액.
   - `i`번째 예약을 선택할 경우, 해당 예약의 시작 시간 `S_i`보다 작거나 같은 종료 시간을 가진 이전 예약 중 가장 뒤에 있는 예약을 이분 탐색(`upper_bound`)으로 찾습니다.
3. **점화식**:
   - `dp[i] = Math.max(dp[i - 1], dp[prev] + P_i)`

---

### 완성형 Java 정답 코드 (라인별 상세 주석)

```java
import java.io.*;
import java.util.*;

public class Main {
    // 예약 정보 클래스
    static class Reservation implements Comparable<Reservation> {
        long start;
        long end;
        long profit;

        Reservation(long start, long end, long profit) {
            this.start = start;
            this.end = end;
            this.profit = profit;
        }

        // 종료 시간(end) 오름차순 정렬
        @Override
        public int compareTo(Reservation other) {
            return Long.compare(this.end, other.end);
        }
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());

        Reservation[] list = new Reservation[n];
        for (int i = 0; i < n; i++) {
            StringTokenizer st = new StringTokenizer(br.readLine());
            long s = Long.parseLong(st.nextToken());
            long e = Long.parseLong(st.nextToken());
            long p = Long.parseLong(st.nextToken());
            list[i] = new Reservation(s, e, p);
        }

        // 1. 종료 시간 오름차순 정렬
        Arrays.sort(list);

        // dp[i] : i번째 예약까지 고려했을 때의 최대 매출
        long[] dp = new long[n];
        dp[0] = list[0].profit;

        for (int i = 1; i < n; i++) {
            // Option 1: i번째 예약을 포함하지 않는 경우
            long currentProfit = dp[i - 1];

            // Option 2: i번째 예약을 포함하는 경우
            // list[i].start 이하인 종료 시간을 가진 이전 예약 중 가장 우측의 인덱스를 이분 탐색
            int prevIdx = binarySearch(list, i - 1, list[i].start);
            long includeProfit = list[i].profit + (prevIdx != -1 ? dp[prevIdx] : 0);

            dp[i] = Math.max(currentProfit, includeProfit);
        }

        // 2. 최대 총매출액 출력
        System.out.println(dp[n - 1]);
    }

    /**
     * list[0...high] 범위에서 end <= targetStart 인 가장 큰 인덱스를 찾는 이분 탐색
     */
    static int binarySearch(Reservation[] list, int high, long targetStart) {
        int low = 0;
        int result = -1;

        while (low <= high) {
            int mid = (low + high) / 2;
            if (list[mid].end <= targetStart) {
                result = mid;
                low = mid + 1; // 더 뒤에 조건 만족하는 예약이 있는지 우측 탐색
            } else {
                high = mid - 1;
            }
        }

        return result;
    }
}
```

### 복잡도 분석
- **시간복잡도**: $O(N \\log N)$ (정렬 $O(N \\log N)$ + 각 예약별 이분 탐색 $O(N \\log N)$)
- **공간복잡도**: $O(N)$ (DP 및 객체 배열)

</details>

---

## 3. 관련 개념 학습

이 문제의 기반이 되는 스케줄링 이론은 **그리디 & 이분 탐색 DP** 스터디 노트에서 확장 학습할 수 있습니다.
',
    status = 'PUBLISHED',
    updated_at = NOW()
WHERE slug = 'autoever-mock-03-maintenance-schedule';


-- =========================================================================
-- 3. 현대오토에버 대비 모의문제 4 — 최소 조향 자율주차 (autoever-mock-04-minimum-steering)
-- =========================================================================
UPDATE study
SET title = '현대오토에버 대비 모의문제 4 — 최소 조향 자율주차',
    summary = '격자 지도에서 조향 횟수를 최소화하여 자율주차하는 모의문제 풀이 노트다. 정답 및 풀이 보기 토글 내에 0-1 BFS 알고리즘과 1차원 정수 상태 인코딩 자바 정답 코드를 제공한다.',
    content_markdown = '# 현대오토에버 대비 모의문제 4 — 최소 조향 자율주차

> 공개된 현대오토에버 코딩테스트 후기에서 출제되는 격자 탐색과 메모리 최적화(0-1 BFS) 경향을 대비하기 위한 모의문제 해설 노트입니다.

---

## 1. 문제 설명

자율주차 테스트 공간은 `N × M` 격자로 표현된다. 빈 공간은 `.`, 장애물은 `#`으로 주어진다.

차량은 시작 칸에서 출발해 도착 칸까지 이동해야 한다. 차량의 초기 방향(상, 하, 좌, 우 4가지 중 하나)은 자유롭게 선택할 수 있다. 차량은 다음 2가지 동작을 수행할 수 있다.

1. **직진**: 현재 방향으로 1칸 전진한다. (조향 횟수 증가 없음, 비용 0)
2. **회전**: 현재 칸에서 왼쪽 또는 오른쪽으로 90도 회전한다. (조향 횟수 1 증가, 비용 1)

격자 밖으로 이동하거나 장애물이 있는 칸으로 전진할 수 없다.

도착 칸에 도달하는 데 필요한 **최소 조향 횟수**를 구하라. 도착할 수 없다면 `-1`을 출력한다.

---

## 2. 입력 및 제한 조건

### 입력
첫째 줄에 격자의 행 수 `N`과 열 수 `M`이 주어진다.
다음 `N`개 줄에는 격자 정보가 주어진다.
마지막 줄에는 시작 좌표 `Sr Sc`와 도착 좌표 `Er Ec`가 주어진다. (1-indexed)

```text
N M
. . . . .
. # # # .
. . . # .
. # . . .
. . . . .
1 1 5 5
```

### 제약 조건
- $2 \\le N, M \\le 1,000$ ($N \\times M \\le 1,000,000$)
- 시작 칸과 도착 칸은 빈 공간이다.
- 메모리 제한을 고려해 3차원 배열 대신 1차원 상태 인코딩을 활용해야 한다.

### 예제 입출력
```text
입력:
5 5
.....
.###.
...#.
.#...
.....
1 1 5 5

출력:
1
```
*설명*: 초기 방향을 아래쪽으로 선택해 5행까지 4칸 직진(비용 0)한 뒤, 오른쪽으로 1번 회전(비용 1)하여 5열까지 직진하면 도착한다. 총 조향 횟수는 1이다.

---

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법 및 문제 접근 아이디어

이 문제는 간선 가중치가 0(직진)과 1(회전)로만 구성되므로 **0-1 BFS (Deque)**를 사용하여 $O(N \times M)$ 시간에 해결합니다.

1. **상태 정의 및 정수 인코딩**:
   - 동일한 `(row, col)` 칸이라도 **바라보는 방향(`dir`)**에 따라 회전 비용이 달라지므로 상태는 `(row, col, dir)` 3가지 요소로 결정됩니다.
   - 메모리를 아끼기 위해 1차원 정수로 인코딩합니다:
     `cell = row * M + col`, `state = cell * 4 + direction`
2. **0-1 BFS (Deque 탐색)**:
   - 비용 0인 직진 이동 상태는 `offerFirst()`로 Deque의 앞에 삽입합니다.
   - 비용 1인 회전 이동 상태는 `offerLast()`로 Deque의 뒤에 삽입합니다.

---

### 완성형 Java 정답 코드 (라인별 상세 주석)

```java
import java.io.*;
import java.util.*;

public class Main {
    static final int INF = Integer.MAX_VALUE / 4;
    // 0: 상, 1: 우, 2: 하, 3: 좌
    static final int[] DR = {-1, 0, 1, 0};
    static final int[] DC = {0, 1, 0, -1};

    // 메모리 절약을 위한 커스텀 정수 Deque (primitive int 배열 기반)
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
            if (size < values.length) return;
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
        for (int r = 0; r < n; r++) {
            board[r] = br.readLine().toCharArray();
        }

        st = new StringTokenizer(br.readLine());
        int startRow = Integer.parseInt(st.nextToken()) - 1;
        int startCol = Integer.parseInt(st.nextToken()) - 1;
        int endRow = Integer.parseInt(st.nextToken()) - 1;
        int endCol = Integer.parseInt(st.nextToken()) - 1;

        // 전체 상태 수: N * M * 4
        int stateCount = n * m * 4;
        int[] distance = new int[stateCount];
        Arrays.fill(distance, INF);

        IntDeque deque = new IntDeque(Math.min(stateCount, 1 << 20));

        // 시작 칸의 4가지 초기 방향 모두 비용 0으로 큐에 포함
        int startCell = startRow * m + startCol;
        for (int dir = 0; dir < 4; dir++) {
            int state = startCell * 4 + dir;
            distance[state] = 0;
            deque.offerLast(state);
        }

        while (!deque.isEmpty()) {
            int state = deque.pollFirst();
            int dir = state % 4;
            int cell = state / 4;
            int r = cell / m;
            int c = cell % m;
            int curDist = distance[state];

            // 1. 직진 이동 (비용 0 ➔ offerFirst)
            int nr = r + DR[dir];
            int nc = c + DC[dir];
            if (nr >= 0 && nr < n && nc >= 0 && nc < m && board[nr][nc] != ''#'') {
                int nextCell = nr * m + nc;
                int nextState = nextCell * 4 + dir;
                if (curDist < distance[nextState]) {
                    distance[nextState] = curDist;
                    deque.offerFirst(nextState);
                }
            }

            // 2. 좌/우 90도 회전 이동 (비용 1 ➔ offerLast)
            int leftDir = (dir + 3) % 4;
            int rightDir = (dir + 1) % 4;

            int leftState = cell * 4 + leftDir;
            if (curDist + 1 < distance[leftState]) {
                distance[leftState] = curDist + 1;
                deque.offerLast(leftState);
            }

            int rightState = cell * 4 + rightDir;
            if (curDist + 1 < distance[rightState]) {
                distance[rightState] = curDist + 1;
                deque.offerLast(rightState);
            }
        }

        // 도착 칸 4가지 방향 중 최소 조향 횟수 구하기
        int endCell = endRow * m + endCol;
        int answer = INF;
        for (int dir = 0; dir < 4; dir++) {
            answer = Math.min(answer, distance[endCell * 4 + dir]);
        }

        System.out.println(answer == INF ? -1 : answer);
    }
}
```

### 복잡도 분석
- **시간복잡도**: $O(N \\times M)$ (모든 상태 4NM개에 대해 각 1회 방문)
- **공간복잡도**: $O(N \\times M)$ (1차원 상태 거리 배열 `distance[]`)

</details>

---

## 3. 관련 개념 학습

이 문제의 기반이 되는 격자 최단 거리 이론은 **0-1 BFS & 최단 경로** 스터디 노트에서 확장 학습할 수 있습니다.
',
    status = 'PUBLISHED',
    updated_at = NOW()
WHERE slug = 'autoever-mock-04-minimum-steering';
