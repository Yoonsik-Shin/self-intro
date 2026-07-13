# Java Collections

## When To Use

- `ArrayList`: 인덱스 접근이 많고 중간 삽입/삭제가 적을 때
- `HashMap`: 값의 빈도, 위치, 짝이 되는 값을 빠르게 찾을 때
- `HashSet`: 중복 제거, 방문 여부 확인
- `PriorityQueue`: 매번 최솟값 또는 최댓값을 꺼내야 할 때
- `ArrayDeque`: 큐, 스택, 슬라이딩 윈도우 후보 관리

## Pitfalls

- `PriorityQueue`는 기본이 min heap입니다.
- `HashMap#get` 결과는 `null`일 수 있으므로 `getOrDefault`, `containsKey`를 상황에 맞게 씁니다.
- `Stack`보다 `ArrayDeque`를 우선 사용합니다.
- 원시 타입 배열은 정렬 가능하지만, 커스텀 비교가 필요한 경우 객체 배열 또는 리스트가 필요합니다.

