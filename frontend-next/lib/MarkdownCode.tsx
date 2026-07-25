'use client';

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import type { ExtraProps } from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import kotlin from 'react-syntax-highlighter/dist/esm/languages/prism/kotlin';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';

export type CodeLanguageChange = (
    position: { start: number; end: number },
    language: string
) => void;

type CodeProps = ComponentPropsWithoutRef<'code'> &
    ExtraProps & {
        onLanguageChange?: CodeLanguageChange;
    };

export const codeLanguages = [
    { value: 'text', label: 'Plain Text', aliases: [] },
    { value: 'javascript', label: 'JavaScript', aliases: ['js'] },
    { value: 'typescript', label: 'TypeScript', aliases: ['ts'] },
    { value: 'python', label: 'Python', aliases: ['py'] },
    { value: 'java', label: 'Java', aliases: [] },
    { value: 'go', label: 'Go', aliases: [] },
    { value: 'rust', label: 'Rust', aliases: [] },
    { value: 'cpp', label: 'C++', aliases: [] },
    { value: 'c', label: 'C', aliases: [] },
    { value: 'csharp', label: 'C#', aliases: ['cs'] },
    { value: 'html', label: 'HTML', aliases: [] },
    { value: 'css', label: 'CSS', aliases: [] },
    { value: 'json', label: 'JSON', aliases: [] },
    { value: 'yaml', label: 'YAML', aliases: ['yml'] },
    { value: 'markdown', label: 'Markdown', aliases: ['md'] },
    { value: 'sql', label: 'SQL', aliases: [] },
    { value: 'bash', label: 'Bash', aliases: ['sh', 'shell'] },
    { value: 'dockerfile', label: 'Dockerfile', aliases: ['docker'] },
    { value: 'xml', label: 'XML', aliases: [] },
] as const;

interface ConceptDetail {
    title: string;
    desc: string;
    category: string;
    tip?: string;
}

// 💡 코딩테스트 및 Java 핵심 개념 호버 팝업 사전
const CODE_CONCEPT_DICTIONARY: Record<string, ConceptDetail> = {
    // Stream API
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

    // I/O & Types
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

    // Collections & Data Structures
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

    // Algorithms & Sorting
    dijkstra: {
        title: '다익스트라 (Dijkstra)',
        desc: '음수 가중치가 없는 그래프에서 단일 출발지 최단 경로를 $O((V+E)\log V)$ 시간에 탐색합니다.',
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
        desc: '두 정수의 최대공약수를 a % b 재귀/반복으로 $O(\log N)$ 시간에 구합니다.',
        category: '📐 수학',
        tip: 'lcm = (a * b) / gcd(a, b)',
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

function normalizeLanguage(language?: string) {
    if (!language) return 'text';
    return (
        codeLanguages.find(
            ({ value, aliases }) =>
                value === language || aliases.some((alias) => alias === language)
        )?.value ?? language
    );
}

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('cs', csharp);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('docker', docker);
SyntaxHighlighter.registerLanguage('dockerfile', docker);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('kotlin', kotlin);
SyntaxHighlighter.registerLanguage('kt', kotlin);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);

let mermaidSequence = 0;
let mermaidInitialized = false;

function MermaidDiagram({ source }: { source: string }) {
    const diagramRef = useRef<HTMLDivElement>(null);
    const [rendering, setRendering] = useState(false);
    const [error, setError] = useState('');
    const normalizedSource = source.trim();

    useEffect(() => {
        if (!normalizedSource || !diagramRef.current) {
            setRendering(false);
            setError('');
            return;
        }

        let cancelled = false;
        const render = async () => {
            setRendering(true);
            try {
                const mermaid = (await import('mermaid')).default;
                if (!mermaidInitialized) {
                    mermaid.initialize({
                        startOnLoad: false,
                        securityLevel: 'strict',
                        theme: 'neutral',
                    });
                    mermaidInitialized = true;
                }

                const container = diagramRef.current;
                if (!container || cancelled) return;

                container.removeAttribute('data-processed');
                container.id = `study-mermaid-${++mermaidSequence}`;
                container.textContent = normalizedSource;
                await mermaid.run({ nodes: [container] });

                if (!cancelled) {
                    setError('');
                    setRendering(false);
                }
            } catch (renderError) {
                if (!cancelled) {
                    setError(
                        renderError instanceof Error
                            ? renderError.message
                            : 'Mermaid 문법을 확인해 주세요.'
                    );
                    setRendering(false);
                }
            }
        };
        void render();
        return () => {
            cancelled = true;
        };
    }, [normalizedSource]);

    if (!normalizedSource) {
        return (
            <div className="my-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500">
                Mermaid 블록 안에 다이어그램 문법을 입력해 주세요.
                <code className="mt-2 block font-mono text-slate-400">
                    graph TD&nbsp;&nbsp;A[시작] --&gt; B[완료]
                </code>
            </div>
        );
    }

    return (
        <div className="my-4">
            {error && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-bold text-red-700">Mermaid 렌더링에 실패했습니다.</p>
                    <p className="mt-1 text-xs text-red-600">{error}</p>
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                        {source}
                    </pre>
                </div>
            )}
            <div
                className={`relative min-h-24 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 ${error ? 'hidden' : ''}`}
            >
                {rendering && (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-white/80 text-xs font-semibold text-slate-400">
                        다이어그램 렌더링 중...
                    </div>
                )}
                <div
                    ref={diagramRef}
                    className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
                />
            </div>
        </div>
    );
}

export function MarkdownCode({ children, className, node, onLanguageChange }: CodeProps) {
    const source = children == null ? '' : String(children).replace(/\n$/, '');
    const rawLanguage = className?.match(/language-([\w-]+)/)?.[1]?.toLowerCase();
    const language = normalizeLanguage(rawLanguage);
    const isBlock = Boolean(rawLanguage) || source.includes('\n');

    const codeContainerRef = useRef<HTMLDivElement>(null);
    const [tooltipEnabled, setTooltipEnabled] = useState(true);
    const [hoveredConcept, setHoveredConcept] = useState<{
        info: ConceptDetail;
        x: number;
        y: number;
        keyword: string;
    } | null>(null);

    // 💡 마우스 호버 시 코드 키워드 탐지 및 팝업 위치 계산
    const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!tooltipEnabled) return;

        const target = e.target as HTMLElement;
        if (!target) return;

        const text = target.textContent?.trim().replace(/^[.()]+|[.()]+$/g, '') || '';
        const detail = CODE_CONCEPT_DICTIONARY[text];

        if (detail) {
            const rect = target.getBoundingClientRect();
            const containerRect = codeContainerRef.current?.getBoundingClientRect() || {
                left: 0,
                top: 0,
            };

            setHoveredConcept({
                info: detail,
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top - 8,
                keyword: text,
            });
        }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        // 팝업 내부로 마우스 이동 시 닫히지 않도록 조치
        const related = e.relatedTarget as HTMLElement;
        if (related && codeContainerRef.current?.contains(related)) {
            return;
        }
        setHoveredConcept(null);
    };

    if (rawLanguage === 'mermaid') {
        return <MermaidDiagram source={source} />;
    }

    if (!isBlock) {
        return (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800">
                {children}
            </code>
        );
    }

    const start = node?.position?.start.offset;
    const end = node?.position?.end.offset;
    const canChangeLanguage = onLanguageChange && start !== undefined && end !== undefined;
    const selectedLanguage = codeLanguages.some(({ value }) => value === language)
        ? language
        : 'text';
    const selectedLabel =
        codeLanguages.find(({ value }) => value === selectedLanguage)?.label ?? 'Plain Text';

    return (
        <div
            ref={codeContainerRef}
            onMouseOver={handleMouseOver}
            onMouseLeave={handleMouseLeave}
            className="group relative my-4 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-md"
        >
            {/* Top Bar Header with Toggle Switch */}
            <div className="flex h-10 items-center justify-between border-b border-slate-700 bg-slate-900 px-3.5">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Code
                    </span>

                    {/* ON / OFF 개념 팝업 토글 버튼 */}
                    <button
                        type="button"
                        onClick={() => {
                            setTooltipEnabled(!tooltipEnabled);
                            if (tooltipEnabled) setHoveredConcept(null);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ${
                            tooltipEnabled
                                ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60 hover:bg-sky-900'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                        }`}
                        title="마우스 호버 시 개념 팝업 켜기/끄기"
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${
                                tooltipEnabled ? 'bg-sky-400 animate-pulse' : 'bg-slate-500'
                            }`}
                        />
                        {tooltipEnabled ? '💡 개념 팝업 ON (마우스 호버)' : '💡 개념 팝업 OFF'}
                    </button>
                </div>

                {canChangeLanguage ? (
                    <label className="relative">
                        <span className="sr-only">코드 언어</span>
                        <select
                            value={selectedLanguage}
                            onChange={(event) =>
                                onLanguageChange({ start, end }, event.target.value)
                            }
                            className="cursor-pointer appearance-none rounded-md border border-slate-600 bg-slate-800 py-1 pl-2.5 pr-7 text-xs font-semibold text-slate-200 outline-none transition hover:border-slate-500 focus:border-blue-400"
                        >
                            {codeLanguages.map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                            ▼
                        </span>
                    </label>
                ) : (
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {selectedLabel}
                    </span>
                )}
            </div>

            {/* Code Highlighting Container */}
            <SyntaxHighlighter
                language={selectedLanguage}
                style={vscDarkPlus}
                showLineNumbers={source.split('\n').length >= 4}
                wrapLongLines={false}
                customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    background: 'transparent',
                }}
                codeTagProps={{
                    style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
                }}
            >
                {source}
            </SyntaxHighlighter>

            {/* 🌟 Interactive Code Concept Hover Tooltip Popover with Close (X) Button */}
            {tooltipEnabled && hoveredConcept && (
                <div
                    style={{
                        left: `${hoveredConcept.x}px`,
                        top: `${hoveredConcept.y}px`,
                        transform: 'translate(-50%, -100%)',
                    }}
                    className="pointer-events-auto absolute z-30 max-w-xs animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="relative rounded-xl border border-sky-400/40 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md ring-1 ring-white/10">
                        {/* ✕ 닫기 버튼 UX */}
                        <button
                            type="button"
                            onClick={() => setHoveredConcept(null)}
                            aria-label="팝업 닫기"
                            className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white transition text-xs font-bold"
                        >
                            ✕
                        </button>

                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 pr-6">
                            <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                                {hoveredConcept.info.category}
                            </span>
                            <span className="rounded bg-sky-950 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-sky-200">
                                {hoveredConcept.info.title}
                            </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-200">
                            {hoveredConcept.info.desc}
                        </p>
                        {hoveredConcept.info.tip && (
                            <div className="mt-2 rounded-lg border border-sky-800/40 bg-sky-950/60 p-2 text-[11px] font-medium text-sky-300">
                                💡 {hoveredConcept.info.tip}
                            </div>
                        )}
                    </div>
                    {/* Popover Arrow Pointer */}
                    <div className="mx-auto -mt-1 h-2 w-2 rotate-45 border-b border-r border-sky-400/40 bg-slate-900/95" />
                </div>
            )}
        </div>
    );
}
