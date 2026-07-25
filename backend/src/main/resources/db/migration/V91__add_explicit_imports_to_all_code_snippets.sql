-- V91: Add explicit import statements (java.io.*, java.math.BigInteger, java.util.stream.*) to all Java code snippets

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- Update Study 8 Master Cheat Sheet with explicit import headers in code blocks
-- =========================================================================
UPDATE study
SET content_markdown = '# Java 코딩테스트 시험장 필수 최종 치트시트 (Master Cheat Sheet)

> 시험 직전 3분 동안 훑어보는 **자바 코딩테스트 필수 코드 모음집**입니다. 패키지 임포트 오류로 인한 컴파일 에러를 방지하기 위해 `java.util.*` 이외에 필요한 `java.io.*`, `java.math.BigInteger`, `java.util.stream.*` **필수 import 구문**을 모든 예제 코드 상단에 명시했습니다.

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

```java
import java.util.*;
import java.util.stream.Collectors; // ★ Stream Collectors 필수 import

public class ConversionExamples {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};
        String[] strArr = {"A", "B", "C"};
        String str = "12345";

        // 1. primitive int[] -> List<Integer>
        // [Stream 사용]
        List<Integer> listStream = Arrays.stream(arr).boxed().collect(Collectors.toList());
        // [전통 반복문]
        List<Integer> listFor = new ArrayList<>();
        for (int x : arr) listFor.add(x);

        // 2. List<Integer> -> primitive int[]
        // [Stream 사용]
        int[] arrStream = listStream.stream().mapToInt(Integer::intValue).toArray();
        // [전통 반복문]
        int[] arrFor = new int[listFor.size()];
        for (int i = 0; i < listFor.size(); i++) arrFor[i] = listFor.get(i);

        // 3. String[] ↔ List<String>
        List<String> strList = new ArrayList<>(Arrays.asList(strArr));
        String[] strArrBack = strList.toArray(new String[0]);

        // 4. String -> int / long
        int num = Integer.parseInt(str);
        long longNum = Long.parseLong(str);

        // 5. String -> 각 자릿수 숫자 배열 int[] ("12345" -> [1, 2, 3, 4, 5])
        // [Stream 사용]
        int[] digitsStream = str.chars().map(c -> c - ''0'').toArray();
        // [전통 반복문]
        int[] digitsFor = new int[str.length()];
        for (int i = 0; i < str.length(); i++) digitsFor[i] = str.charAt(i) - ''0'';
    }
}
```

---

## 📊 3. 정렬 치트시트 (Stream vs 기존 정렬/스왑)

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

        // 2. int[] 내림차순 (Stream 사용)
        int[] descStream = Arrays.stream(arr).boxed().sorted(Comparator.reverseOrder()).mapToInt(Integer::intValue).toArray();

        // 3. int[] 내림차순 (전통 방식: 오름차순 후 스왑) ★ 추천
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
    }
}
```

---

## 📈 4. BigInteger & 무한 정수 연산

```java
import java.math.BigInteger; // ★ BigInteger 필수 import

public class BigIntegerExample {
    public static void main(String[] args) {
        BigInteger a = new BigInteger("1000000000000000000000");
        BigInteger b = new BigInteger("2000000000000000000000");

        BigInteger sum = a.add(b);       // 덧셈
        BigInteger sub = a.subtract(b);  // 뺄셈
        BigInteger mul = a.multiply(b);  // 곱셈
        BigInteger div = a.divide(b);    // 나눗셈
    }
}
```

---

## 🌊 5. 배열 필터링 & 중복 제거 (Stream vs Set/List)

```java
import java.util.*;
import java.util.stream.Collectors;

public class FilterExamples {
    public static void main(String[] args) {
        int[] arr = {1, 2, 2, 3, 4, 5, 6};

        // 1. 필터링 (짝수만)
        // [Stream 사용]
        int[] evensStream = Arrays.stream(arr).filter(x -> x % 2 == 0).toArray();
        // [전통 반복문]
        List<Integer> evenList = new ArrayList<>();
        for (int x : arr) if (x % 2 == 0) evenList.add(x);
        int[] evensFor = new int[evenList.size()];
        for (int i = 0; i < evenList.size(); i++) evensFor[i] = evenList.get(i);

        // 2. 중복 제거 (Distinct)
        // [Stream 사용]
        int[] uniqueStream = Arrays.stream(arr).distinct().toArray();
        // [전통 방식 (LinkedHashSet으로 순서 보장)]
        Set<Integer> set = new LinkedHashSet<>();
        for (int x : arr) set.add(x);
        int[] uniqueSet = new int[set.size()];
        int idx = 0;
        for (int x : set) uniqueSet[idx++] = x;
    }
}
```

---

## ⚠️ 6. 필수 Import 패키지 종합 요약표

| 사용 대상 클래스 / 메서드 | 필수 import 구문 |
| :--- | :--- |
| `Scanner`, `List`, `Map`, `Queue`, `Arrays` 등 | `import java.util.*;` |
| `BufferedReader`, `InputStreamReader`, `StringTokenizer` | `import java.io.*;` |
| `Collectors`, `IntStream`, `Stream` | `import java.util.stream.*;` |
| `BigInteger`, `BigDecimal` | `import java.math.BigInteger;` / `import java.math.BigDecimal;` |
',
    updated_at = NOW()
WHERE slug = 'java-coding-test-08-conversions-sorting-and-stream';
