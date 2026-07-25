-- V90: Add Traditional For-Loop & Standard Method Alternatives alongside Stream API in Master Cheat Sheet

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- Update Study 8 Master Cheat Sheet with Stream vs Traditional Dual Code Snippets
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 시험장 필수 최종 치트시트 (Master Cheat Sheet)

> 시험 직전 3분 동안 훑어보는 **자바 코딩테스트 필수 코드 모음집**입니다. Stream API 문법이 기억나지 않을 때를 대비해 **Stream API vs 전통 반복문(For-Loop/Set/List)의 2가지 대비 코드**를 함께 수록했습니다.

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

## 🔄 2. 형변환 & 타입 치환 (Stream vs 전통 반복문)

### 1) Primitive `int[]` ➔ `List<Integer>`
```java
// [Stream 사용]
List<Integer> list = Arrays.stream(arr).boxed().collect(Collectors.toList());

// [Stream 없이 (전통 반복문)] ★ 강추
List<Integer> list = new ArrayList<>();
for (int x : arr) list.add(x);
```

### 2) `List<Integer>` ➔ Primitive `int[]`
```java
// [Stream 사용]
int[] arr = list.stream().mapToInt(Integer::intValue).toArray();

// [Stream 없이 (전통 반복문)] ★ 강추
int[] arr = new int[list.size()];
for (int i = 0; i < list.size(); i++) {
    arr[i] = list.get(i);
}
```

### 3) `String[]` ➔ `List<String>` & `List<String>` ➔ `String[]`
```java
// String[] -> List<String>
List<String> strList = new ArrayList<>(Arrays.asList(strArr));

// List<String> -> String[]
String[] strArr = strList.toArray(new String[0]);
```

### 4) String ➔ 각 자릿수 숫자 배열 `int[]` ("12345" ➔ [1, 2, 3, 4, 5])
```java
// [Stream 사용]
int[] digits = str.chars().map(c -> c - ''0'').toArray();

// [Stream 없이 (charAt 연산)] ★ 강추
int[] digits = new int[str.length()];
for (int i = 0; i < str.length(); i++) {
    digits[i] = str.charAt(i) - ''0'';
}
```

---

## 📊 3. 정렬 치트시트 (Stream vs 기존 정렬/스왑)

### 1) `int[]` 내림차순 정렬
```java
// [Stream 사용]
int[] desc = Arrays.stream(arr).boxed().sorted(Comparator.reverseOrder()).mapToInt(Integer::intValue).toArray();

// [Stream 없이 방법 A: Integer[] 박싱 후 정렬]
Integer[] temp = new Integer[arr.length];
for (int i = 0; i < arr.length; i++) temp[i] = arr[i];
Arrays.sort(temp, Collections.reverseOrder());
for (int i = 0; i < arr.length; i++) arr[i] = temp[i];

// [Stream 없이 방법 B: 오름차순 정렬 후 반전(Reverse)] ★ 가장 깔끔
Arrays.sort(arr);
for (int i = 0; i < arr.length / 2; i++) {
    int t = arr[i];
    arr[i] = arr[arr.length - 1 - i];
    arr[arr.length - 1 - i] = t;
}
```

### 2) 2차원 배열 `int[][]` 및 커스텀 객체 정렬
```java
// 2차원 배열 정렬 (첫 번째 오름차순 -> 같으면 두 번째 오름차순)
Arrays.sort(matrix, (a, b) -> a[0] == b[0] ? Integer.compare(a[1], b[1]) : Integer.compare(a[0], b[0]));

// 커스텀 객체 리스트 정렬 (score 내림차순 -> id 오름차순)
list.sort((a, b) -> a.score == b.score ? Integer.compare(a.id, b.id) : Integer.compare(b.score, a.score));
```

---

## 📈 4. 최대/최소 & 통계 (Stream vs 전통 반복문)

```java
int[] arr = {5, 2, 8, 1, 3};

// [Stream 사용]
int maxVal = Arrays.stream(arr).max().getAsInt();
int minVal = Arrays.stream(arr).min().getAsInt();

// [Stream 없이 (기존 for-loop)] ★ 실수 예방
int maxVal = arr[0];
int minVal = arr[0];
for (int val : arr) {
    if (val > maxVal) maxVal = val;
    if (val < minVal) minVal = val;
}

// List<Integer> 및 커스텀 객체 최대/최소 (Collections 활용)
int maxList = Collections.max(list);
Node maxNode = Collections.max(nodes, Comparator.comparingInt(n -> n.score));
```

---

## 🌊 5. 배열 필터링 & 중복 제거 (Stream vs Set/List)

```java
int[] arr = {1, 2, 2, 3, 4, 5, 6};

// [1. 필터링 (짝수만)]
// Stream: Arrays.stream(arr).filter(x -> x % 2 == 0).toArray();
// 전통 방식:
List<Integer> evenList = new ArrayList<>();
for (int x : arr) {
    if (x % 2 == 0) evenList.add(x);
}
int[] evens = new int[evenList.size()];
for (int i = 0; i < evenList.size(); i++) evens[i] = evenList.get(i);

// [2. 중복 제거 (Distinct)]
// Stream: Arrays.stream(arr).distinct().toArray();
// 전통 방식 (Set 활용):
Set<Integer> set = new LinkedHashSet<>(); // 순서 보장
for (int x : arr) set.add(x);
int[] unique = new int[set.size()];
int idx = 0;
for (int x : set) unique[idx++] = x;
```

---

## 📐 6. 수학 & 비트 연산 필수 공식 (Math & Bitmask)

```java
// 1. 최대공약수(GCD) & 최소공배수(LCM)
public static long gcd(long a, long b) { while (b != 0) { long r = a % b; a = b; b = r; } return a; }
public static long lcm(long a, long b) { return (a / gcd(a, b)) * b; }

// 2. 진법 변환
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

## ⚠️ 7. 감점 및 오답 방지 필수 체크리스트 (Pitfalls)

1. **곱셈 오버플로우**: `long res = (long) a * b;` (명시적 캐스팅 필수).
2. **정렬 뺄셈 오버플로우**: `a - b` 사용 금지 ➔ **`Integer.compare(a, b)`** 사용.
3. **Queue BFS 방문 처리**: 큐에서 꺼낼 때 하지 말고 **큐에 넣을 때(`offer`) `visited[next] = true`**.
4. **다익스트라 낡은 경로 스킵**: `if (cur.distance != dist[cur.node]) continue;` 필수 작성.
5. **String 덧셈 반복 금지**: 루프 내 `+` 연산 금지 ➔ `StringBuilder.append()` 사용.
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-08-conversions-sorting-and-stream';
