-- V96: Add Java Method Reference (::) Deep Dive Study Note

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @education_category_id = (
    SELECT id FROM study_category WHERE slug = 'education' OR name = '공부/학습' LIMIT 1
);

-- =========================================================================
-- Java 메서드 참조 :: 문법 완전정복 (java-method-reference-deep-dive)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'java-method-reference-deep-dive',
    'Java 메서드 참조 :: 문법 완전정복 (Method Reference)',
    '자바 8에서 도입된 :: 메서드 참조(Method Reference) 문법의 4가지 유형(정적/인스턴스/임의 객체/생성자 참조)과 람다 표현식과의 완전한 대응 관계, Stream API와의 연계 패턴을 빈출 예제와 함께 극도로 상세히 정리한다.',
    '# Java 메서드 참조 `::` 문법 완전정복 (Method Reference Deep Dive)

> 메서드 참조(`::`)는 이미 정의된 메서드를 람다처럼 간결하게 전달하는 **함수형 프로그래밍 표현식**입니다. `x -> x.method()` 형태의 람다를 `ClassName::method` 형태로 단축하여 코드 가독성을 극대화합니다.

---

## 1. 메서드 참조란 무엇인가?

`::` 연산자는 **더블 콜론(Double Colon)** 연산자 또는 메서드 참조 연산자라고 부릅니다. 이미 정의된 메서드의 **실행 코드를 통째로** 함수형 인터페이스(`Function`, `Consumer`, `Predicate` 등)에 담아 넘기는 구문입니다.

**핵심 원리: 람다와의 1:1 대응 관계**

```text
람다 표현식                   -->  메서드 참조(::) 표현식
─────────────────────────────────────────────────────────
x -> Math.abs(x)             -->  Math::abs
s -> s.toUpperCase()         -->  String::toUpperCase
s -> System.out.println(s)   -->  System.out::println
() -> new ArrayList<>()      -->  ArrayList::new
list -> list.stream()        -->  Collection::stream
```

---

## 2. 메서드 참조의 4가지 유형

### 유형 1. 정적 메서드 참조 (Static Method Reference)
> 형식: `ClassName::staticMethod`

```java
import java.util.*;
import java.util.stream.*;

// 람다 표현식
List<Integer> list = Arrays.asList(3, -1, 5, -2, 4);
List<Integer> absValues = list.stream()
        .map(x -> Math.abs(x))
        .collect(Collectors.toList());

// 메서드 참조 (동일한 동작)
List<Integer> absValues2 = list.stream()
        .map(Math::abs)              // Math.abs(x) 정적 메서드 참조
        .collect(Collectors.toList());
```

---

### 유형 2. 특정 인스턴스 메서드 참조 (Bound Instance Method Reference)
> 형식: `instance::method` — 이미 존재하는 특정 객체의 메서드를 참조

```java
import java.util.*;
import java.util.stream.*;

String prefix = "Hello";

// 람다 표현식
List<String> words = List.of("World", "Java", "Stream");
List<Boolean> results = words.stream()
        .map(w -> prefix.startsWith(w))
        .collect(Collectors.toList());

// 메서드 참조 (특정 인스턴스 prefix의 메서드를 참조)
List<Boolean> results2 = words.stream()
        .map(prefix::startsWith)     // 특정 String 인스턴스의 메서드 참조
        .collect(Collectors.toList());

// 실전 예: System.out::println
words.forEach(System.out::println);  // w -> System.out.println(w) 와 동일
```

---

### 유형 3. 임의 인스턴스 메서드 참조 (Unbound Instance Method Reference)
> 형식: `ClassName::instanceMethod` — 스트림의 각 원소가 호출 대상이 됨

```java
import java.util.*;
import java.util.stream.*;

List<String> words = List.of("apple", "Banana", "cherry");

// 람다 표현식
List<String> upper = words.stream()
        .map(s -> s.toUpperCase())
        .collect(Collectors.toList());

// 메서드 참조 (각 String 원소 s에 대해 s.toUpperCase() 호출)
List<String> upper2 = words.stream()
        .map(String::toUpperCase)    // String 인스턴스의 임의 메서드 참조
        .collect(Collectors.toList()); // [APPLE, BANANA, CHERRY]

// 정렬에서도 활용
words.sort(String::compareToIgnoreCase);
```

> 💡 **유형 2 vs 유형 3 핵심 차이**
> - **유형 2**: `prefix::startsWith` — **이미 지정된 특정 객체** `prefix`의 메서드 호출
> - **유형 3**: `String::toUpperCase` — **스트림의 각 원소** `s`가 `s.toUpperCase()` 호출 대상

---

### 유형 4. 생성자 참조 (Constructor Reference)
> 형식: `ClassName::new` — 생성자를 팩토리처럼 넘김

```java
import java.util.*;
import java.util.stream.*;
import java.util.function.*;

// 람다 표현식
Supplier<ArrayList<String>> factory = () -> new ArrayList<>();

// 생성자 참조
Supplier<ArrayList<String>> factory2 = ArrayList::new;  // new ArrayList<>() 와 동일

// Stream에서 collect로 활용
List<String> names = List.of("Alice", "Bob", "Charlie");
List<String> copy = names.stream()
        .collect(Collectors.toCollection(ArrayList::new));

// Person 객체 생성에 활용
record Person(String name) {}
List<Person> persons = names.stream()
        .map(Person::new)            // name -> new Person(name) 과 동일
        .collect(Collectors.toList());
```

---

## 3. Stream API와의 결합 패턴 (빈출)

```java
import java.util.*;
import java.util.stream.*;

List<String> names = List.of("alice", "bob", "charlie", "alice");
List<List<Integer>> matrix = List.of(
        List.of(1, 2, 3),
        List.of(4, 5, 6),
        List.of(7, 8, 9)
);

// ① map + 임의 인스턴스 참조: 문자열 대문자 변환
List<String> upper = names.stream()
        .map(String::toUpperCase)
        .collect(Collectors.toList());

// ② filter + 정적 메서드 참조 (직접 적용)
// (Predicate를 wrapping 하는 경우는 별도 람다 필요)

// ③ sorted + 임의 인스턴스 참조: 사전순 정렬
List<String> sorted = names.stream()
        .sorted(String::compareTo)
        .collect(Collectors.toList());

// ④ flatMap + Collection::stream: 2차원 -> 1차원 평탄화 (★★★ 빈출)
List<Integer> flat = matrix.stream()
        .flatMap(Collection::stream) // list -> list.stream() 을 간결하게
        .collect(Collectors.toList()); // [1, 2, 3, 4, 5, 6, 7, 8, 9]

// ⑤ forEach + 특정 인스턴스 참조: 출력
names.forEach(System.out::println);

// ⑥ map(Integer::parseInt): String -> Integer 변환
List<String> strNums = List.of("1", "2", "3");
List<Integer> intNums = strNums.stream()
        .map(Integer::parseInt)      // s -> Integer.parseInt(s) 와 동일
        .collect(Collectors.toList());
```

---

## 4. 정리 비교표

| 유형 | 형식 | 동일한 람다 표현식 | 대표 예제 |
|------|------|-------------------|-----------|
| **정적 메서드** | `ClassName::staticMethod` | `x -> ClassName.staticMethod(x)` | `Math::abs`, `Integer::parseInt` |
| **특정 인스턴스** | `obj::method` | `x -> obj.method(x)` | `System.out::println` |
| **임의 인스턴스** | `ClassName::method` | `x -> x.method()` | `String::toUpperCase`, `Collection::stream` |
| **생성자** | `ClassName::new` | `() -> new ClassName()` | `ArrayList::new`, `Person::new` |

---

## 5. 실전 주의사항

1. **오버로드 메서드**: `String::valueOf`처럼 오버로드된 메서드 참조 시, 컴파일러가 **함수형 인터페이스의 시그니처**를 보고 자동으로 맞는 버전을 선택합니다.
2. **체이닝 불가**: `::` 자체를 체이닝(`Class::method::method`)할 수는 없습니다. 각 단계별로 나눠서 작성하세요.
3. **람다와 동등**: 메서드 참조는 순수하게 **가독성을 위한 문법 설탕(Syntactic Sugar)**입니다. 실행 성능에는 차이가 없습니다.
',
    'published',
    @education_category_id,
    '2025-06-01',
    NOW(),
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    summary = VALUES(summary),
    content_markdown = VALUES(content_markdown),
    updated_at = NOW();

-- =========================================================================
-- 태그 등록
-- =========================================================================
INSERT IGNORE INTO tag (name, slug) VALUES
('Java', 'java'),
('Lambda', 'lambda'),
('Stream API', 'stream-api'),
('함수형 프로그래밍', 'functional-programming');

INSERT IGNORE INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM study s, tag t
WHERE s.slug = 'java-method-reference-deep-dive'
AND t.slug IN ('java', 'lambda', 'stream-api', 'functional-programming');

-- =========================================================================
-- 연관 스터디 연결 (java-stream-api-deep-dive <-> java-method-reference-deep-dive)
-- =========================================================================
-- method-reference -> stream-api (stream API 심화 연관)
INSERT IGNORE INTO study_relation (source_study_id, target_study_id, relation_type)
SELECT s1.id, s2.id, 'related'
FROM study s1, study s2
WHERE s1.slug = 'java-method-reference-deep-dive'
AND s2.slug = 'java-stream-api-deep-dive';

-- stream-api -> method-reference (양방향 연결)
INSERT IGNORE INTO study_relation (source_study_id, target_study_id, relation_type)
SELECT s1.id, s2.id, 'related'
FROM study s1, study s2
WHERE s1.slug = 'java-stream-api-deep-dive'
AND s2.slug = 'java-method-reference-deep-dive';
