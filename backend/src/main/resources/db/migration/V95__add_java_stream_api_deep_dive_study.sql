-- V95: Add Dedicated Java Stream API Deep Dive Study Note (java-stream-api-deep-dive)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ensure 'education' category exists
INSERT IGNORE INTO study_category (name, slug, display_order)
VALUES ('공부/학습', 'education', 2);

SET @education_category_id = (
    SELECT id FROM study_category WHERE slug = 'education' OR name = '공부/학습' LIMIT 1
);

-- =========================================================================
-- Java Stream API 심화 & 실전 완전정복 (java-stream-api-deep-dive)
-- =========================================================================
INSERT INTO study (
    slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at
) VALUES (
    'java-stream-api-deep-dive',
    'Java Stream API 심화 & 실전 완전정복 (Stream API Deep Dive)',
    '자바 8부터 도입된 Stream API의 동작 파이프라인, 지연 연산(Lazy Evaluation), 생성-중간-최종 연산자, Collectors(groupingBy, partitioningBy), flatMap 평탄화, 성능 오버헤드와 실전 코딩테스트 패턴을 극도로 상세히 정리한다.',
    '# Java Stream API 심화 & 실전 완전정복 (Stream API Deep Dive)

> 자바 8에 도입된 Stream API는 선언형 프로그래밍 스타일을 제공하여 코드의 가독성을 획기적으로 높여줍니다. 파이프라인 내부 동작 원리, 지연 연산(Lazy Evaluation), Collectors 활용, 그리고 코딩테스트 빈출 패턴을 철저히 해부합니다.

---

## 1. Stream API 개요 및 파이프라인 구조

### 1) Stream이란 무엇인가?
Stream은 데이터 요소의 연속된 흐름(Sequence of Elements)을 의미합니다. 원본 데이터를 변경하지 않는 **불변성(Immutability)**을 지니며, 내부 반복(Internal Iteration)을 수행합니다.

### 2) 3단계 스트림 파이프라인 (Stream Pipeline)
1. **스트림 생성 (Creation)**: 배열, 컬렉션, 파일 등을 기반으로 `Stream<T>` 생성.
2. **중간 연산 (Intermediate Operation)**: `filter`, `map`, `flatMap`, `sorted` 등 데이터 변환. **지연 연산(Lazy Evaluation)**으로 작동하여 최종 연산이 호출되기 전까지는 실제로 실행되지 않음.
3. **최종 연산 (Terminal Operation)**: `collect`, `forEach`, `reduce`, `count` 등 결과를 도출하고 스트림을 소모(Close).

---

## 2. 시각화 및 데이터 흐름

### 1) 스트림 파이프라인 처리 흐름 아스키 아트

```text
 [ 원본 배열 / 컬렉션 ] -> { 1, 2, 3, 4, 5, 6 }
                              │
                              ▼  filter(x -> x % 2 == 0)
                      { 2, 4, 6 }  (짝수만 추출)
                              │
                              ▼  map(x -> x * 10)
                      { 20, 40, 60 }  (10배 변환)
                              │
                              ▼  collect(Collectors.toList())
 [ 최종 결과 List ]   -> [ 20, 40, 60 ]
```

### 2) 스트림 파이프라인 Mermaid 순서도

```mermaid
graph TD
    A["원본 컬렉션 (Collection/Array)"] --> B["스트림 생성: .stream()"]
    B --> C["중간 연산 1: .filter(Predicate) (지연 연산)"]
    C --> D["중간 연산 2: .map(Function) (지연 연산)"]
    D --> E["중간 연산 3: .sorted(Comparator) (지연 연산)"]
    E --> F["최종 연산: .collect(Collectors.toList()) (스트림 실행 및 소비)"]
    F --> G["최종 결과 반환 (List/Set/Value)"]
```

---

## 3. 중간 연산자 (Intermediate Operations) 심화 분석

```java
import java.io.*;
import java.util.*;
import java.util.stream.*;

public class IntermediateOperationsDemo {
    public static void main(String[] args) {
        List<String> words = List.of("apple", "banana", "cherry", "date", "apple");

        // 1. filter: 조건 필터링
        List<String> filtered = words.stream()
                .filter(w -> w.length() >= 5)
                .collect(Collectors.toList()); // [apple, banana, cherry, apple]

        // 2. map: 각 원소 변환
        List<Integer> lengths = words.stream()
                .map(String::length)
                .collect(Collectors.toList()); // [5, 6, 6, 4, 5]

        // 3. flatMap: 2차원 리스트 평탄화 (Flattening)
        List<List<Integer>> nested = List.of(List.of(1, 2), List.of(3, 4, 5));
        List<Integer> flat = nested.stream()
                .flatMap(Collection::stream) // List::stream 메서드 참조로 1차원 평탄화
                .collect(Collectors.toList()); // [1, 2, 3, 4, 5]

        // 4. distinct & sorted: 중복 제거 및 정렬
        List<String> distinctSorted = words.stream()
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList()); // [date, cherry, banana, apple]

        // 5. limit & skip: 슬라이싱
        List<String> sliced = words.stream()
                .skip(1)
                .limit(2)
                .collect(Collectors.toList()); // [banana, cherry]
    }
}
```

> 💡 **Collection::stream 메서드 참조의 원리**
> - **`Collection::stream`**은 `collection -> collection.stream()` 람다 표현식을 간결하게 표현한 메서드 참조(Method Reference)입니다.
> - `flatMap(Collection::stream)`을 호출하면 2차원 컬렉션(`List<List<T>>`)의 각 내부 리스트를 순차적으로 스트림으로 변환하여 단일 1차원 스트림(`Stream<T>`)으로 병합(Flatten)해 줍니다.

---

## 4. 최종 연산자 & Collectors 심화 분석

```java
import java.io.*;
import java.util.*;
import java.util.stream.*;

public class TerminalOperationsDemo {
    public static void main(String[] args) {
        List<Item> items = List.of(
            new Item("Fruit", "Apple", 1000),
            new Item("Fruit", "Banana", 1500),
            new Item("Meat", "Beef", 5000),
            new Item("Meat", "Pork", 3000)
        );

        // 1. groupingBy: 카테고리별 그룹화
        Map<String, List<Item>> byCategory = items.stream()
                .collect(Collectors.groupingBy(Item::category));

        // 2. groupingBy + counting: 카테고리별 개수 세기
        Map<String, Long> categoryCount = items.stream()
                .collect(Collectors.groupingBy(Item::category, Collectors.counting()));

        // 3. partitioningBy: 참/거짓 분할 (가격 2000원 초과 여부)
        Map<Boolean, List<Item>> partitioned = items.stream()
                .collect(Collectors.partitioningBy(item -> item.price > 2000));

        // 4. joining: 문자열 연결
        String names = items.stream()
                .map(Item::name)
                .collect(Collectors.joining(", ", "[", "]")); // "[Apple, Banana, Beef, Pork]"

        // 5. reduce: 누적 연산 (총 금액 합계)
        int totalPrice = items.stream()
                .map(Item::price)
                .reduce(0, Integer::sum);
    }

    record Item(String category, String name, int price) {}
}
```

---

## 5. 코딩테스트 빈출 5대 실전 패턴

### 패턴 1: Map의 Key/Value 기반 정렬 후 상위 K개 추출
```java
import java.util.*;
import java.util.stream.*;

public class TopKPattern {
    public static List<String> getTopKWords(String[] words, int k) {
        Map<String, Integer> freqMap = new HashMap<>();
        for (String w : words) freqMap.put(w, freqMap.getOrDefault(w, 0) + 1);

        // 빈도수 내림차순 -> 빈도 같으면 단어 오름차순
        return freqMap.entrySet().stream()
                .sorted((a, b) -> a.getValue().equals(b.getValue()) ?
                        a.getKey().compareTo(b.getKey()) :
                        Integer.compare(b.getValue(), a.getValue()))
                .limit(k)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
}
```

---

## 6. 주의사항 & 성능(Performance) 가이드

1. **스트림 재사용 불가 (`IllegalStateException`)**: 스트림은 단 1회만 소비될 수 있습니다. 2회 이상 사용 시 `stream has already been operated upon or closed` 예외 발생.
2. **원시 타입 전용 스트림 사용**: `Stream<Integer>` 사용 시 오토박싱/언박싱 오버헤드가 크므로 `IntStream`, `LongStream` 사용 권장 (`IntStream.range(0, n)`).
3. **코딩테스트 온라인 저지에서의 Parallel Stream 피하기**: 병렬 스트림(`parallelStream()`)은 공용 `ForkJoinPool`을 공유하므로 싱글 코어 테스트 서버에서 더 느리거나 교착 상태(Deadlock)를 유발할 수 있습니다.

---

## 7. 추천 관련 학습 스터디

- [Java 코딩테스트 시험장 필수 최종 치트시트 (Master Cheat Sheet)](http://localhost:3000/study/java-coding-test-08-conversions-sorting-and-stream)
- [Java 코딩테스트 문법 3 — List, Set, Map](http://localhost:3000/study/java-coding-test-03-collections)
- [Java 코딩테스트 문법 4 — 정렬과 Comparator](http://localhost:3000/study/java-coding-test-04-sorting-and-comparator)
',
    'PUBLISHED', @education_category_id, '2026-07-25', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content_markdown=VALUES(content_markdown), updated_at=NOW();


-- Tag & Skill Mapping
INSERT IGNORE INTO tag (name, slug) VALUES
('Stream API', 'stream-api'),
('Java', 'java');

INSERT INTO study_tag (study_id, tag_id)
SELECT s.id, t.id
FROM (
    SELECT 'java-stream-api-deep-dive' AS study_slug, 'Java' AS tag_name UNION ALL
    SELECT 'java-stream-api-deep-dive', 'Stream API' UNION ALL
    SELECT 'java-stream-api-deep-dive', '코딩테스트'
) mapping
JOIN study s ON s.slug = mapping.study_slug
JOIN tag t ON t.name = mapping.tag_name
ON DUPLICATE KEY UPDATE study_id = VALUES(study_id);

INSERT INTO study_skill (study_id, skill_id)
SELECT s.id, 1
FROM study s
WHERE s.slug = 'java-stream-api-deep-dive'
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);

-- Interconnect with all Java Syntax Studies
INSERT INTO study_relation (source_study_id, target_study_id, relation_type)
SELECT s1.id, s2.id, 'PREREQUISITE'
FROM study s1
CROSS JOIN study s2
WHERE s1.slug = 'java-stream-api-deep-dive'
AND s2.slug IN (
    'java-coding-test-01-io-and-types',
    'java-coding-test-02-array-and-string',
    'java-coding-test-03-collections',
    'java-coding-test-04-sorting-and-comparator',
    'java-coding-test-05-stack-queue-priority-queue',
    'java-coding-test-06-math-base-and-bit',
    'java-coding-test-07-templates-and-mistakes',
    'java-coding-test-08-conversions-sorting-and-stream'
)
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);

INSERT INTO study_relation (source_study_id, target_study_id, relation_type)
SELECT s1.id, s2.id, 'PREREQUISITE'
FROM study s1
CROSS JOIN study s2
WHERE s1.slug IN (
    'java-coding-test-01-io-and-types',
    'java-coding-test-02-array-and-string',
    'java-coding-test-03-collections',
    'java-coding-test-04-sorting-and-comparator',
    'java-coding-test-05-stack-queue-priority-queue',
    'java-coding-test-06-math-base-and-bit',
    'java-coding-test-07-templates-and-mistakes',
    'java-coding-test-08-conversions-sorting-and-stream'
)
AND s2.slug = 'java-stream-api-deep-dive'
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);
