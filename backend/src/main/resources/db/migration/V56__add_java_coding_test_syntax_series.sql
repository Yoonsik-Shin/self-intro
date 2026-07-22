-- Java 코딩테스트 문법 시리즈 7편을 Study 초안으로 추가한다.
-- 관리 화면에서 검토한 뒤 순서대로 발행할 수 있도록 published_at은 비워 둔다.

INSERT IGNORE INTO tag (name, slug) VALUES
('Java', 'java'),
('코딩테스트', '코딩테스트'),
('Java 문법', 'java-문법'),
('입출력', '입출력'),
('자료형', '자료형'),
('형변환', '형변환'),
('배열', '배열'),
('문자열', '문자열'),
('StringBuilder', 'stringbuilder'),
('컬렉션', '컬렉션'),
('List', 'list'),
('Set', 'set'),
('Map', 'map'),
('정렬', '정렬'),
('Comparator', 'comparator'),
('이분 탐색', '이분-탐색'),
('자료구조', '자료구조'),
('Queue', 'queue'),
('Deque', 'deque'),
('PriorityQueue', 'priorityqueue'),
('Math', 'math'),
('진법', '진법'),
('비트마스크', '비트마스크'),
('실전 템플릿', '실전-템플릿'),
('BFS', 'bfs'),
('DFS', 'dfs'),
('누적 합', '누적-합');

INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id,
    learned_at, published_at, created_at, updated_at
) VALUES
('java-coding-test-01-io-and-types', 'Java 코딩테스트 문법 1 — 입출력, 자료형, 형변환', '백준과 프로그래머스에서 사용하는 Java 제출 구조부터 BufferedReader, StringTokenizer, StringBuilder, int와 long 선택, 형변환과 정수 나눗셈까지 코딩테스트 입문 문법을 정리한다.', '# Java 코딩테스트 문법 1 — 입출력, 자료형, 형변환

코딩테스트의 첫 단계는 입력을 정확히 읽고 결과를 빠르게 출력하는 것이다. 알고리즘이 맞아도 자료형을 잘못 선택하거나 출력 형식이 다르면 오답이 된다.

## 1. 기본 제출 코드

백준처럼 표준 입출력을 사용하는 환경에서는 다음 형태로 시작한다.

```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

        // 풀이
    }
}
```

프로그래머스에서는 입출력 코드를 작성하지 않고 주어진 메서드를 완성한다.

```java
class Solution {
    public int solution(int[] numbers) {
        return 0;
    }
}
```

## 2. BufferedReader로 입력받기

`readLine()`은 한 줄을 문자열로 읽는다.

```java
String line = br.readLine();
int number = Integer.parseInt(br.readLine());
long value = Long.parseLong(br.readLine());
```

공백으로 구분된 입력은 `StringTokenizer`로 나눈다.

```java
StringTokenizer st = new StringTokenizer(br.readLine());

int n = Integer.parseInt(st.nextToken());
int m = Integer.parseInt(st.nextToken());
```

여러 줄을 반복해서 읽을 때는 매 줄마다 토크나이저를 새로 만든다.

```java
int n = Integer.parseInt(br.readLine());
int[] numbers = new int[n];

StringTokenizer st = new StringTokenizer(br.readLine());
for (int i = 0; i < n; i++) {
    numbers[i] = Integer.parseInt(st.nextToken());
}
```

## 3. StringBuilder로 출력하기

반복문에서 `System.out.println()`을 계속 호출하면 출력 횟수가 많을 때 느릴 수 있다. 결과를 모아서 한 번에 출력한다.

```java
StringBuilder sb = new StringBuilder();

for (int i = 1; i <= 5; i++) {
    sb.append(i).append(''\\n'');
}

System.out.print(sb);
```

문자열 사이에 공백을 넣을 수도 있다.

```java
sb.append(answer).append('' '');
```

## 4. 자주 사용하는 자료형

| 자료형 | 크기 | 대략적인 범위 | 용도 |
|---|---:|---:|---|
| `int` | 32비트 | 약 -21억 ~ 21억 | 인덱스, 일반 정수 |
| `long` | 64비트 | 약 ±9경 | 큰 합, 곱셈, 거리 |
| `double` | 64비트 | 실수 | 평균, 기하 계산 |
| `char` | 16비트 | 문자 1개 | 문자 비교 |
| `boolean` | - | `true`, `false` | 방문 여부, 조건 |

배열의 원소가 `int`여도 합은 `long`이어야 할 수 있다.

```java
long sum = 0;
for (int number : numbers) {
    sum += number;
}
```

곱셈은 결과를 저장하기 전에 이미 `int`로 계산된다. 피연산자 하나를 먼저 `long`으로 바꾼다.

```java
int a = 1_000_000;
int b = 1_000_000;

long wrong = a * b;
long correct = (long) a * b;
```

## 5. 형변환과 문자 변환

```java
int number = Integer.parseInt("123");
long bigNumber = Long.parseLong("12345678900");
String text = String.valueOf(number);
```

숫자 문자와 실제 숫자는 다르다.

```java
char ch = ''7'';
int digit = ch - ''0'';        // 7
char digitChar = (char) (7 + ''0''); // ''7''
```

큰 자료형을 작은 자료형에 넣을 때는 명시적 형변환이 필요하며 값이 잘릴 수 있다.

```java
long value = 100L;
int number = (int) value;
```

## 6. 나눗셈과 나머지

정수끼리 나누면 소수점 이하는 버려진다.

```java
System.out.println(5 / 2);       // 2
System.out.println(5 / 2.0);     // 2.5
System.out.println((double) 5 / 2); // 2.5
```

올림 나눗셈은 양의 정수에서 다음처럼 계산할 수 있다.

```java
int count = (n + size - 1) / size;
```

나머지는 주기나 홀짝을 구할 때 자주 사용한다.

```java
boolean isEven = number % 2 == 0;
int next = (current + 1) % length;
```

## 7. 자주 하는 실수

- 큰 합이나 곱을 `int`에 저장한다.
- `(long) (a * b)`처럼 오버플로우가 발생한 뒤 형변환한다.
- 정수 나눗셈 결과에 소수점이 남는다고 생각한다.
- 문자 `''1''`과 정수 `1`, 문자열 `"1"`을 혼동한다.
- 출력 형식에 불필요한 문장이나 괄호를 추가한다.

## 마무리

입력은 `BufferedReader`와 `StringTokenizer`, 출력은 `StringBuilder`를 기본으로 익혀 두자. 값의 범위를 확인해 `int`와 `long`을 선택하는 습관은 많은 오답을 예방한다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-22', NULL, NOW(), NOW()),
('java-coding-test-02-array-and-string', 'Java 코딩테스트 문법 2 — 배열과 문자열', '1차원·2차원 배열의 생성과 순회, 복사와 비교, String의 주요 메서드, split 정규식, StringBuilder, 문자 빈도와 격자 이동 패턴을 실전 예제로 익힌다.', '# Java 코딩테스트 문법 2 — 배열과 문자열

배열과 문자열은 대부분의 코딩테스트 문제에서 사용한다. 생성, 순회, 변환, 비교 방법을 바로 떠올릴 수 있어야 한다.

## 1. 배열 생성과 초기화

```java
int[] numbers = new int[5];
int[] scores = {80, 90, 100};
String[] names = new String[3];
boolean[] visited = new boolean[10];
```

배열은 생성할 때 기본값으로 채워진다.

- `int`: `0`
- `long`: `0L`
- `boolean`: `false`
- 참조형: `null`

같은 값으로 채우려면 `Arrays.fill()`을 사용한다.

```java
Arrays.fill(numbers, -1);
```

## 2. 배열 순회

인덱스가 필요하면 일반 `for`문을 사용한다.

```java
for (int i = 0; i < numbers.length; i++) {
    System.out.println(i + ": " + numbers[i]);
}
```

값만 필요하면 향상된 `for`문이 간결하다.

```java
for (int number : numbers) {
    System.out.println(number);
}
```

향상된 `for`문에서 반복 변수의 값을 바꿔도 원본 배열은 바뀌지 않는다.

```java
for (int number : numbers) {
    number = 0; // 원본에는 영향 없음
}
```

## 3. 2차원 배열

```java
int[][] board = new int[3][4];

for (int row = 0; row < board.length; row++) {
    for (int col = 0; col < board[row].length; col++) {
        board[row][col] = row + col;
    }
}
```

행과 열의 개수를 혼동하지 않는다.

```java
int rowCount = board.length;
int colCount = board[0].length;
```

각 행의 길이가 다른 배열도 만들 수 있다.

```java
int[][] triangle = new int[3][];
triangle[0] = new int[1];
triangle[1] = new int[2];
triangle[2] = new int[3];
```

## 4. 배열 복사와 비교

`=`은 배열을 복사하지 않고 같은 배열을 가리키게 한다.

```java
int[] original = {1, 2, 3};
int[] same = original;
int[] copy = original.clone();
int[] range = Arrays.copyOfRange(original, 0, 2); // [1, 2]
```

배열의 내용을 비교할 때는 `Arrays.equals()`를 사용한다.

```java
boolean equal = Arrays.equals(original, copy);
```

2차원 배열은 `Arrays.deepEquals()`와 `Arrays.deepToString()`을 사용한다.

## 5. 문자열 기본 문법

`String`은 변경할 수 없는 객체다. 문자열을 수정하면 새로운 문자열이 만들어진다.

```java
String word = "algorithm";

int length = word.length();
char first = word.charAt(0);
String part = word.substring(0, 4); // "algo", 끝 인덱스는 미포함
boolean contains = word.contains("go");
int index = word.indexOf("r");
```

문자열 비교에는 `==`가 아니라 `equals()`를 사용한다.

```java
if (word.equals("algorithm")) {
    // 내용이 같음
}
```

대소문자를 무시하려면 `equalsIgnoreCase()`를 사용한다.

## 6. 문자열 분리와 변환

```java
String[] words = "java coding test".split(" ");
char[] chars = "hello".toCharArray();
String restored = new String(chars);
```

`split()`의 인자는 일반 문자열이 아니라 정규식이다. 점을 기준으로 나눌 때는 이스케이프가 필요하다.

```java
String[] parts = "a.b.c".split("\\\\.");
```

공백이 여러 개일 수 있다면 다음처럼 처리한다.

```java
String[] tokens = line.trim().split("\\\\s+");
```

## 7. StringBuilder 활용

문자열을 반복해서 이어 붙일 때 사용한다.

```java
StringBuilder sb = new StringBuilder();
sb.append("java");
sb.append('' '');
sb.append(17);

String result = sb.toString();
```

뒤집기와 문자 수정도 가능하다.

```java
String reversed = new StringBuilder(word).reverse().toString();

sb.setCharAt(0, ''J'');
sb.deleteCharAt(sb.length() - 1);
```

## 8. 자주 쓰는 패턴

문자의 빈도 세기:

```java
int[] count = new int[26];

for (char ch : word.toCharArray()) {
    count[ch - ''a'']++;
}
```

격자 이동:

```java
int[] dr = {-1, 1, 0, 0};
int[] dc = {0, 0, -1, 1};

for (int direction = 0; direction < 4; direction++) {
    int nextRow = row + dr[direction];
    int nextCol = col + dc[direction];

    if (nextRow < 0 || nextRow >= rowCount ||
        nextCol < 0 || nextCol >= colCount) {
        continue;
    }
}
```

## 자주 하는 실수

- 마지막 인덱스를 `length`로 사용한다. 마지막 인덱스는 `length - 1`이다.
- `substring(start, end)`에서 `end`가 포함된다고 생각한다.
- 문자열을 `==`로 비교한다.
- 배열을 `=`로 깊은 복사했다고 생각한다.
- 직사각형 배열에서 행과 열의 범위를 반대로 검사한다.

## 마무리

배열은 `length`, 문자열은 `length()`를 사용한다. 끝 인덱스를 포함하지 않는 범위 표현과 참조형의 복사·비교 방법을 정확히 익혀 두자.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-22', NULL, NOW(), NOW()),
('java-coding-test-03-collections', 'Java 코딩테스트 문법 3 — List, Set, Map', 'ArrayList, HashSet, TreeSet, HashMap, TreeMap의 특성과 주요 메서드를 비교하고 중복 제거, 포함 여부 확인, 빈도 계산에 적절한 컬렉션을 선택하는 기준을 정리한다.', '# Java 코딩테스트 문법 3 — List, Set, Map

컬렉션은 데이터의 추가와 삭제, 중복 제거, 빈도 계산을 편리하게 만든다. 어떤 컬렉션을 선택하느냐가 풀이의 시간복잡도를 결정하기도 한다.

## 1. List

순서가 있고 중복을 허용하는 자료구조다. 코딩테스트에서는 주로 `ArrayList`를 사용한다.

```java
List<Integer> numbers = new ArrayList<>();

numbers.add(10);
numbers.add(20);
numbers.add(1, 15);

int value = numbers.get(0);
numbers.set(0, 5);
numbers.remove(1);
int size = numbers.size();
```

기본형은 제네릭 타입으로 사용할 수 없으므로 래퍼 클래스를 사용한다.

```java
List<Integer> integers = new ArrayList<>();
List<Long> longs = new ArrayList<>();
List<Character> characters = new ArrayList<>();
```

`remove()`는 인자에 따라 의미가 달라진다.

```java
numbers.remove(1);                  // 1번 인덱스 삭제
numbers.remove(Integer.valueOf(1)); // 값 1을 삭제
```

## 2. 배열과 List 변환

참조형 배열은 쉽게 리스트로 바꿀 수 있다.

```java
String[] array = {"A", "B", "C"};
List<String> list = new ArrayList<>(Arrays.asList(array));
```

`int[]`를 `Arrays.asList()`에 넣으면 정수 리스트가 되지 않는다. 반복문을 쓰는 편이 명확하다.

```java
int[] array = {1, 2, 3};
List<Integer> list = new ArrayList<>();

for (int value : array) {
    list.add(value);
}
```

리스트를 기본형 배열로 바꿀 때도 반복문을 사용할 수 있다.

```java
int[] result = new int[list.size()];
for (int i = 0; i < list.size(); i++) {
    result[i] = list.get(i);
}
```

## 3. Set

중복을 허용하지 않는다.

```java
Set<Integer> set = new HashSet<>();

set.add(10);
set.add(20);
set.add(10);

boolean exists = set.contains(10);
set.remove(20);
int uniqueCount = set.size();
```

`HashSet`의 추가, 삭제, 검색은 평균 `O(1)`이다. 정렬된 상태가 필요하면 `TreeSet`을 사용하며 주요 연산은 `O(log N)`이다.

```java
TreeSet<Integer> sorted = new TreeSet<>();
sorted.add(30);
sorted.add(10);
sorted.add(20);

int smallest = sorted.first();
int largest = sorted.last();
Integer lower = sorted.lower(20);   // 20보다 작은 최댓값
Integer ceiling = sorted.ceiling(15); // 15 이상인 최솟값
```

## 4. Map

키와 값을 한 쌍으로 저장한다. 빈도 계산과 빠른 검색에 자주 사용한다.

```java
Map<String, Integer> count = new HashMap<>();

count.put("apple", 2);
count.put("banana", 1);

int apples = count.get("apple");
int oranges = count.getOrDefault("orange", 0);
boolean exists = count.containsKey("banana");
```

빈도 계산은 `getOrDefault()`를 사용하면 간결하다.

```java
for (String word : words) {
    count.put(word, count.getOrDefault(word, 0) + 1);
}
```

## 5. Map 순회

키와 값이 모두 필요하면 `entrySet()`을 사용한다.

```java
for (Map.Entry<String, Integer> entry : count.entrySet()) {
    String key = entry.getKey();
    int value = entry.getValue();
}
```

키만 필요하면 다음과 같이 순회한다.

```java
for (String key : count.keySet()) {
    System.out.println(key);
}
```

`HashMap`은 순서를 보장하지 않는다. 키가 정렬된 순서로 필요하면 `TreeMap`, 삽입 순서가 필요하면 `LinkedHashMap`을 사용한다.

## 6. 컬렉션 선택 기준

| 필요한 기능 | 선택 |
|---|---|
| 순서대로 저장하고 인덱스로 접근 | `ArrayList` |
| 중복 제거와 빠른 포함 여부 확인 | `HashSet` |
| 정렬된 중복 없는 값 | `TreeSet` |
| 키별 값 또는 빈도 저장 | `HashMap` |
| 정렬된 키 | `TreeMap` |

## 7. 자주 하는 실수

- `HashSet`과 `HashMap`의 순회 순서를 기대한다.
- `map.get(key)`가 없을 때 `null`을 반환한다는 점을 놓친다.
- `List<Integer>.remove(1)`을 값 1 삭제로 착각한다.
- `Arrays.asList(intArray)`가 `List<Integer>`가 된다고 생각한다.
- 향상된 `for`문 도중 컬렉션의 구조를 직접 변경한다.

## 마무리

중복 제거는 `Set`, 빈도 계산은 `Map`, 순서 있는 가변 데이터는 `List`를 먼저 떠올리자. 정렬 여부가 필요하지 않다면 일반적으로 해시 기반 컬렉션이 더 빠르다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-22', NULL, NOW(), NOW()),
('java-coding-test-04-sorting-and-comparator', 'Java 코딩테스트 문법 4 — 정렬과 Comparator', '기본형 배열과 객체 배열의 정렬 차이, 내림차순 정렬, 람다식과 Comparator를 이용한 다중 조건 정렬, 문자열 정렬과 이진 탐색의 기본 사용법을 설명한다.', '# Java 코딩테스트 문법 4 — 정렬과 Comparator

정렬은 탐색 범위를 줄이고, 가까운 값끼리 비교하며, 우선순위를 처리하는 출발점이다. 기본형 배열과 객체 배열의 정렬 방법이 다르다는 점이 핵심이다.

## 1. 기본 정렬

```java
int[] numbers = {4, 1, 3, 2};
Arrays.sort(numbers); // [1, 2, 3, 4]
```

일부 구간만 정렬할 수도 있다. 끝 인덱스는 포함하지 않는다.

```java
Arrays.sort(numbers, 1, 3);
```

리스트는 다음처럼 정렬한다.

```java
List<Integer> list = new ArrayList<>(List.of(4, 1, 3, 2));
Collections.sort(list);
// 또는 list.sort(Comparator.naturalOrder());
```

## 2. 내림차순 정렬

`Comparator`는 객체에만 사용할 수 있다. 따라서 `int[]`에는 `reverseOrder()`를 바로 적용할 수 없다.

```java
Integer[] numbers = {4, 1, 3, 2};
Arrays.sort(numbers, Comparator.reverseOrder());
```

기본형 배열이라면 오름차순 정렬 후 뒤에서부터 읽는 방법이 단순하다.

```java
Arrays.sort(numbers);
for (int i = numbers.length - 1; i >= 0; i--) {
    System.out.println(numbers[i]);
}
```

## 3. 2차원 배열 정렬

첫 번째 값을 기준으로 오름차순, 같으면 두 번째 값을 기준으로 오름차순 정렬한다.

```java
int[][] points = {{2, 3}, {1, 5}, {2, 1}};

Arrays.sort(points, (a, b) -> {
    if (a[0] != b[0]) {
        return Integer.compare(a[0], b[0]);
    }
    return Integer.compare(a[1], b[1]);
});
```

`comparingInt()`를 사용해도 된다.

```java
Arrays.sort(points,
    Comparator.comparingInt((int[] point) -> point[0])
              .thenComparingInt(point -> point[1]));
```

## 4. Comparator의 반환값

비교 함수는 다음 규칙을 따른다.

- 음수: 첫 번째 값이 앞에 온다.
- 0: 두 값의 순서가 같다.
- 양수: 두 번째 값이 앞에 온다.

오름차순 정렬에서 `a - b`를 사용하는 코드는 오버플로우가 발생할 수 있다.

```java
// 피하는 것이 좋음
(a, b) -> a - b

// 안전한 방법
(a, b) -> Integer.compare(a, b)
```

`long`은 `Long.compare()`, 문자열은 `compareTo()`를 사용한다.

## 5. 객체 정렬

```java
static class Student {
    String name;
    int score;

    Student(String name, int score) {
        this.name = name;
        this.score = score;
    }
}
```

점수 내림차순, 점수가 같으면 이름 오름차순으로 정렬한다.

```java
students.sort(
    Comparator.comparingInt((Student student) -> student.score)
              .reversed()
              .thenComparing(student -> student.name)
);
```

람다식에서 타입 추론이 되지 않으면 첫 번째 매개변수의 타입을 직접 적는다.

## 6. 문자열 정렬

기본 정렬은 사전순이다.

```java
String[] words = {"banana", "apple", "cat"};
Arrays.sort(words);
```

길이 오름차순, 길이가 같으면 사전순으로 정렬한다.

```java
Arrays.sort(words,
    Comparator.comparingInt(String::length)
              .thenComparing(Comparator.naturalOrder())
);
```

## 7. 정렬 후 자주 사용하는 이진 탐색

```java
Arrays.sort(numbers);
int index = Arrays.binarySearch(numbers, target);
```

반환값이 0 이상이면 값을 찾은 인덱스다. 값이 없으면 음수를 반환한다. 중복 값에서 첫 위치나 마지막 위치를 구해야 한다면 직접 lower bound와 upper bound를 구현해야 한다.

## 자주 하는 실수

- `int[]`에 `Comparator.reverseOrder()`를 사용한다.
- 비교식에서 뺄셈을 사용해 오버플로우를 만든다.
- 여러 조건의 오름차순과 내림차순을 반대로 작성한다.
- 원본 배열을 보존해야 하는데 그대로 정렬한다.
- 정렬 비용 `O(N log N)`을 시간복잡도에서 빠뜨린다.

## 마무리

기본형은 `Arrays.sort()`, 객체와 다중 조건은 `Comparator`를 사용한다. 다중 조건 정렬을 람다식과 `comparingInt()` 두 방식 모두로 작성해 보면 실전에서 훨씬 빠르게 대응할 수 있다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-22', NULL, NOW(), NOW()),
('java-coding-test-05-stack-queue-priority-queue', 'Java 코딩테스트 문법 5 — Stack, Queue, Deque, PriorityQueue', 'LIFO와 FIFO의 차이부터 ArrayDeque를 활용한 스택·큐 구현, BFS 방문 처리, 양방향 큐, 최소 힙과 최대 힙의 우선순위 설정까지 자주 쓰는 자료구조 문법을 정리한다.', '# Java 코딩테스트 문법 5 — Stack, Queue, Deque, PriorityQueue

데이터를 어떤 순서로 꺼내야 하는지에 따라 자료구조가 달라진다. Java에서는 스택도 `Deque`로 구현하는 것이 일반적이다.

## 1. Stack 대신 Deque

스택은 가장 나중에 넣은 값을 먼저 꺼내는 LIFO 구조다.

```java
Deque<Integer> stack = new ArrayDeque<>();

stack.push(10);
stack.push(20);

int top = stack.peek(); // 20
int value = stack.pop(); // 20
boolean empty = stack.isEmpty();
```

괄호 검사, 이전 값 찾기, DFS 등에 사용한다.

`pop()`은 비어 있을 때 예외가 발생하므로 먼저 `isEmpty()`를 확인한다.

## 2. Queue

큐는 먼저 넣은 값을 먼저 꺼내는 FIFO 구조다.

```java
Queue<Integer> queue = new ArrayDeque<>();

queue.offer(10);
queue.offer(20);

int front = queue.peek(); // 10
int value = queue.poll(); // 10
```

BFS에서 가장 자주 사용한다.

```java
Queue<Integer> queue = new ArrayDeque<>();
boolean[] visited = new boolean[n];

queue.offer(start);
visited[start] = true;

while (!queue.isEmpty()) {
    int current = queue.poll();

    for (int next : graph[current]) {
        if (visited[next]) {
            continue;
        }

        visited[next] = true;
        queue.offer(next);
    }
}
```

방문 처리는 큐에서 꺼낼 때가 아니라 넣을 때 해야 중복 삽입을 막을 수 있다.

## 3. Deque

양쪽 끝에서 추가하고 삭제할 수 있다.

```java
Deque<Integer> deque = new ArrayDeque<>();

deque.offerFirst(10);
deque.offerLast(20);

int first = deque.pollFirst();
int last = deque.pollLast();
```

0-1 BFS, 슬라이딩 윈도우의 최솟값·최댓값, 양방향 처리에 사용한다.

## 4. PriorityQueue

우선순위가 가장 높은 값을 먼저 꺼낸다. 기본은 최솟값 우선이다.

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();

minHeap.offer(30);
minHeap.offer(10);
minHeap.offer(20);

System.out.println(minHeap.poll()); // 10
```

최댓값 우선 큐:

```java
PriorityQueue<Integer> maxHeap =
    new PriorityQueue<>(Comparator.reverseOrder());
```

배열을 넣고 첫 번째 값이 작을수록 먼저 꺼내려면 다음처럼 작성한다.

```java
PriorityQueue<int[]> pq = new PriorityQueue<>(
    Comparator.comparingInt(state -> state[0])
);

pq.offer(new int[]{distance, node});
```

다익스트라에서는 거리가 가장 짧은 상태를 먼저 꺼낼 때 사용한다.

## 5. 주요 연산과 복잡도

| 자료구조 | 추가 | 삭제 | 맨 앞/우선값 확인 |
|---|---:|---:|---:|
| `ArrayDeque` 스택·큐 | `O(1)` | `O(1)` | `O(1)` |
| `PriorityQueue` | `O(log N)` | `O(log N)` | `O(1)` |

## 6. 메서드 선택

큐에는 비슷한 메서드가 여러 개 있다.

| 기능 | 실패 시 예외 | 실패 시 특별한 값 |
|---|---|---|
| 삽입 | `add()` | `offer()` |
| 삭제 | `remove()` | `poll()` |
| 확인 | `element()` | `peek()` |

코딩테스트에서는 빈 자료구조를 안전하게 다루기 쉬운 `offer()`, `poll()`, `peek()`를 주로 사용한다.

## 자주 하는 실수

- BFS 방문 처리를 `poll()` 이후에 해 같은 정점을 여러 번 넣는다.
- `PriorityQueue`가 기본적으로 최대 힙이라고 생각한다.
- 우선순위 큐의 전체 순회 결과가 정렬되어 있다고 생각한다.
- 빈 큐에서 `poll()`한 결과 `null`을 기본형 `int`에 대입한다.
- `ArrayDeque`에 `null`을 넣으려고 한다.

## 마무리

LIFO는 `Deque`의 `push()`와 `pop()`, FIFO는 `Queue`의 `offer()`와 `poll()`, 우선순위 처리는 `PriorityQueue`를 사용한다. 각 자료구조에서 값이 들어오고 나가는 순서를 손으로 그려 보면 실수를 줄일 수 있다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-22', NULL, NOW(), NOW()),
('java-coding-test-06-math-base-and-bit', 'Java 코딩테스트 문법 6 — Math, 진법, 비트 연산', 'Math 클래스와 최댓값·최솟값 초기화, 최대공약수와 최소공배수, 2~36진법 변환, 비트마스크와 부분집합 순회, 안전한 나머지 연산을 예제로 정리한다.', '# Java 코딩테스트 문법 6 — Math, 진법, 비트 연산

최댓값과 최솟값, 절댓값, 거듭제곱, 최대공약수, 진법 변환은 짧은 코드로 자주 등장한다. 비트 연산은 부분집합과 상태 압축 문제에서 유용하다.

## 1. Math 클래스

```java
int min = Math.min(a, b);
int max = Math.max(a, b);
int absolute = Math.abs(value);
double squareRoot = Math.sqrt(16); // 4.0
double power = Math.pow(2, 10);    // 1024.0
long rounded = Math.round(3.6);    // 4
double floor = Math.floor(3.9);    // 3.0
double ceil = Math.ceil(3.1);      // 4.0
```

`Math.pow()`는 `double`을 반환한다. 정수 거듭제곱을 정확히 계산해야 한다면 반복 곱셈이나 빠른 거듭제곱을 고려한다.

`Math.abs(Integer.MIN_VALUE)`는 양수로 표현할 수 없어 여전히 음수라는 점도 주의한다.

## 2. 최댓값과 최솟값 초기화

```java
int min = Integer.MAX_VALUE;
int max = Integer.MIN_VALUE;

for (int number : numbers) {
    min = Math.min(min, number);
    max = Math.max(max, number);
}
```

`long`은 `Long.MAX_VALUE`와 `Long.MIN_VALUE`를 사용한다.

거리 최댓값을 무한대로 두고 덧셈까지 한다면 자료형의 최댓값 그대로보다 여유 있는 값을 사용하는 것이 안전할 수 있다.

```java
final long INF = Long.MAX_VALUE / 4;
```

## 3. 최대공약수와 최소공배수

유클리드 호제법으로 최대공약수를 구한다.

```java
static long gcd(long a, long b) {
    while (b != 0) {
        long remainder = a % b;
        a = b;
        b = remainder;
    }
    return Math.abs(a);
}
```

최소공배수는 곱셈 오버플로우를 줄이기 위해 먼저 나눈다.

```java
static long lcm(long a, long b) {
    if (a == 0 || b == 0) {
        return 0;
    }
    return Math.abs(a / gcd(a, b) * b);
}
```

## 4. 진법 변환

10진수를 다른 진법 문자열로 바꾼다.

```java
String binary = Integer.toBinaryString(10); // "1010"
String octal = Integer.toOctalString(10);   // "12"
String hex = Integer.toHexString(26);       // "1a"
String baseThree = Integer.toString(10, 3); // "101"
```

다른 진법 문자열을 10진수로 바꾼다.

```java
int decimal = Integer.parseInt("1010", 2); // 10
long large = Long.parseLong("ffff", 16);
```

지원하는 진법 범위는 2부터 36까지다.

## 5. 비트 연산

| 연산 | 의미 |
|---|---|
| `a & b` | AND |
| `a | b` | OR |
| `a ^ b` | XOR |
| `~a` | NOT |
| `a << k` | 왼쪽으로 k비트 이동 |
| `a >> k` | 부호를 유지하며 오른쪽 이동 |

`k`번째 비트를 다루는 기본 패턴이다.

```java
int mask = 0;

mask |= 1 << k;           // k번째 비트 켜기
mask &= ~(1 << k);        // k번째 비트 끄기
mask ^= 1 << k;           // k번째 비트 뒤집기
boolean on = (mask & (1 << k)) != 0; // 켜져 있는지 확인
```

`N`개 원소의 모든 부분집합을 순회할 수 있다.

```java
for (int mask = 0; mask < (1 << n); mask++) {
    for (int i = 0; i < n; i++) {
        if ((mask & (1 << i)) != 0) {
            // i번째 원소가 포함됨
        }
    }
}
```

경우의 수가 `2^N`이므로 `N`이 작을 때만 사용한다.

## 6. 나머지 연산

큰 수의 덧셈과 곱셈에 나머지를 적용한다.

```java
long sum = (a + b) % mod;
long product = (a * b) % mod;
```

`a * b`가 `long` 범위 안인지도 확인해야 한다. Java에서 음수의 나머지는 음수가 될 수 있다.

```java
int normalized = ((value % mod) + mod) % mod;
```

## 자주 하는 실수

- `Math.pow()`의 `double` 결과를 정수처럼 믿고 사용한다.
- 최소공배수에서 `a * b / gcd` 순서로 계산해 먼저 오버플로우가 난다.
- `1 << n`에서 `n`이 크지만 `int`를 그대로 사용한다. 필요하면 `1L << n`을 사용한다.
- 음수의 `%` 결과가 항상 양수라고 생각한다.
- 비트 연산과 비교 연산을 함께 쓸 때 괄호를 생략한다.

## 마무리

수학 함수의 반환형과 값의 범위를 먼저 확인하자. 비트마스크는 문법 자체보다 각 비트가 어떤 상태를 뜻하는지 정의하는 것이 중요하다.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-22', NULL, NOW(), NOW()),
('java-coding-test-07-templates-and-mistakes', 'Java 코딩테스트 문법 7 — 실전 템플릿과 자주 하는 실수', '백준·프로그래머스 제출 코드와 인접 리스트, DFS, BFS 최단 거리, 누적 합, lower bound 템플릿을 모으고 제출 전 확인할 인덱스·자료형·성능 체크리스트를 제공한다.', '# Java 코딩테스트 문법 7 — 실전 코드 템플릿과 자주 하는 실수

마지막 편에서는 문제를 풀 때 반복해서 사용하는 코드 형태와 디버깅 체크리스트를 한곳에 모은다. 템플릿은 외우기보다 여러 번 직접 작성하며 손에 익히는 것이 좋다.

## 1. 백준 기본 템플릿

```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder out = new StringBuilder();

        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());

        // 풀이

        System.out.print(out);
    }
}
```

사용하지 않는 객체까지 무조건 만들 필요는 없다. 문제에 맞게 덜어내서 사용한다.

## 2. 프로그래머스 기본 템플릿

```java
import java.util.*;

class Solution {
    public int solution(int[] numbers) {
        int answer = 0;

        return answer;
    }
}
```

프로그래머스에서는 같은 객체의 `solution()`이 여러 테스트에서 호출될 가능성을 고려해, 필드를 사용한다면 매 호출마다 초기화하는 편이 안전하다.

## 3. 인접 리스트 그래프

```java
List<Integer>[] graph = new ArrayList[n + 1];

for (int i = 1; i <= n; i++) {
    graph[i] = new ArrayList<>();
}

for (int i = 0; i < m; i++) {
    StringTokenizer st = new StringTokenizer(br.readLine());
    int from = Integer.parseInt(st.nextToken());
    int to = Integer.parseInt(st.nextToken());

    graph[from].add(to);
    graph[to].add(from); // 무방향 그래프일 때만
}
```

배열만 생성하면 내부 리스트는 아직 `null`이므로 각 원소를 초기화해야 한다.

## 4. DFS 템플릿

```java
static List<Integer>[] graph;
static boolean[] visited;

static void dfs(int current) {
    visited[current] = true;

    for (int next : graph[current]) {
        if (!visited[next]) {
            dfs(next);
        }
    }
}
```

재귀 깊이가 매우 크면 스택 오버플로우가 발생할 수 있으므로 반복문 DFS나 BFS를 고려한다.

## 5. BFS 최단 거리 템플릿

간선의 가중치가 모두 1일 때 사용할 수 있다.

```java
static int[] bfs(List<Integer>[] graph, int start) {
    int[] distance = new int[graph.length];
    Arrays.fill(distance, -1);

    Queue<Integer> queue = new ArrayDeque<>();
    queue.offer(start);
    distance[start] = 0;

    while (!queue.isEmpty()) {
        int current = queue.poll();

        for (int next : graph[current]) {
            if (distance[next] != -1) {
                continue;
            }

            distance[next] = distance[current] + 1;
            queue.offer(next);
        }
    }

    return distance;
}
```

## 6. 누적 합 템플릿

구간 `[left, right]`의 합을 여러 번 구할 때 사용한다.

```java
long[] prefixSum = new long[n + 1];

for (int i = 0; i < n; i++) {
    prefixSum[i + 1] = prefixSum[i] + numbers[i];
}

long rangeSum = prefixSum[right + 1] - prefixSum[left];
```

누적 합 배열을 원본보다 하나 크게 만들면 첫 원소부터의 구간도 같은 식으로 처리할 수 있다.

## 7. 이분 탐색 템플릿

정렬된 배열에서 target 이상인 첫 위치인 lower bound를 찾는다.

```java
static int lowerBound(int[] numbers, int target) {
    int left = 0;
    int right = numbers.length;

    while (left < right) {
        int mid = left + (right - left) / 2;

        if (numbers[mid] < target) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    return left;
}
```

탐색 구간을 `[left, right)`로 정의한 코드다. 다른 템플릿과 섞으면 경계 오류가 생기므로 자신이 선택한 구간 정의를 끝까지 유지한다.

## 8. 제출 전 체크리스트

### 입력과 범위

- 입력의 줄 수와 토큰 수를 정확히 읽었는가?
- 최댓값, 합, 곱이 `int` 범위를 넘지 않는가?
- 빈 배열이나 원소 하나인 경우가 가능한가?

### 인덱스와 조건

- `0` 기반과 `1` 기반 인덱스를 섞지 않았는가?
- 반복문의 `<`와 `<=`가 의도한 범위와 맞는가?
- 구간의 양 끝이 포함되는가?
- 최솟값이나 최댓값의 초기값이 적절한가?

### 자료구조와 성능

- `HashMap`과 `HashSet`의 순서를 기대하지 않았는가?
- 반복문 안에서 선형 탐색을 해 `O(N²)`이 되지 않는가?
- 재귀 깊이와 메모리 사용량이 제한 안에 있는가?

### 출력

- 요구한 순서와 구분자를 지켰는가?
- 디버깅용 출력이 남아 있지 않은가?
- 반환형과 출력 자료형이 맞는가?

## 9. 틀렸을 때 확인 순서

1. 문제의 예제를 손으로 따라간다.
2. 가장 작은 입력을 직접 만든다.
3. 경계값과 중복값을 넣어 본다.
4. 알고리즘의 전제 조건이 성립하는지 확인한다.
5. 시간복잡도와 자료형 범위를 다시 계산한다.

무작정 코드를 고치기보다 어떤 입력에서 예상과 달라지는지 먼저 찾는 것이 빠르다.

## 마무리

좋은 템플릿은 코드를 길게 만드는 틀이 아니라 반복되는 실수를 줄이는 출발점이다. 문제마다 필요한 부분만 가져오고, 인덱스 범위와 자료형은 항상 문제 조건에 맞춰 다시 결정하자.', 'DRAFT', (SELECT id FROM study_category WHERE slug = 'education'), '2026-07-22', NULL, NOW(), NOW());

INSERT INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM (
    SELECT 'java-coding-test-01-io-and-types' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-01-io-and-types' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-01-io-and-types' AS study_slug, 'Java 문법' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-01-io-and-types' AS study_slug, '입출력' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-01-io-and-types' AS study_slug, '자료형' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-01-io-and-types' AS study_slug, '형변환' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-02-array-and-string' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-02-array-and-string' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-02-array-and-string' AS study_slug, 'Java 문법' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-02-array-and-string' AS study_slug, '배열' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-02-array-and-string' AS study_slug, '문자열' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-02-array-and-string' AS study_slug, 'StringBuilder' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS study_slug, 'Java 문법' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS study_slug, '컬렉션' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS study_slug, 'List' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS study_slug, 'Set' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS study_slug, 'Map' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-04-sorting-and-comparator' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-04-sorting-and-comparator' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-04-sorting-and-comparator' AS study_slug, 'Java 문법' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-04-sorting-and-comparator' AS study_slug, '정렬' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-04-sorting-and-comparator' AS study_slug, 'Comparator' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-04-sorting-and-comparator' AS study_slug, '이분 탐색' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS study_slug, 'Java 문법' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS study_slug, '자료구조' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS study_slug, 'Queue' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS study_slug, 'Deque' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS study_slug, 'PriorityQueue' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-06-math-base-and-bit' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-06-math-base-and-bit' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-06-math-base-and-bit' AS study_slug, 'Java 문법' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-06-math-base-and-bit' AS study_slug, 'Math' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-06-math-base-and-bit' AS study_slug, '진법' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-06-math-base-and-bit' AS study_slug, '비트마스크' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS study_slug, 'Java' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS study_slug, '코딩테스트' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS study_slug, 'Java 문법' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS study_slug, '실전 템플릿' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS study_slug, 'BFS' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS study_slug, 'DFS' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS study_slug, '누적 합' AS tag_name
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS study_slug, '이분 탐색' AS tag_name
) mapping
JOIN study s ON s.slug = mapping.study_slug
JOIN tag t ON t.name = mapping.tag_name;

INSERT INTO study_skill (study_id, skill_id)
SELECT s.id, skill.id
FROM study s
JOIN skill ON skill.name = 'Java'
WHERE s.slug IN ('java-coding-test-01-io-and-types', 'java-coding-test-02-array-and-string', 'java-coding-test-03-collections', 'java-coding-test-04-sorting-and-comparator', 'java-coding-test-05-stack-queue-priority-queue', 'java-coding-test-06-math-base-and-bit', 'java-coding-test-07-templates-and-mistakes');

INSERT INTO study_relation (
    source_study_id, target_study_id, relation_type, display_order
)
SELECT source_study.id, target_study.id, mapping.relation_type, mapping.display_order
FROM (
    SELECT 'java-coding-test-01-io-and-types' AS source_slug, 'java-coding-test-02-array-and-string' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-02-array-and-string' AS source_slug, 'java-coding-test-01-io-and-types' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-02-array-and-string' AS source_slug, 'java-coding-test-03-collections' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS source_slug, 'java-coding-test-02-array-and-string' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-03-collections' AS source_slug, 'java-coding-test-04-sorting-and-comparator' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-04-sorting-and-comparator' AS source_slug, 'java-coding-test-03-collections' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-04-sorting-and-comparator' AS source_slug, 'java-coding-test-05-stack-queue-priority-queue' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS source_slug, 'java-coding-test-04-sorting-and-comparator' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-05-stack-queue-priority-queue' AS source_slug, 'java-coding-test-06-math-base-and-bit' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-06-math-base-and-bit' AS source_slug, 'java-coding-test-05-stack-queue-priority-queue' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-06-math-base-and-bit' AS source_slug, 'java-coding-test-07-templates-and-mistakes' AS target_slug, 'FOLLOW_UP' AS relation_type, 0 AS display_order
    UNION ALL
    SELECT 'java-coding-test-07-templates-and-mistakes' AS source_slug, 'java-coding-test-06-math-base-and-bit' AS target_slug, 'PREREQUISITE' AS relation_type, 0 AS display_order
) mapping
JOIN study source_study ON source_study.slug = mapping.source_slug
JOIN study target_study ON target_study.slug = mapping.target_slug;
