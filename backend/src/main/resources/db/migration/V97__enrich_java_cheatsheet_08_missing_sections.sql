SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
UPDATE study SET content_markdown = '# Java 코딩테스트 최종 치트시트 (Master Cheat Sheet)

> 코딩 테스트 3분 안에 꺼낼 수 있는 **빈출 패턴만 모은 완전 치트시트**입니다. 모든 예제는 실행 가능한 형태로 작성됐으며 필수 `java.util.*` 이외에도 `java.io.*`, `java.math.BigInteger`, `java.util.stream.*` **등 추가 import 필요** 여부를 항상 체크하세요.

---

## ★ 1. 입출력 & 클래스틀 (템플릿)

```java
import java.io.*;
import java.util.*;
import java.util.stream.*;

// [알고리즘/경쟁 기본 템플릿]
public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());

        int n = Integer.parseInt(st.nextToken());
        StringBuilder sb = new StringBuilder();
        sb.append(n).append("\n");
        System.out.print(sb);
    }
}

// [프로그래머스 기본 클래스 틀]
class Solution {
    public int solution(int[][] board, String[] moves) {
        int answer = 0;
        return answer;
    }
}
```

---

## ★ 2. 형변환 & 타입 치환 (Stream vs 전통 반복문)

```java
import java.util.*;
import java.util.stream.Collectors; // ★ Stream Collectors 별도 import

public class ConversionExamples {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};

        // strArr는 String 문자열 배열. 예: {"A", "B", "C"}
        String[] strArr = {"A", "B", "C"};
        String str = "12345";

        // 1. primitive int[] -> List<Integer>
        // [Stream 방식]
        List<Integer> listStream = Arrays.stream(arr).boxed().collect(Collectors.toList());
        // [전통 방식]
        List<Integer> listFor = new ArrayList<>();
        for (int x : arr) listFor.add(x);

        // 2. List<Integer> -> primitive int[]
        // [Stream 방식]
        int[] arrStream = listStream.stream().mapToInt(Integer::intValue).toArray();
        // [전통 방식]
        int[] arrFor = new int[listFor.size()];
        for (int i = 0; i < listFor.size(); i++) arrFor[i] = listFor.get(i);

        // 3. String[] ↔ List<String>
        // ★ Arrays.asList(strArr)만 쓰면 Fixed-size 리스트(add/remove 불가, 배열과 메모리 공유)
        //   → new ArrayList<>()로 감싸야 완전히 독립적이고 크기 변경이 자유로운 리스트가 됨
        List<String> strList = new ArrayList<>(Arrays.asList(strArr));

        // ★ new String[0]을 넘기는 이유: 반환 타입을 String[]로 지정하기 위함
        //   크기를 0으로 넘겨도 JVM이 내부에서 리스트 크기에 맞는 배열을 최적화해 할당함
        //   최신 JVM에서는 new String[list.size()]보다 new String[0]이 성능상 권장됨
        String[] strArrBack = strList.toArray(new String[0]);
        // Java 11+: 메서드 참조로 더 간결하게
        String[] strArrBack2 = strList.toArray(String[]::new);

        // 4. String -> int / long
        int num = Integer.parseInt(str);
        long longNum = Long.parseLong(str);

        // 5. int / long -> String
        String s1 = String.valueOf(num);        // 가장 일반적
        String s2 = Integer.toString(num);      // 동일
        String s3 = num + "";                   // 간단하지만 String 연결 비용 있음

        // 6. int -> 2진수 / 16진수 문자열
        String bin = Integer.toBinaryString(255);   // "11111111"
        String hex = Integer.toHexString(255);      // "ff"
        String oct = Integer.toOctalString(255);    // "377"

        // 7. String -> 각 자리 숫자를 담은 int[] ("12345" -> [1, 2, 3, 4, 5])
        // [Stream 방식] c - ''0'' : ''5''(53) - ''0''(48) = 5  (ASCII 산술, 표준 관용구)
        int[] digitsStream = str.chars().map(c -> c - ''0'').toArray();
        // [전통 방식]
        int[] digitsFor = new int[str.length()];
        for (int i = 0; i < str.length(); i++) digitsFor[i] = str.charAt(i) - ''0'';
    }
}
```

---

## ★ 3. 정렬 완전정복 (Stream vs 전통 오름/내림차순)

```java
import java.util.*;
import java.util.stream.Collectors;

public class SortExamples {
    public static void main(String[] args) {
        int[] arr = {5, 2, 8, 1, 3};
        Integer[] wrapperArr = {5, 2, 8, 1, 3};
        int[][] matrix = {{2, 6}, {1, 3}, {1, 2}};

        // 1. int[] 오름차순
        Arrays.sort(arr);

        // 2. int[] 내림차순 (Stream 방식)
        int[] descStream = Arrays.stream(arr).boxed().sorted(Comparator.reverseOrder()).mapToInt(Integer::intValue).toArray();

        // 3. int[] 내림차순 (전통 방식: 오름차순 후 뒤집기) ★ 코테에서 자주 씀
        Arrays.sort(arr);
        for (int i = 0; i < arr.length / 2; i++) {
            int t = arr[i];
            arr[i] = arr[arr.length - 1 - i];
            arr[arr.length - 1 - i] = t;
        }

        // 4. Integer[] 내림차순
        Arrays.sort(wrapperArr, Collections.reverseOrder());

        // 5. 2차원 배열 int[][] 정렬
        Arrays.sort(matrix, (a, b) -> a[0] == b[0] ? Integer.compare(a[1], b[1]) : Integer.compare(a[0], b[0]));

        // 6. List<String> 정렬
        List<String> words = new ArrayList<>(Arrays.asList("banana", "apple", "cherry"));
        Collections.sort(words);                          // 오름차순
        words.sort(Comparator.comparingInt(String::length)); // 길이 기준
        words.sort(Comparator.reverseOrder());            // 내림차순
    }
}
```

---

## ★ 4. String 완전 조작 모음

```java
import java.util.*;

public class StringExamples {
    public static void main(String[] args) {
        String s = "Hello, World!";

        // --- 기본 조작 ---
        int len = s.length();                          // 13
        char c = s.charAt(0);                          // ''H''
        String sub = s.substring(7);                   // "World!"
        String sub2 = s.substring(7, 12);              // "World"
        int idx = s.indexOf("World");                  // 7
        boolean contains = s.contains("World");        // true
        String upper = s.toUpperCase();                // "HELLO, WORLD!"
        String lower = s.toLowerCase();                // "hello, world!"
        String trimmed = "  hi  ".strip();             // "hi" (Java 11+, strip()이 trim()보다 유니코드 호환)
        String replaced = s.replace("World", "Java");  // "Hello, Java!"
        boolean starts = s.startsWith("Hello");        // true
        boolean ends = s.endsWith("!");                // true

        // --- 분리/결합 ---
        String csv = "a,b,c,d";
        String[] parts = csv.split(",");               // ["a", "b", "c", "d"]
        String joined = String.join("-", parts);       // "a-b-c-d"
        String joined2 = String.join(", ", "A", "B", "C"); // "A, B, C"

        // --- char[] 변환 ---
        char[] chars = s.toCharArray();                // 문자 배열로 변환
        String fromChars = new String(chars);          // 다시 String으로
        String fromChars2 = String.valueOf(chars);     // 동일

        // --- StringBuilder (반복 문자열 조합 시 필수) ---
        StringBuilder sb = new StringBuilder();
        sb.append("Hello");
        sb.append(", ").append("World");
        sb.insert(5, "!!!");                            // "Hello!!!, World"
        sb.reverse();                                   // 뒤집기
        sb.delete(0, 3);                                // 0~2 삭제
        sb.deleteCharAt(0);                             // 0번 인덱스 삭제
        sb.setCharAt(0, ''Z'');                           // 0번 인덱스 문자 교체
        String result = sb.toString();

        // --- char 분류 ---
        char ch = ''A'';
        boolean isUpper = Character.isUpperCase(ch);   // true
        boolean isLower = Character.isLowerCase(ch);   // false
        boolean isDigit = Character.isDigit(''5'');       // true
        boolean isAlpha = Character.isLetter(ch);      // true
    }
}
```

---

## ★ 5. char ↔ int 변환 패턴 (빈출 핵심)

```java
public class CharIntConversion {
    public static void main(String[] args) {
        // --- 숫자 문자 ↔ int ---
        char digitChar = ''7'';
        int digit = digitChar - ''0'';        // ''7''(55) - ''0''(48) = 7  ★ 표준 관용구
        char backToChar = (char)(''0'' + digit); // 7 -> ''7''

        // --- 알파벳 소문자 ↔ 인덱스 (0~25) ---
        char letter = ''e'';
        int letterIdx = letter - ''a'';       // ''e''(101) - ''a''(97) = 4
        char backToLetter = (char)(''a'' + letterIdx); // 4 -> ''e''

        // --- 알파벳 대문자 ↔ 인덱스 (0~25) ---
        char upper = ''E'';
        int upperIdx = upper - ''A'';         // ''E''(69) - ''A''(65) = 4
        char backToUpper = (char)(''A'' + upperIdx); // 4 -> ''E''

        // --- 대소문자 변환 ---
        char toLower = (char)(upper + 32);          // ''E'' -> ''e''  (ASCII 차이 32)
        char toUpper2 = (char)(letter - 32);        // ''e'' -> ''E''
        char toLower2 = Character.toLowerCase(upper);  // 안전한 방법
        char toUpper3 = Character.toUpperCase(letter); // 안전한 방법

        // --- int ↔ char (유니코드) ---
        int code = (int)''A'';                // 65
        char fromCode = (char)65;           // ''A''

        // --- 문자열 한 글자씩 순회 ---
        String str = "hello";
        for (char ch : str.toCharArray()) {        // toCharArray() 방식 ★
            System.out.println(ch - ''a'');           // 각 문자의 알파벳 인덱스
        }
        for (int i = 0; i < str.length(); i++) {   // charAt() 방식
            char ch = str.charAt(i);
        }
    }
}
```

---

## ★ 6. Map 빈도 카운팅 패턴 (★★★ 최빈출)

```java
import java.util.*;
import java.util.stream.Collectors;

public class MapPatterns {
    public static void main(String[] args) {
        int[] arr = {1, 2, 2, 3, 3, 3, 4};
        String s = "banana";

        // --- 빈도 카운팅 (전통) ---
        Map<Integer, Integer> freq = new HashMap<>();
        for (int x : arr) {
            freq.put(x, freq.getOrDefault(x, 0) + 1); // ★ getOrDefault 패턴
        }
        // merge()로 더 간결하게
        Map<Integer, Integer> freq2 = new HashMap<>();
        for (int x : arr) freq2.merge(x, 1, Integer::sum);

        // --- 빈도 카운팅 (Stream) ---
        Map<Character, Long> charFreq = s.chars()
            .mapToObj(c -> (char) c)
            .collect(Collectors.groupingBy(c -> c, Collectors.counting()));

        // --- Map 순회 ---
        for (Map.Entry<Integer, Integer> entry : freq.entrySet()) {
            System.out.println(entry.getKey() + " -> " + entry.getValue());
        }
        freq.forEach((key, val) -> System.out.println(key + ": " + val)); // Java 8+

        // --- 최빈값 찾기 ---
        int maxFreqKey = Collections.max(freq.entrySet(), Map.Entry.comparingByValue()).getKey();

        // --- 값 기준 정렬된 entrySet ---
        freq.entrySet().stream()
            .sorted(Map.Entry.<Integer, Integer>comparingByValue().reversed())
            .forEach(e -> System.out.println(e.getKey() + ": " + e.getValue()));

        // --- computeIfAbsent: 그루핑 패턴 ---
        Map<Integer, List<Integer>> grouped = new HashMap<>();
        for (int x : arr) {
            grouped.computeIfAbsent(x % 2, k -> new ArrayList<>()).add(x); // 짝/홀 그루핑
        }

        // --- LinkedHashMap: 삽입 순서 유지 ---
        Map<String, Integer> ordered = new LinkedHashMap<>();
        ordered.put("apple", 3);
        ordered.put("banana", 1);

        // --- TreeMap: 키 자동 정렬 ---
        Map<Integer, Integer> sortedMap = new TreeMap<>(freq); // 키 오름차순
        Map<Integer, Integer> reversedMap = new TreeMap<>(Collections.reverseOrder());
        reversedMap.putAll(freq);                              // 키 내림차순
    }
}
```

---

## ★ 7. Stack / Queue / Deque / PriorityQueue 패턴

```java
import java.util.*;

public class DataStructurePatterns {
    public static void main(String[] args) {
        // --- Stack (LIFO) ---
        // ★ Stack 클래스보다 Deque 사용 권장 (더 빠름)
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1);           // 스택에 추가 (= addFirst)
        stack.push(2);
        int top = stack.peek();  // 맨 위 확인 (제거 없음) -> 2
        int popped = stack.pop(); // 맨 위 제거 -> 2
        boolean empty = stack.isEmpty();

        // --- Queue (FIFO) ---
        Queue<Integer> queue = new LinkedList<>();
        queue.offer(1);          // 큐에 추가
        queue.offer(2);
        int front = queue.peek(); // 맨 앞 확인 (제거 없음) -> 1
        int polled = queue.poll(); // 맨 앞 제거 -> 1

        // --- Deque (양방향 큐) ---
        Deque<Integer> deque = new ArrayDeque<>();
        deque.addFirst(1);       // 앞에 추가
        deque.addLast(2);        // 뒤에 추가
        deque.peekFirst();       // 앞 확인
        deque.peekLast();        // 뒤 확인
        deque.pollFirst();       // 앞 제거
        deque.pollLast();        // 뒤 제거

        // --- PriorityQueue (Min Heap, 최솟값 우선) ---
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        minHeap.offer(3);
        minHeap.offer(1);
        minHeap.offer(2);
        int min = minHeap.peek();     // 1 (최솟값 확인)
        int removed = minHeap.poll(); // 1 (최솟값 제거)

        // --- Max Heap (최댓값 우선) ---
        PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        maxHeap.offer(3);
        maxHeap.offer(1);
        maxHeap.offer(2);
        int max = maxHeap.poll(); // 3 (최댓값 제거)

        // --- PriorityQueue with Custom Comparator (2D 배열) ---
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]); // 두 번째 값 기준 오름차순
        pq.offer(new int[]{1, 5});
        pq.offer(new int[]{2, 3});
        int[] smallest = pq.poll(); // {2, 3}
    }
}
```

---

## ★ 8. BigInteger & 모듈러 연산

```java
import java.math.BigInteger; // ★ BigInteger 별도 import

public class BigIntegerExample {
    public static void main(String[] args) {
        BigInteger a = new BigInteger("1000000000000000000000");
        BigInteger b = new BigInteger("2000000000000000000000");

        BigInteger sum = a.add(b);       // 덧셈
        BigInteger sub = a.subtract(b);  // 뺄셈
        BigInteger mul = a.multiply(b);  // 곱셈
        BigInteger div = a.divide(b);    // 몫(나눗셈)
        BigInteger mod = a.mod(b);       // 나머지

        // 모듈러 연산 (큰 수 나머지)
        final int MOD = 1_000_000_007;
        long result = 1L;
        for (int i = 1; i <= 10; i++) result = (result * i) % MOD;
    }
}
```

---

## ★ 9. 조건 필터 & 중복 제거 (Stream vs Set/List)

```java
import java.util.*;
import java.util.stream.Collectors;

public class FilterExamples {
    public static void main(String[] args) {
        int[] arr = {1, 2, 2, 3, 4, 5, 6};

        // 1. 조건 필터 (짝수)
        int[] evensStream = Arrays.stream(arr).filter(x -> x % 2 == 0).toArray();
        List<Integer> evenList = new ArrayList<>();
        for (int x : arr) if (x % 2 == 0) evenList.add(x);

        // 2. 중복 제거 (Distinct)
        int[] uniqueStream = Arrays.stream(arr).distinct().toArray();
        Set<Integer> set = new LinkedHashSet<>();
        for (int x : arr) set.add(x);
    }
}
```

---

## ★ 10. Arrays & Collections & Math 유틸리티

```java
import java.util.*;

public class UtilsExamples {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};
        List<Integer> list = new ArrayList<>(Arrays.asList(3, 1, 4, 1, 5));

        // --- Arrays 유틸 ---
        Arrays.fill(arr, 0);                    // 전체를 0으로 채우기
        Arrays.fill(arr, 1, 3, 9);              // [1, 3) 인덱스만 9로 채우기
        int[] copy = Arrays.copyOf(arr, 3);     // 앞에서 3개 복사
        int[] range = Arrays.copyOfRange(arr, 1, 4); // [1, 4) 범위 복사
        System.out.println(Arrays.toString(arr));    // [1, 2, 3, 4, 5] 출력
        int[][] matrix = {{1, 2}, {3, 4}};
        System.out.println(Arrays.deepToString(matrix)); // [[1, 2], [3, 4]] 출력

        // --- Collections 유틸 ---
        int maxVal = Collections.max(list);          // 5
        int minVal = Collections.min(list);          // 1
        int freq = Collections.frequency(list, 1);   // 2 (1이 2개)
        Collections.sort(list);                      // 오름차순
        Collections.reverse(list);                   // 역순
        Collections.shuffle(list);                   // 무작위
        Collections.fill(list, 0);                   // 전체 0으로
        List<Integer> nCopies = Collections.nCopies(5, 7); // [7, 7, 7, 7, 7]

        // --- Math 유틸 ---
        int absVal = Math.abs(-5);               // 5
        int maxNum = Math.max(3, 7);             // 7
        int minNum = Math.min(3, 7);             // 3
        double pow = Math.pow(2, 10);            // 1024.0
        double sqrt = Math.sqrt(16);             // 4.0
        long floor = (long) Math.floor(3.7);     // 3
        long ceil = (long) Math.ceil(3.2);       // 4
    }
}
```

---

## 📋 11. 필수 Import 정리 표

| 사용할 클래스 / 인터페이스 | 필요 import 경로 |
| :--- | :--- |
| `Scanner`, `List`, `Map`, `Queue`, `Arrays`, `Collections` 등 | `import java.util.*;` |
| `BufferedReader`, `InputStreamReader`, `StringTokenizer` | `import java.io.*;` |
| `Collectors`, `IntStream`, `Stream` | `import java.util.stream.*;` |
| `BigInteger`, `BigDecimal` | `import java.math.BigInteger;` / `import java.math.BigDecimal;` |
| `PriorityQueue`, `ArrayDeque`, `LinkedHashMap`, `TreeMap` | `import java.util.*;` (포함됨) |
'
WHERE slug = 'java-coding-test-08-conversions-sorting-and-stream';
