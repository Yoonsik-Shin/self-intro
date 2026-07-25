-- V87: Blend conversions, sorting, initialization, and Stream API into original 7 Java syntax studies

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- 1. 문법 1 — 입출력, 자료형, 형변환 (java-coding-test-01-io-and-types)
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 문법 1 — 입출력, 자료형, 형변환

> 코딩테스트의 시작인 입출력 속도 최적화, 기본 자료형의 범위, 문자열 ↔ 숫자 형변환, BigInteger 처리, 그리고 안전한 형변환(Casting) 기법을 정리합니다.

---

## 1. 입출력 속도 최적화 (Fast I/O)

### 1) Scanner vs BufferedReader
- `Scanner`: 정규식 파싱 오버헤드로 인해 데이터 수가 $100,000$개 이상일 때 **시간 초과(TLE)**가 발생합니다.
- `BufferedReader` + `StringTokenizer`: 백준/프로그래머스 입출력의 필수 표준입니다.

```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken());
        long m = Long.parseLong(st.nextToken());

        // 출력 시 System.out.println 반복 금지 ➔ StringBuilder 사용
        StringBuilder sb = new StringBuilder();
        sb.append(n).append(" ").append(m).append("\n");
        System.out.print(sb);
    }
}
```

### 2) 초고속 custom FastReader (데이터 N >= 1,000,000 일 때)

```java
static class FastReader {
    private final InputStream in = System.in;
    private final byte[] buffer = new byte[1 << 16];
    private int head = 0, tail = 0;

    private int read() throws IOException {
        if (head >= tail) {
            head = 0;
            tail = in.read(buffer, 0, buffer.length);
            if (tail <= 0) return -1;
        }
        return buffer[head++];
    }

    public int nextInt() throws IOException {
        int c = read();
        while (c <= 32) c = read();
        int res = 0;
        while (c > 32) {
            res = res * 10 + c - ''0'';
            c = read();
        }
        return res;
    }
}
```

---

## 2. 문자열 ↔ 숫자 상호 변환

```java
String str = "12345";

// 1. String -> int / long
int num = Integer.parseInt(str);
long longNum = Long.parseLong(str);

// 2. int / long -> String
String s1 = String.valueOf(num);
String s2 = Integer.toString(num);
```

---

## 3. 기본 자료형 범위 및 BigInteger

| 자료형 | 크기 | 값의 범위 | 코딩테스트 주의사항 |
| :--- | :--- | :--- | :--- |
| `int` | 32-bit (4 Byte) | $-2,147,483,648 \sim 2,147,483,647$ (약 $\pm 2\times 10^9$) | 20억 초과 시 오버플로우 |
| `long` | 64-bit (8 Byte) | $-9 \times 10^{18} \sim 9 \times 10^{18}$ | 거리, 누적합, 덧셈 결과에 무조건 선언 |
| `double` | 64-bit | 유효숫자 약 15자리 | 소수점 연산 시 부동소수점 오차 주의 |

### BigInteger (무한대 정수 연산)

```java
import java.math.BigInteger;

BigInteger a = new BigInteger("1000000000000000000000");
BigInteger b = new BigInteger("2000000000000000000000");

BigInteger sum = a.add(b);
BigInteger mul = a.multiply(b);
```

---

## 4. 형변환 (Casting) 시 자주 하는 실수

```java
int a = 1_000_000;
int b = 1_000_000;

// [오답] a * b 결과가 이미 int 오버플로우를 발생시킨 뒤 long에 할당됨
long wrong = a * b; 

// [정답] 한쪽 피연산자를 명시적으로 long으로 형변환 후 곱셈 수행
long correct = (long) a * b;
long correct2 = 1L * a * b;
```
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-01-io-and-types';


-- =========================================================================
-- 2. 문법 2 — 배열과 문자열 (java-coding-test-02-array-and-string)
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 문법 2 — 배열과 문자열

> 문자열 ↔ 배열 ↔ 자릿수 변환, 2차원 배열 회전 및 채우기, 정규식을 활용한 문자열 파싱, 그리고 Arrays 핵심 활용법을 정리합니다.

---

## 1. 문자열 ↔ 배열 ↔ 자릿수 변환

```java
String str = "12345";

// 1. String -> char[]
char[] charArr = str.toCharArray(); // [1, 2, 3, 4, 5]

// 2. char[] -> String
String fromChar = new String(charArr);

// 3. String -> String[] (한 글자씩 분할)
String[] strArr = str.split(""); // ["1", "2", "3", "4", "5"]

// 4. String -> int[] (각 자릿수를 숫자로 변환)
int[] digits = str.chars().map(c -> c - ''0'').toArray(); // [1, 2, 3, 4, 5]
```

---

## 2. 2차원 배열 90도 회전 & 채우기 테크닉

```java
// 1. 2차원 배열 특정 값으로 한번에 채우기
int[][] grid = new int[N][M];
for (int[] row : grid) Arrays.fill(row, -1);

// 2. N x M 행렬 시계방향 90도 회전
public static int[][] rotate90Clockwise(int[][] grid) {
    int n = grid.length;
    int m = grid[0].length;
    int[][] rotated = new int[m][n];

    for (int r = 0; r < n; r++) {
        for (int c = 0; c < m; c++) {
            rotated[c][n - 1 - r] = grid[r][c];
        }
    }
    return rotated;
}
```

---

## 3. 문자열 치환 및 정규식 치환 치트시트

```java
String str = "Hello World 123 !@#";

// 1. 특정 문자열 치환
String s1 = str.replace("World", "Java");

// 2. 정규식을 활용한 숫자가 아닌 문자 제거
String numbersOnly = str.replaceAll("[^0-9]", ""); // "123"

// 3. 다중 구분자 split (공백, 쉼표, 콜론 구분)
String text = "apple,banana:cherry grape";
String[] words = text.split("[,:\\s]+"); // ["apple", "banana", "cherry", "grape"]

// 4. String.join
String joined = String.join("-", words); // "apple-banana-cherry-grape"
```
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-02-array-and-string';


-- =========================================================================
-- 3. 문법 3 — List, Set, Map (java-coding-test-03-collections)
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 문법 3 — List, Set, Map

> 배열 ↔ 리스트 상호 변환, Map 고급 연산(`getOrDefault`, `computeIfAbsent`), 2차원 그래프 리스트 초기화, 그리고 TreeSet/TreeMap 범주 조회를 정리합니다.

---

## 1. 배열 ↔ 리스트 상호 변환 (Array <-> List)

### 1) Primitive `int[]` ↔ `List<Integer>`
```java
int[] arr = {1, 2, 3, 4, 5};

// 1. int[] -> List<Integer>
List<Integer> list = Arrays.stream(arr).boxed().collect(Collectors.toList());

// 2. List<Integer> -> int[]
int[] arrFromList = list.stream().mapToInt(Integer::intValue).toArray();
```

### 2) Wrapper `String[]` ↔ `List<String>`
```java
String[] strArr = {"A", "B", "C"};

// 1. String[] -> List<String>
List<String> strList = new ArrayList<>(Arrays.asList(strArr));

// 2. List<String> -> String[]
String[] strArrFromList = strList.toArray(new String[0]);
```

---

## 2. 2차원 그래프 리스트 & Map 고급 연산

```java
// 1. 그래프 인접 리스트 (List<List<Integer>>) 초기화
List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i <= N; i++) {
    graph.add(new ArrayList<>());
}

// 2. Map에 List 초기화하며 추가 (computeIfAbsent)
Map<Integer, List<Integer>> map = new HashMap<>();
map.computeIfAbsent(1, k -> new ArrayList<>()).add(100);

// 3. getOrDefault 빈도 카운팅
Map<String, Integer> countMap = new HashMap<>();
countMap.put("apple", countMap.getOrDefault("apple", 0) + 1);
```

---

## 3. TreeMap & TreeSet (범위 탐색)

```java
TreeSet<Integer> treeSet = new TreeSet<>();
treeSet.addAll(List.of(10, 20, 30, 40, 50));

// 1. 25 이하의 가장 큰 값
Integer floor = treeSet.floor(25); // 20

// 2. 25 이상의 가장 작은 값
Integer ceiling = treeSet.ceiling(25); // 30
```
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-03-collections';


-- =========================================================================
-- 4. 문법 4 — 정렬과 Comparator (java-coding-test-04-sorting-and-comparator)
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 문법 4 — 정렬과 Comparator

> 원시타입/객체/2차원 배열 정렬, 내림차순 정렬, 다중 조건 정렬, 그리고 Comparator 오버플로우 방지 기법을 정리합니다.

---

## 1. 배열 정렬 (원시 타입 & 객체)

```java
int[] arr = {5, 2, 8, 1, 3};

// 1. 원시타입 int[] 오름차순 정렬
Arrays.sort(arr); // {1, 2, 3, 5, 8}

// 2. 원시타입 int[] 내림차순 정렬 (Stream 사용)
int[] descArr = Arrays.stream(arr).boxed()
                      .sorted(Comparator.reverseOrder())
                      .mapToInt(Integer::intValue)
                      .toArray();

// 3. Wrapper Integer[] 내림차순 정렬
Integer[] wrapperArr = {5, 2, 8, 1, 3};
Arrays.sort(wrapperArr, Collections.reverseOrder());
```

---

## 2. 2차원 배열 (`int[][]`) 정렬

```java
int[][] matrix = {{2, 6}, {1, 3}, {1, 2}, {8, 10}};

// 첫 번째 원소 오름차순 -> 같으면 두 번째 원소 오름차순
Arrays.sort(matrix, (a, b) -> {
    if (a[0] == b[0]) return Integer.compare(a[1], b[1]);
    return Integer.compare(a[0], b[0]);
});
```

> **주의**: `a[0] - b[0]` 뺄셈 연산은 음수가 포함되면 **정수 오버플로우**가 발생합니다. 반드시 **`Integer.compare(a[0], b[0])`**를 사용하세요!

---

## 3. 커스텀 객체 리스트 다중 조건 정렬

```java
class Node {
    int id;
    int score;
    Node(int id, int score) { this.id = id; this.score = score; }
}

List<Node> nodes = new ArrayList<>();

// score 내림차순 -> score 같으면 id 오름차순
nodes.sort((a, b) -> {
    if (a.score == b.score) return Integer.compare(a.id, b.id);
    return Integer.compare(b.score, a.score); // 내림차순
});
```
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-04-sorting-and-comparator';


-- =========================================================================
-- 5. 문법 5 — Stack, Queue, Deque, PriorityQueue (java-coding-test-05-stack-queue-priority-queue)
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 문법 5 — Stack, Queue, Deque, PriorityQueue

> ArrayDeque 기반의 스택/큐, PriorityQueue 최대 힙(Max-Heap) 및 배열 힙, 그리고 리스트 최대/최소 구하기 기법을 정리합니다.

---

## 1. Stack 대신 ArrayDeque 사용

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); // LIFO
stack.push(2);
int top = stack.pop(); // 2

Deque<Integer> queue = new ArrayDeque<>();
queue.offer(1); // FIFO
queue.offer(2);
int front = queue.poll(); // 1
```

---

## 2. PriorityQueue 최대 힙 (Max-Heap) & 커스텀 힙

```java
// 1. 기본 최소 힙 (Min-Heap)
PriorityQueue<Integer> minHeap = new PriorityQueue<>();

// 2. 최대 힙 (Max-Heap)
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());

// 3. 커스텀 배열 힙 [Node, Distance] (거리 오름차순)
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));
```

---

## 3. 리스트 & 커스텀 객체 최댓값 / 최솟값 구하기 (Collections.max/min)

```java
List<Integer> list = List.of(5, 2, 8, 1, 3);

// 1. 기본 숫자 리스트 최대/최소
int maxVal = Collections.max(list); // 8
int minVal = Collections.min(list); // 1

// 2. 커스텀 객체 리스트 최댓값 (score 기준)
class Node { int score; Node(int score) { this.score = score; } }
List<Node> nodes = List.of(new Node(80), new Node(95), new Node(70));
Node maxNode = Collections.max(nodes, Comparator.comparingInt(n -> n.score)); // score 95
```
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-05-stack-queue-priority-queue';


-- =========================================================================
-- 6. 문법 6 — Math, 진법, 비트 연산 (java-coding-test-06-math-base-and-bit)
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 문법 6 — Math, 진법, 비트 연산

> Math 클래스의 Math.max/min, 유클리드 호제법(GCD/LCM), 에라토스테네스의 체(소수 판별), 진법 변환, 그리고 비트 연산 테크닉을 정리합니다.

---

## 1. Math 클래스 최대/최소 & 절대값

```java
int a = 10, b = 20;

int max = Math.max(a, b);
int min = Math.min(a, b);
int abs = Math.abs(-15);
long round = Math.round(3.6); // 4
```

---

## 2. 유클리드 호제법 (최대공약수 GCD & 최소공배수 LCM)

```java
// 최대공약수 (GCD)
public static long gcd(long a, long b) {
    while (b != 0) {
        long r = a % b;
        a = b;
        b = r;
    }
    return a;
}

// 최소공배수 (LCM)
public static long lcm(long a, long b) {
    return (a / gcd(a, b)) * b;
}
```

---

## 3. 에라토스테네스의 체 (소수 판별 $O(N \log \log N)$)

```java
public static boolean[] isPrimeSieve(int n) {
    boolean[] isPrime = new boolean[n + 1];
    Arrays.fill(isPrime, true);
    isPrime[0] = isPrime[1] = false;

    for (int i = 2; i * i <= n; i++) {
        if (isPrime[i]) {
            for (int j = i * i; j <= n; j += i) {
                isPrime[j] = false;
            }
        }
    }
    return isPrime;
}
```

---

## 4. 진법 변환 (Base Conversion)

```java
int num = 42;

// 1. 10진수 -> 2진수, 16진수 String 변환
String binary = Integer.toBinaryString(num); // "101010"
String hex = Integer.toHexString(num);       // "2a"

// 2. K진수 String -> 10진수 int 변환
int val = Integer.parseInt("101010", 2); // 42
int val2 = Integer.parseInt("2A", 16);    // 42
```
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-06-math-base-and-bit';


-- =========================================================================
-- 7. 문법 7 — 실전 템플릿과 자주 하는 실수 (java-coding-test-07-templates-and-mistakes)
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 문법 7 — 실전 템플릿과 자주 하는 실수

> 코딩테스트 필수 Stream API 핵심 연산, 프로그래머스(Programmers) 템플릿, 예외(Exception) 진단 가이드, 그리고 타임아웃(TLE) 응급 구조 체크리스트를 정리합니다.

---

## 1. 코딩테스트 필수 Stream API 연산 치트시트

```java
int[] arr = {1, 2, 2, 3, 4, 5, 6};

// 1. 필터링 (짝수만 추출)
int[] evens = Arrays.stream(arr).filter(x -> x % 2 == 0).toArray();

// 2. 중복 제거 (Distinct)
int[] unique = Arrays.stream(arr).distinct().toArray(); // {1, 2, 3, 4, 5, 6}

// 3. 합계 및 평균
int sum = Arrays.stream(arr).sum();
double avg = Arrays.stream(arr).average().orElse(0.0);

// 4. 조건 만족 여부 검증 (Match)
boolean hasEven = Arrays.stream(arr).anyMatch(x -> x % 2 == 0); // true
boolean allPositive = Arrays.stream(arr).allMatch(x -> x > 0);  // true
```

---

## 2. 프로그래머스(Programmers) 기본 보일러플레이트

```java
import java.util.*;

class Solution {
    public int solution(int[][] board, String[] moves) {
        int answer = 0;
        // 1차원 상태 인코딩 및 자료구조 배치 후 알고리즘 구현
        return answer;
    }
}
```

---

## 3. 예외(Exception) 진단 & 디버깅 가이드

| 발생 예외 | 주요 발생 원인 | 해결책 |
| :--- | :--- | :--- |
| `NullPointerException` | `graph[i]` 인접리스트 미초기화, `Map.get(key)` 결과 `null` 참조 | `computeIfAbsent`, 객체 초기화 확인 |
| `IndexOutOfBoundsException` | 1-indexed 배열에 0-indexed 접근, 격자 범위를 벗어난 인덱스 참조 | `0 <= nr && nr < N` 조건식 최우선 검증 |
| `StackOverflowError` | DFS 재귀 호출 깊이가 너무 깊거나 기저 조건(Base Case) 누락 | BFS로 전환하거나 재귀 호출 기저 조건 추가 |
| `OutOfMemoryError` | `new Node()` 객체를 루프 안에서 수백만 개 생성, 다차원 배열 과다 선언 | 1차원 정수 인코딩 (`(r * M + c) * 4 + d`) 사용 |

---

## 4. 타임아웃 (Time Limit Exceeded) 응급 구조 체크리스트

1. **`System.out.println` 반복 호출 금지** ➔ `StringBuilder` 사용.
2. **`String` 덧셈 연산자 (`+`) 금지** ➔ `StringBuilder.append()` 사용.
3. **Queue 삽입 시 방문 처리 (`visited[next] = true`)** ➔ 큐에서 꺼낼 때 하지 말고 **넣을 때 처리**.
4. **다익스트라 낡은 경로 스킵 (`cur.dist != dist[cur.node]`)** ➔ 필수 작성.
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-07-templates-and-mistakes';
