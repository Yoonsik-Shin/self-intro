export interface ConceptDetail {
    title: string;
    desc: string;
    category: string;
    tip?: string;
}

/**
 * 💡 코드 블록 마우스 호버 개념 팝업 사전 데이터
 * 새로운 키워드나 개념 설명을 추가/수정하려면 이 파일만 편집하시면 됩니다.
 */
export const CODE_CONCEPT_DICTIONARY: Record<string, ConceptDetail> = {
    // ⚡ Stream API
    filter: {
        title: 'filter(Predicate)',
        desc: '조건을 만족하는(true) 원소만 걸러내는 중간 연산자입니다.',
        category: '⚡ Stream API',
        tip: '짝수 추출, 유효 조건 스캔에 빈출',
    },
    map: {
        title: 'map(Function)',
        desc: '각 원소를 지정한 함수에 따라 다른 형태나 값으로 변환합니다.',
        category: '⚡ Stream API',
        tip: '객체 -> 단일 필드 추출 또는 10배 변환',
    },
    flatMap: {
        title: 'flatMap(Function)',
        desc: '중첩된 2차원 컬렉션/스트림을 단일 1차원 평면 스트림으로 펼쳐(Flatten)줍니다.',
        category: '⚡ Stream API',
        tip: '2차원 리스트/배열 -> 1차원 평탄화 필수',
    },
    collect: {
        title: 'collect(Collector)',
        desc: '스트림 파이프라인의 처리 결과를 List, Set, Map 컬렉션으로 최종 수집합니다.',
        category: '⚡ Stream API',
        tip: '최종 연산자로 스트림을 소모함',
    },
    Collectors: {
        title: 'Collectors',
        desc: 'toList(), toSet(), groupingBy() 등 정적 수집 유틸리티 메서드를 제공하는 클래스입니다.',
        category: '⚡ Stream API',
    },
    toList: {
        title: 'toList()',
        desc: '스트림의 최종 결과를 java.util.List 컬렉션으로 변환하여 반환합니다.',
        category: '⚡ Stream API',
    },
    toSet: {
        title: 'toSet()',
        desc: '스트림의 최종 결과를 중복이 없는 java.util.Set 컬렉션으로 수집합니다.',
        category: '⚡ Stream API',
    },
    distinct: {
        title: 'distinct()',
        desc: 'equals() 및 hashCode() 기준으로 중복된 원소를 제거합니다.',
        category: '⚡ Stream API',
        tip: 'Set 변환 없이 중복 제거 시 사용',
    },
    sorted: {
        title: 'sorted(Comparator)',
        desc: '원소들을 자연 순서(Comparable) 또는 커스텀 Comparator 기준 정렬합니다.',
        category: '⚡ Stream API',
    },
    groupingBy: {
        title: 'groupingBy()',
        desc: '지정한 키 함수를 기준으로 원소들을 그룹화하여 Map으로 반환합니다.',
        category: '⚡ Stream API',
        tip: '카테고리별 집계/그룹화에 핵심',
    },
    partitioningBy: {
        title: 'partitioningBy()',
        desc: '참/거짓(Predicate)을 기준으로 원소들을 Boolean 키의 Map으로 분할합니다.',
        category: '⚡ Stream API',
    },
    joining: {
        title: 'joining(delimiter)',
        desc: '스트림의 문자열 원소들을 지정한 구분자로 연결하여 단일 String으로 생성합니다.',
        category: '⚡ Stream API',
    },
    reduce: {
        title: 'reduce(identity, accumulator)',
        desc: '모든 원소를 차례대로 누적 결합하여 단일 최종 결과를 도출합니다.',
        category: '⚡ Stream API',
        tip: '총합 계산, 누적 곱에 활용',
    },
    anyMatch: {
        title: 'anyMatch(Predicate)',
        desc: '단 하나라도 조건을 만족하면 즉시 true를 반환하고 탐색을 종료(Short-circuit)합니다.',
        category: '⚡ Stream API',
    },
    allMatch: {
        title: 'allMatch(Predicate)',
        desc: '모든 원소가 조건을 만족해야 true를 반환합니다.',
        category: '⚡ Stream API',
    },
    noneMatch: {
        title: 'noneMatch(Predicate)',
        desc: '모든 원소가 조건을 만족하지 않아야 true를 반환합니다.',
        category: '⚡ Stream API',
    },

    // 📦 I/O & Types
    BufferedReader: {
        title: 'BufferedReader',
        desc: '대용량 입력을 버퍼링하여 $O(N)$ 시간에 빠르게 읽어들이는 Fast I/O 필수 클래스입니다.',
        category: '📦 Java 입출력',
        tip: 'Scanner 대비 최대 5배 이상 빨라 TLE 예방',
    },
    InputStreamReader: {
        title: 'InputStreamReader',
        desc: '바이트 스트림(System.in)을 문자 스트림으로 변환해주는 다리 역할을 합니다.',
        category: '📦 Java 입출력',
    },
    StringTokenizer: {
        title: 'StringTokenizer',
        desc: '문자열을 공백이나 특정 구분자를 기준으로 빠르게 분할(Tokenize)하는 클래스입니다.',
        category: '📦 Java 입출력',
        tip: 'st.nextToken()으로 빠른 정수 파싱',
    },
    StringBuilder: {
        title: 'StringBuilder',
        desc: '가변 문자열을 생성하여 반복문 내 출력을 $O(1)$에 연결하고 System.out 횟수를 최소화합니다.',
        category: '📦 Java 입출력',
        tip: '반복문 내 String + 연산 대신 필수 사용',
    },
    BigInteger: {
        title: 'BigInteger',
        desc: 'long 범위(약 9x10^18)를 초과하는 무한대 무한 정수를 오버플로우 없이 정밀 연산합니다.',
        category: '📦 Java 자료형',
        tip: 'BigInteger.add(), multiply() 사용',
    },
    BigDecimal: {
        title: 'BigDecimal',
        desc: '부동소수점 오차 없는 정밀한 고정소수점 실수를 연산하는 클래스입니다.',
        category: '📦 Java 자료형',
    },

    // 🧩 Collections & Data Structures
    PriorityQueue: {
        title: 'PriorityQueue',
        desc: '우선순위가 가장 높은 원소가 먼저 추출되는 힙(Heap) 기반 자료구조입니다.',
        category: '🧩 자료구조',
        tip: '다익스트라, 최솟값/최댓값 실시간 유지에 필수',
    },
    ArrayDeque: {
        title: 'ArrayDeque',
        desc: 'Vector 상호 동기화 오버헤드가 있는 Stack 대신 사용하는 고속 양방향 덱(Deque)입니다.',
        category: '🧩 자료구조',
        tip: 'Stack/Queue 구현 시 스레드 안전성 없으나 $O(1)$ 최고 속도',
    },
    TreeSet: {
        title: 'TreeSet',
        desc: '이진 탐색 트리를 기반으로 자동 정렬하며 floor()/ceiling() 근접 범위 검색을 제공합니다.',
        category: '🧩 자료구조',
    },
    TreeMap: {
        title: 'TreeMap',
        desc: '키(Key)를 기준 정렬하여 정렬된 상태의 Map 및 범위 탐색을 제공합니다.',
        category: '🧩 자료구조',
    },
    computeIfAbsent: {
        title: 'computeIfAbsent()',
        desc: 'Map에 지정한 키가 없으면 신규 객체(ArrayList 등)를 생성해 자동 할당하는 안전한 메서드입니다.',
        category: '🧩 Java Map',
        tip: 'Multi-Value Map 그룹화 시 필수',
    },
    getOrDefault: {
        title: 'getOrDefault()',
        desc: '키가 존재하면 값을, 없으면 기본값(Default)을 반환하는 카운팅 메서드입니다.',
        category: '🧩 Java Map',
        tip: '카운팅(Frequency Map) 작성 시 필수',
    },
    putIfAbsent: {
        title: 'putIfAbsent()',
        desc: '키가 설정되어 있지 않을 때만 지정된 값을 저장합니다.',
        category: '🧩 Java Map',
    },

    // 📐 Algorithms & Sorting
    dijkstra: {
        title: '다익스트라 (Dijkstra)',
        desc: '음수 가중치가 없는 그래프에서 단일 출발지 최단 경로를 $O((V+E)\\log V)$ 시간에 탐색합니다.',
        category: '📐 알고리즘',
        tip: 'PriorityQueue + dist[] 방문 체크 필수',
    },
    'Integer.compare': {
        title: 'Integer.compare(a, b)',
        desc: 'a - b 뺄셈 오버플로우를 예방하고 안전하게 오름차순/내림차순 정렬 연산을 수행합니다.',
        category: '📐 Java 정렬',
        tip: 'Comparator 작성 시 뺄셈 대신 무조건 권장',
    },
    gcd: {
        title: '유클리드 호제법 (GCD)',
        desc: '두 정수의 최대공약수를 a % b 재귀/반복으로 $O(\\log N)$ 시간에 구합니다.',
        category: '📐 수학',
        tip: 'lcm = (a * b) / gcd(a, b)',
    },
    lcm: {
        title: '최소공배수 (LCM)',
        desc: '두 정수의 공통된 가장 작은 배수로, (a / gcd(a, b)) * b 공식으로 구합니다.',
        category: '📐 수학',
    },
    find: {
        title: 'find(x) 경로 압축',
        desc: '유니온 파인드에서 재귀적으로 루트를 찾으며 모든 부모 노드를 루트로 직접 연결해 $O(1)$로 압축합니다.',
        category: '📐 알고리즘',
    },
    union: {
        title: 'union(a, b)',
        desc: '두 원소 a와 b의 대표 루트 노드를 찾아 하나의 집합으로 합치는 연산입니다.',
        category: '📐 알고리즘',
    },
};
