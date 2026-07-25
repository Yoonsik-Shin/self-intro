-- V81: Enrich all algorithm concept studies with deep, exhaustive conceptual explanations, visual diagrams (Mermaid + ASCII), step-by-step analysis, complexity tables, Java codes, templates, and checklists

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- 1. 다익스트라 (Dijkstra) 알고리즘 정리 (dijkstra-algorithm)
-- =========================================================================
UPDATE study
SET content_markdown = '# 다익스트라 (Dijkstra) 알고리즘 정리

> 가중치 그래프에서 음수 간선이 없을 때, 특정 출발 정점으로부터 모든 다른 정점까지의 최단 경로를 탐색하는 대표적인 최단 경로(Shortest Path) 알고리즘입니다.

---

## 1. 알고리즘 개념 및 핵심 원리

### 1) 그리디(Greedy) + 최단 거리 갱신(Relaxation)
다익스트라 알고리즘은 매 단계마다 **현재 방문하지 않은 정점 중 출발지로부터의 최단 거리가 가장 짧은 정점을 우선적으로 선택**하는 그리디 방식을 사용합니다. 선택된 정점 $u$를 거쳐 이웃 정점 $v$로 이동하는 경로가 기존 정점 $v$의 최단 거리보다 짧다면 최단 거리를 갱신(Relaxation)합니다.

$$\text{dist}[v] = \min(\text{dist}[v], \; \text{dist}[u] + \text{weight}(u, v))$$

### 2) 왜 음수 가중치 간선이 있으면 안 될까?
다익스트라는 "이미 방문하여 최단 거리가 확정된 정점은 다시는 거리가 줄어들지 않는다"는 전제를 기반으로 작동합니다. 만약 음수 가중치가 존재하면, 이미 확정된 정점이라도 음수 간선을 거쳐 거리가 더 짧아질 수 있어 그리디한 전제가 깨지고 오답을 유출합니다. (음수 간선이 존재할 때는 벨만-포드나 SPFA 알고리즘을 사용해야 합니다.)

---

## 2. 시각화 및 데이터 흐름

### 1) 아스키 아트 (ASCII Art) 거리 배열 갱신 흐름

```text
[출발점 S (dist=0)]
   │
   ├────── (비용 2) ─────► [정점 A (dist: INF -> 2)]
   │                            │
   └────── (비용 5) ─────► [정점 B (dist: INF -> 5)]
                                ▲
                                │ (비용 1: S -> A -> B 총 3)
                                └────── (2 + 1 = 3 < 5 ➔ dist[B] 3으로 갱신!)
```

### 2) 데이터 흐름 순서도 (Mermaid)

```mermaid
graph TD
    A["출발 정점 S의 dist[S]=0 지정 및 PriorityQueue 삽입"] --> B["PriorityQueue에서 최단 거리가 가장 작은 정점 u 꺼냄"]
    B --> C{"현재 u의 거리 값이 dist[u]와 일치하는가?"}
    C -- "아니오 (이미 처리된 낡은 상태)" --> B
    C -- "예 (유효한 최단 거리 상태)" --> D["u에서 나가는 모든 간선 (u -> v, weight) 탐색"]
    D --> E{"dist[u] + weight < dist[v] 인가?"}
    E -- "예 (더 짧은 경로 발견)" --> F["dist[v] = dist[u] + weight 갱신 후 PriorityQueue 삽입"]
    E -- "아니오" --> G{"PriorityQueue가 비어있는가?"}
    F --> G
    G -- "아니오 (탐색 계속)" --> B
    G -- "예 (최단 경로 확정)" --> H["모든 정점 최단 거리 탐색 완료"]
```

---

## 3. 알고리즘 단계별 동작 과정 (Step-by-Step)

1. **초기화**: 모든 정점의 최단 거리를 `INF`로 설정하고, 출발 정점 $S$의 `dist[S] = 0`으로 초기화합니다. 우선순위 큐(Min-Heap)에 `(S, 0)`을 넣습니다.
2. **최소 정점 추출**: 우선순위 큐에서 가장 거리가 짧은 정점 $u$를 꺼냅니다.
3. **중복 스킵 처리**: `cur.distance != dist[cur.node]` 인 경우 이미 더 짧은 경로로 처리된 정점이므로 스킵합니다.
4. **이웃 정점 갱신**: $u$와 연결된 정점 $v$에 대해 `dist[u] + weight < dist[v]` 라면 `dist[v]`를 갱신하고 우선순위 큐에 `(v, dist[v])`를 추가합니다.
5. **반복 및 종료**: 우선순위 큐가 빌 때까지 2~4 과정을 반복합니다.

---

## 4. 언제 사용할까? & 복잡도 분석

### 1) 사용 케이스
- 간선 가중치가 **모두 양수(0 이상)**일 때 단일 출발지 최단 경로 탐색
- 중요 경유지 간의 최단 거리 행렬(`between[i][j]`)을 구축할 때
- 최소 연료, 최소 조향 비용, 최소 이동 시간 구하기

### 2) 복잡도 분석
| 구분 | 시간 복잡도 | 공간 복잡도 |
| :--- | :--- | :--- |
| **PriorityQueue 다익스트라** | $O((V + E) \log V)$ | $O(V + E)$ |

---

## 5. 백준 1753: 최단경로

[문제 바로가기](https://www.acmicpc.net/problem/1753)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 풀이 방법
1. 인접 리스트 `graph[]`와 최단 거리 배열 `dist[]`를 `INF`로 초기화합니다.
2. 우선순위 큐(Min-Heap)를 생성하고 출발 정점 `(start, 0)`을 추가합니다.
3. 큐에서 정점을 꺼내어 최단 거리를 갱신하고 결과를 출력합니다.

### 완성형 Java 정답 코드
```java
import java.io.*;
import java.util.*;

public class Main {
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

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int v = Integer.parseInt(st.nextToken());
        int e = Integer.parseInt(st.nextToken());
        int start = Integer.parseInt(br.readLine().trim());

        List<Edge>[] graph = new ArrayList[v + 1];
        for (int i = 1; i <= v; i++) {
            graph[i] = new ArrayList<>();
        }

        for (int i = 0; i < e; i++) {
            st = new StringTokenizer(br.readLine());
            int from = Integer.parseInt(st.nextToken());
            int to = Integer.parseInt(st.nextToken());
            int w = Integer.parseInt(st.nextToken());
            graph[from].add(new Edge(to, w));
        }

        int[] dist = new int[v + 1];
        Arrays.fill(dist, INF);

        PriorityQueue<Edge> pq = new PriorityQueue<>();
        dist[start] = 0;
        pq.offer(new Edge(start, 0));

        while (!pq.isEmpty()) {
            Edge cur = pq.poll();
            // ★ 필수: 이미 더 짧은 경로로 탐색된 정점은 스킵
            if (cur.weight != dist[cur.to]) continue;

            for (Edge next : graph[cur.to]) {
                if (dist[next.to] > dist[cur.to] + next.weight) {
                    dist[next.to] = dist[cur.to] + next.weight;
                    pq.offer(new Edge(next.to, dist[next.to]));
                }
            }
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= v; i++) {
            if (dist[i] == INF) sb.append("INF\n");
            else sb.append(dist[i]).append("\n");
        }
        System.out.print(sb);
    }
}
```
</details>

---

## 6. 범용 Java 템플릿 코드

```java
import java.util.*;

public class DijkstraTemplate {
    static final long INF = Long.MAX_VALUE / 4;

    public static class Edge {
        public int to;
        public long weight;
        public Edge(int to, long weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    public static class NodeState implements Comparable<NodeState> {
        public int node;
        public long distance;
        public NodeState(int node, long distance) {
            this.node = node;
            this.distance = distance;
        }
        @Override
        public int compareTo(NodeState o) {
            return Long.compare(this.distance, o.distance);
        }
    }

    public static long[] dijkstra(int start, int v, List<Edge>[] graph) {
        long[] dist = new long[v + 1];
        Arrays.fill(dist, INF);

        PriorityQueue<NodeState> pq = new PriorityQueue<>();
        dist[start] = 0;
        pq.offer(new NodeState(start, 0));

        while (!pq.isEmpty()) {
            NodeState cur = pq.poll();
            if (cur.distance != dist[cur.node]) continue;

            for (Edge edge : graph[cur.node]) {
                if (dist[edge.to] > cur.distance + edge.weight) {
                    dist[edge.to] = cur.distance + edge.weight;
                    pq.offer(new NodeState(edge.to, dist[edge.to]));
                }
            }
        }

        return dist;
    }
}
```

---

## 7. 자주 하는 실수 & 체크리스트

1. **`cur.distance != dist[cur.node]` 스킵 구문 누락**: 이 구문을 누락하면 큐에 중복으로 수없이 쌓여 시간 초과(TLE) 발생.
2. **`INF` 덧셈 오버플로우**: `Integer.MAX_VALUE`를 쓰면 `INF + weight` 시 음수로 역전되어 오답. `Integer.MAX_VALUE / 4` 사용.
3. **PriorityQueue 오름차순 정렬 미지정**: `Comparable`의 `compareTo` 구문을 구현하지 않거나 정렬이 뒤바뀌면 일반 Queue처럼 동작하여 최단 경로 보장 불가능.

---

## 8. 추천 관련 문제

1. [백준 1753 — 최단경로](https://www.acmicpc.net/problem/1753) — 다익스트라 기본
2. [백준 1916 — 최소비용 구하기](https://www.acmicpc.net/problem/1916) — 목적지 최단 경로
3. [현대오토에버 대비 모의문제 1 — 필수 점검소를 경유하는 테스트카](http://localhost:3000/study/autoever-mock-01-required-checkpoints) — 다익스트라 응용 문제
',
    updated_at = NOW()
WHERE slug = 'dijkstra-algorithm';


-- =========================================================================
-- 2. 비트마스크 (Bitmask) & 비트 연산 정리 (bitmask-algorithm)
-- =========================================================================
UPDATE study
SET content_markdown = '# 비트마스크 (Bitmask) & 비트 연산 정리

> 정수의 이진수 비트 표현(Binary Representation)을 활용하여 소규모 부분집합(Set)을 효율적으로 표현하고, 비트 연산자만으로 초고속 $O(1)$ 집합 연산을 수행하는 대표적인 테크닉입니다.

---

## 1. 알고리즘 개념 및 핵심 원리

### 1) 왜 비트마스크를 사용하는가?
일반적인 `Set<Integer>` 또는 `boolean[]` 배열을 사용할 때 발생하는 메모리 오버헤드와 원소 추가/삭제/포함 여부 확인 시의 함수 호출 비용을 완전히 없앴습니다. 32비트 정수 하나만으로 최대 32개 원소의 포함 여부를 관리하며, CPU 하드웨어 단위 비트 연산으로 $O(1)$ 초고속 수행이 가능합니다.

### 2) 핵심 비트 연산자 공식표

```text
원소 {0, 2, 3}이 포함된 비트마스크 (십진수 13):
Index:  7  6  5  4  3  2  1  0
Bit  : [0][0][0][0][1][1][0][1]
                        │  │     │
                        3  2     0 번 원소 켜짐 (1 << i)
```

| 동작 구분 | 비트 연산 공식 | 설명 |
| :--- | :--- | :--- |
| **i번째 원소 추가 (Set)** | `mask | (1 << i)` | $i$번째 비트를 1로 설정 |
| **i번째 원소 삭제 (Clear)** | `mask & ~(1 << i)` | $i$번째 비트를 0으로 설정 |
| **i번째 원소 확인 (Check)** | `(mask & (1 << i)) != 0` | $i$번째 비트가 1인지 확인 (**괄호 필수**) |
| **i번째 원소 토글 (Toggle)** | `mask ^ (1 << i)` | $i$번째 비트를 반전 |
| **K개 전체 원소 집합** | `(1 << K) - 1` | $0 \sim K-1$ 비트가 모두 1인 상태 |

---

## 2. 언제 사용할까? & 복잡도 분석

### 1) 사용 케이스
- 원소 개수가 소규모일 때 ($N \le 30$) 집합의 합집합, 교집합, 차집합 연산
- 비트마스크 DP (TSP 등)에서 정점 방문 여부를 정수 상태 키 값으로 메모이제이션할 때
- 모든 부분집합(Subset)을 완전 탐색해야 하는 백트래킹 문제

### 2) 복잡도 분석
| 구분 | 시간 복잡도 | 공간 복잡도 |
| :--- | :--- | :--- |
| **비트 연산 (Check/Set/Clear)** | $O(1)$ | $O(1)$ (정수 1개) |

---

## 3. 백준 11723: 집합

[문제 바로가기](https://www.acmicpc.net/problem/11723)

<details>
<summary>▶ [정답 보기] 풀이 방법 및 완성형 Java 코드</summary>

### 완성형 Java 정답 코드
```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int m = Integer.parseInt(br.readLine().trim());

        int bit = 0;
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < m; i++) {
            StringTokenizer st = new StringTokenizer(br.readLine());
            String op = st.nextToken();

            if (op.equals("add")) {
                int x = Integer.parseInt(st.nextToken()) - 1;
                bit |= (1 << x);
            } else if (op.equals("remove")) {
                int x = Integer.parseInt(st.nextToken()) - 1;
                bit &= ~(1 << x);
            } else if (op.equals("check")) {
                int x = Integer.parseInt(st.nextToken()) - 1;
                sb.append((bit & (1 << x)) != 0 ? "1\n" : "0\n");
            } else if (op.equals("toggle")) {
                int x = Integer.parseInt(st.nextToken()) - 1;
                bit ^= (1 << x);
            } else if (op.equals("all")) {
                bit = (1 << 20) - 1;
            } else if (op.equals("empty")) {
                bit = 0;
            }
        }

        System.out.print(sb);
    }
}
```
</details>

---

## 4. 범용 Java 비트 연산 템플릿 코드

```java
public class BitmaskTemplate {
    public static int addBit(int mask, int i) { return mask | (1 << i); }
    public static int removeBit(int mask, int i) { return mask & ~(1 << i); }
    public static boolean hasBit(int mask, int i) { return (mask & (1 << i)) != 0; }
    public static int toggleBit(int mask, int i) { return mask ^ (1 << i); }
    public static int getFullMask(int k) { return (1 << k) - 1; }
}
```

---

## 5. 자주 하는 실수 & 체크리스트

1. **비트 연산자 괄호 생략**: 자바 비트 연산자(`&`, `|`)는 비교 연산자(`!=`)보다 우선순위가 낮습니다. `(mask & (1 << i)) != 0` 처럼 반드시 괄호를 묶으세요!
2. **32비트 이상 Shift 연산**: 30번째 이상의 비트를 연산할 때 `1 << i`는 `int` 오버플로우가 발생합니다. `1L << i` 로 `long` 시프트를 작성해야 합니다.

---

## 6. 추천 관련 문제

1. [백준 11723 — 집합](https://www.acmicpc.net/problem/11723)
2. [비트마스크 DP 알고리즘 정리](http://localhost:3000/study/bitmask-dp-algorithm)
',
    updated_at = NOW()
WHERE slug = 'bitmask-algorithm';
