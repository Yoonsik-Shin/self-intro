-- V86: Add Java Coding Test Syntax 8: Conversions, Sorting, Initialization, and Stream API Master Cheat Sheet

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ensure 'education' category exists
INSERT IGNORE INTO study_category (name, slug, display_order)
VALUES ('공부/학습', 'education', 2);

SET @education_category_id = (
    SELECT id FROM study_category WHERE slug = 'education' OR name = '공부/학습' LIMIT 1
);

-- =========================================================================
-- Java 코딩테스트 문법 8 — 형변환, 정렬, Stream API 완전정복 (java-coding-test-08-conversions-sorting-and-stream)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'java-coding-test-08-conversions-sorting-and-stream',
    'Java 코딩테스트 문법 8 — 형변환, 정렬, 초기화, Stream API 완전정복',
    '코딩테스트에서 가장 자주 헷갈리는 배열-리스트 상호변환, 원시타입/객체/2차원 배열 정렬, 최대최소 구하기, 2차원 리스트 초기화, 문자열-숫자-배열 변환, 그리고 필수 Stream API 연산을 단 하나의 치트시트로 총정리한다.',
    '# Java 코딩테스트 문법 8 — 형변환, 정렬, 초기화, Stream API 완전정복

> 코딩테스트 시험장에서 가장 헷갈리기 쉬운 **배열 ↔ 리스트 상호 변환**, **정렬(원시타입/객체/2차원)**, **최대/최소 구하기**, **초기화 테크닉**, 그리고 **Stream API 필수 패턴**을 단 하나의 암기용 치트시트로 총정리합니다.

---

## 1. 배열 ↔ 리스트 상호 변환 (Array <-> List)

### 1) Primitive `int[]` ↔ `List<Integer>`
```java
int[] arr = {1, 2, 3, 4, 5};

// 1. int[] -> List<Integer> (Stream 사용)
List<Integer> list = Arrays.stream(arr).boxed().collect(Collectors.toList());

// 2. List<Integer> -> int[] (Stream 사용)
int[] arrFromList = list.stream().mapToInt(Integer::intValue).toArray();
// 또는
int[] arrFromList2 = list.stream().mapToInt(i -> i).toArray();
```

### 2) Wrapper `String[]` ↔ `List<String>`
```java
String[] strArr = {"A", "B", "C"};

// 1. String[] -> List<String>
List<String> strList = new ArrayList<>(Arrays.asList(strArr)); // 가변 리스트
List<String> immutableList = List.of(strArr);                // 불변 리스트

// 2. List<String> -> String[]
String[] strArrFromList = strList.toArray(new String[0]);
```

---

## 2. 정렬 완전정복 (Sorting Masterclass)

### 1) 원시 타입 배열 (`int[]`) 정렬
```java
int[] arr = {5, 2, 8, 1, 3};

// 1. 오름차순 정렬 (기본)
Arrays.sort(arr); // {1, 2, 3, 5, 8}

// 2. 내림차순 정렬 (Stream 사용)
int[] descArr = Arrays.stream(arr).boxed()
                      .sorted(Comparator.reverseOrder())
                      .mapToInt(Integer::intValue)
                      .toArray();
```

### 2) 객체 / Wrapper 배열 (`Integer[]`) 내림차순 정렬
```java
Integer[] arr = {5, 2, 8, 1, 3};
Arrays.sort(arr, Collections.reverseOrder()); // {8, 5, 3, 2, 1}
```

### 3) 2차원 배열 (`int[][]`) 정렬
```java
int[][] matrix = {{2, 6}, {1, 3}, {1, 2}, {8, 10}};

// 첫 번째 원소 오름차순 -> 같으면 두 번째 원소 오름차순
Arrays.sort(matrix, (a, b) -> {
    if (a[0] == b[0]) return Integer.compare(a[1], b[1]);
    return Integer.compare(a[0], b[0]);
});
```

### 4) 리스트 (`List<T>`) 다중 조건 정렬
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
    return Integer.compare(b.score, a.score); // 내림차순 (b가 앞)
});
```

---

## 3. 최대값 / 최솟값 구하기 (Max & Min)

```java
int[] arr = {5, 2, 8, 1, 3};
List<Integer> list = List.of(5, 2, 8, 1, 3);

// 1. int[] 배열 최대/최소
int maxArr = Arrays.stream(arr).max().getAsInt();
int minArr = Arrays.stream(arr).min().getAsInt();

// 2. List<Integer> 최대/최소
int maxList = Collections.max(list);
int minList = Collections.min(list);

// 3. 커스텀 객체 리스트 최대/최소 (score 기준)
Node maxNode = Collections.max(nodes, Comparator.comparingInt(n -> n.score));
```

---

## 4. 2차원 배열 및 그래프 리스트 초기화

```java
// 1. 2차원 배열 특정 값으로 채우기
int[][] grid = new int[N][M];
for (int[] row : grid) Arrays.fill(row, -1);

// 2. 그래프 인접 리스트 (List<List<Integer>>) 초기화
List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i <= N; i++) {
    graph.add(new ArrayList<>());
}

// 3. Map에 List 초기화하며 추가 (computeIfAbsent)
Map<Integer, List<Integer>> map = new HashMap<>();
map.computeIfAbsent(1, k -> new ArrayList<>()).add(100);
```

---

## 5. 문자열 ↔ 숫자 ↔ 배열 ↔ 리스트 치환표

```java
String str = "12345";

// 1. String -> int / long
int num = Integer.parseInt(str);
long longNum = Long.parseLong(str);

// 2. int / long -> String
String s1 = String.valueOf(num);
String s2 = Integer.toString(num);

// 3. String -> char[]
char[] charArr = str.toCharArray(); // [1, 2, 3, 4, 5]

// 4. char[] -> String
String fromChar = new String(charArr);

// 5. String -> String[] (한 글자씩 분할)
String[] strArr = str.split(""); // ["1", "2", "3", "4", "5"]

// 6. String -> int[] (각 자릿수 숫자로 변환)
int[] digits = str.chars().map(c -> c - ''0'').toArray(); // [1, 2, 3, 4, 5]

// 7. String[] -> List<String>
List<String> strList = Arrays.asList(str.split(""));
```

---

## 6. 코딩테스트 필수 Stream API 핵심 치트시트

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
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- Tag Mapping for Study 8
INSERT IGNORE INTO tag (name, slug) VALUES
('Stream API', 'stream-api'),
('형변환', 'type-conversion-kr');

INSERT INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM (
    SELECT 'java-coding-test-08-conversions-sorting-and-stream' AS study_slug, 'Java' AS tag_name UNION ALL
    SELECT 'java-coding-test-08-conversions-sorting-and-stream', '정렬' UNION ALL
    SELECT 'java-coding-test-08-conversions-sorting-and-stream', '형변환' UNION ALL
    SELECT 'java-coding-test-08-conversions-sorting-and-stream', 'Stream API' UNION ALL
    SELECT 'java-coding-test-08-conversions-sorting-and-stream', '코딩테스트'
) mapping
JOIN study s ON s.slug = mapping.study_slug
JOIN tag t ON t.name = mapping.tag_name
ON DUPLICATE KEY UPDATE study_id = VALUES(study_id);

-- Skill Mapping for Java (1)
INSERT INTO study_skill (study_id, skill_id)
SELECT s.id, 1
FROM study s
WHERE s.slug = 'java-coding-test-08-conversions-sorting-and-stream'
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);
