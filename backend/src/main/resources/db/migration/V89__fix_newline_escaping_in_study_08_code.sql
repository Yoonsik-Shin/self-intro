-- V89: Fix literal newline escaping in Study 8 (Master Cheat Sheet) code block

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- Fix sb.append(n).append("\n") in Study 8
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 시험장 필수 최종 치트시트 (Master Cheat Sheet)

> 시험 직전 3분 동안 훑어보는 **자바 코딩테스트 필수 코드 모음집**입니다. 입출력, 형변환, 정렬, 초기화, Stream, 비트 연산, 그리고 자주 하는 실수를 단 하나의 표와 코드 블록으로 정리했습니다.

---

## ⚡ 1. 입출력 & 프로그래머스 보일러플레이트

```java
import java.io.*;
import java.util.*;
import java.util.stream.*;

// [백준/소프티어 표준 입출력]
public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken());
        StringBuilder sb = new StringBuilder();
        sb.append(n).append("\\n");
        System.out.print(sb);
    }
}

// [프로그래머스 표준 제출 양식]
class Solution {
    public int solution(int[][] board, String[] moves) {
        int answer = 0;
        return answer;
    }
}
```

---

## 🔄 2. 형변환 & 타입 치환 공식표 (Conversions)

```java
// 1. primitive int[] -> List<Integer>
List<Integer> list = Arrays.stream(arr).boxed().collect(Collectors.toList());

// 2. List<Integer> -> primitive int[]
int[] arr = list.stream().mapToInt(Integer::intValue).toArray();

// 3. String[] -> List<String>
List<String> strList = new ArrayList<>(Arrays.asList(strArr));

// 4. List<String> -> String[]
String[] strArr = strList.toArray(new String[0]);

// 5. String -> int / long
int num = Integer.parseInt(str);
long longNum = Long.parseLong(str);

// 6. int / long -> String
String s = String.valueOf(num);

// 7. String -> char[] -> String
char[] charArr = str.toCharArray();
String fromChar = new String(charArr);

// 8. String -> 각 자릿수 숫자 배열 int[] ("12345" -> [1, 2, 3, 4, 5])
int[] digits = str.chars().map(c -> c - ''0'').toArray();
```

---

## 📊 3. 정렬 완전정복 치트시트 (Sorting)

```java
// 1. int[] 오름차순
Arrays.sort(arr);

// 2. int[] 내림차순 (Stream 사용)
int[] desc = Arrays.stream(arr).boxed().sorted(Comparator.reverseOrder()).mapToInt(Integer::intValue).toArray();

// 3. Integer[] 내림차순
Arrays.sort(wrapperArr, Collections.reverseOrder());

// 4. 2차원 배열 int[][] 정렬 (첫 번째 오름차순 -> 같으면 두 번째 오름차순)
Arrays.sort(matrix, (a, b) -> a[0] == b[0] ? Integer.compare(a[1], b[1]) : Integer.compare(a[0], b[0]));

// 5. 커스텀 객체 리스트 정렬 (score 내림차순 -> id 오름차순)
list.sort((a, b) -> a.score == b.score ? Integer.compare(a.id, b.id) : Integer.compare(b.score, a.score));

// 6. Comparator 체이닝
list.sort(Comparator.comparing((Node n) -> n.score).reversed().thenComparing(n -> n.id));
```

---

## 📈 4. 최대/최소 & 통계 연산 (Max / Min / Sum)

```java
// 1. int[] 배열 최대 / 최소 / 합계
int maxArr = Arrays.stream(arr).max().getAsInt();
int minArr = Arrays.stream(arr).min().getAsInt();
int sumArr = Arrays.stream(arr).sum();

// 2. List<Integer> 최대 / 최소
int maxList = Collections.max(list);
int minList = Collections.min(list);

// 3. 커스텀 객체 리스트 최댓값 (score 기준)
Node maxNode = Collections.max(nodes, Comparator.comparingInt(n -> n.score));
```

---

## 🧩 5. 자료구조 초기화 & 고급 조작 (Initialization)

```java
// 1. 2차원 배열 특정 값으로 채우기
for (int[] row : grid) Arrays.fill(row, -1);

// 2. 그래프 인접 리스트 (List<List<Integer>>) 초기화
List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i <= N; i++) graph.add(new ArrayList<>());

// 3. Map에 List 초기화하며 추가 (computeIfAbsent)
map.computeIfAbsent(key, k -> new ArrayList<>()).add(value);

// 4. Map 빈도 카운팅 (getOrDefault)
map.put(key, map.getOrDefault(key, 0) + 1);

// 5. TreeSet 근접 값 검색
TreeSet<Integer> treeSet = new TreeSet<>(List.of(10, 20, 30, 40));
int floor = treeSet.floor(25);     // 25 이하의 가장 큰 값 (20)
int ceiling = treeSet.ceiling(25); // 25 이상의 가장 작은 값 (30)
```

---

## 🌊 6. 코딩테스트 필수 Stream API 연산표

```java
int[] arr = {1, 2, 2, 3, 4, 5, 6};

// 1. 필터링 (짝수만)
int[] evens = Arrays.stream(arr).filter(x -> x % 2 == 0).toArray();

// 2. 중복 제거
int[] unique = Arrays.stream(arr).distinct().toArray();

// 3. 각 원소 변환 (Map)
int[] doubled = Arrays.stream(arr).map(x -> x * 2).toArray();

// 4. 조건 만족 여부 검증 (Match)
boolean hasEven = Arrays.stream(arr).anyMatch(x -> x % 2 == 0); // true
boolean allPositive = Arrays.stream(arr).allMatch(x -> x > 0);  // true
```

---

## 📐 7. 수학 & 비트 연산 필수 공식 (Math & Bitmask)

```java
// 1. 최대공약수(GCD) & 최소공배수(LCM)
public static long gcd(long a, long b) { while (b != 0) { long r = a % b; a = b; b = r; } return a; }
public static long lcm(long a, long b) { return (a / gcd(a, b)) * b; }

// 2. 진법 변환 (10진수 -> K진수 String / K진수 String -> 10진수 int)
String binary = Integer.toBinaryString(42);
int val = Integer.parseInt("101010", 2);

// 3. 비트 연산 5대 공식
int addBit = mask | (1 << i);       // 비트 켜기
int clearBit = mask & ~(1 << i);    // 비트 끄기
boolean checkBit = (mask & (1 << i)) != 0; // 비트 확인 (괄호 필수)
int toggleBit = mask ^ (1 << i);    // 비트 토글
int fullMask = (1 << K) - 1;        // K개 전체 비트
```

---

## ⚠️ 8. 감점 및 오답 방지 필수 체크리스트 (Pitfalls)

1. **곱셈 오버플로우**: `long res = (long) a * b;` (명시적 캐스팅 필수).
2. **정렬 뺄셈 오버플로우**: `a - b` 사용 금지 ➔ **`Integer.compare(a, b)`** 사용.
3. **Queue BFS 방문 처리**: 큐에서 꺼낼 때 하지 말고 **큐에 넣을 때(`offer`) `visited[next] = true`**.
4. **다익스트라 낡은 경로 스킵**: `if (cur.distance != dist[cur.node]) continue;` 필수 작성.
5. **String 덧셈 반복 금지**: 루프 내 `+` 연산 금지 ➔ `StringBuilder.append()` 사용.
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-08-conversions-sorting-and-stream';
