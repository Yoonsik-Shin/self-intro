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
import { CODE_CONCEPT_DICTIONARY, type ConceptDetail } from '@/config/codeConceptDictionary';

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
    const [isPinned, setIsPinned] = useState(false);
    const [hoveredConcept, setHoveredConcept] = useState<{
        info: ConceptDetail;
        cardLeft: number;
        y: number;
        keyword: string;
        placeBelow: boolean;
        arrowLeft: number;
        popoverWidth: number;
    } | null>(null);

    const activeElementRef = useRef<HTMLElement | null>(null);

    const clearHighlight = () => {
        if (activeElementRef.current) {
            activeElementRef.current.style.backgroundColor = '';
            activeElementRef.current.style.outline = '';
            activeElementRef.current.style.borderRadius = '';
            activeElementRef.current.style.boxShadow = '';
            activeElementRef.current = null;
        }
    };

    const handleClose = () => {
        setIsPinned(false);
        clearHighlight();
        setHoveredConcept(null);
    };

    // 💡 팝업 경계 잘림 절대 방지 (cardLeft) 및 상/하 자동 뒤집힘 (placeBelow) 정밀 위치 계산
    const calculatePopoverPosition = (target: HTMLElement) => {
        const rect = target.getBoundingClientRect();
        const containerRect = codeContainerRef.current?.getBoundingClientRect() || {
            left: 0,
            top: 0,
            width: 600,
            height: 400,
        };

        const targetCenterX = rect.left - containerRect.left + rect.width / 2;
        const relativeTop = rect.top - containerRect.top;

        // 실제 화면상 보이는 컨테이너 너비 측정 (clientWidth 사용)
        const containerWidth = codeContainerRef.current?.clientWidth || containerRect.width || 600;
        const popoverWidth = Math.min(300, Math.max(240, containerWidth - 32));
        const halfWidth = popoverWidth / 2;
        const padding = 16;

        // 좌우 경계 넘침 절대 방지 cardLeft 계산 (최소 padding ~ 최대 containerWidth - width - padding)
        const desiredLeft = targetCenterX - halfWidth;
        const cardLeft = Math.max(
            padding,
            Math.min(containerWidth - popoverWidth - padding, desiredLeft)
        );

        // 코드 상단 근접 시(상단 130px 이내) 아래쪽(Below)으로 자동 위치 변경
        const placeBelow = relativeTop < 130;
        const y = placeBelow
            ? rect.bottom - containerRect.top + 8
            : rect.top - containerRect.top - 8;

        // 화살표 포인터 위치: 팝업 내부 상대 좌표 (targetCenterX - cardLeft)
        const arrowLeft = Math.max(16, Math.min(popoverWidth - 16, targetCenterX - cardLeft));

        return { cardLeft, y, placeBelow, arrowLeft, popoverWidth };
    };

    // 💡 마우스 클릭 시 팝업 상태 고정(Pin) / 해제(Unpin)
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!tooltipEnabled) return;

        const target = e.target as HTMLElement;
        if (!target) return;

        const text = target.textContent?.trim().replace(/^[.()]+|[.()]+$/g, '') || '';
        const detail = CODE_CONCEPT_DICTIONARY[text];

        if (detail) {
            if (isPinned && hoveredConcept?.keyword === text) {
                // 이미 고정된 동일 키워드 클릭 시 고정 해제
                handleClose();
            } else {
                // 새로운 키워드 클릭 시 팝업 고정 모드 활성화 (골드/앰버 글로우)
                clearHighlight();
                setIsPinned(true);

                target.style.backgroundColor = 'rgba(251, 191, 36, 0.3)';
                target.style.outline = '2px solid #f59e0b';
                target.style.borderRadius = '3px';
                target.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.7)';
                activeElementRef.current = target;

                const pos = calculatePopoverPosition(target);
                setHoveredConcept({
                    info: detail,
                    keyword: text,
                    ...pos,
                });
            }
        } else {
            // 바깥 비키워드 클릭 시 팝업 닫기
            if (isPinned) {
                handleClose();
            }
        }
    };

    // 💡 마우스 호버 시 코드 키워드 탐지, 하이라이팅 및 팝업 위치 계산
    const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!tooltipEnabled || isPinned) return;

        const target = e.target as HTMLElement;
        if (!target) return;

        const text = target.textContent?.trim().replace(/^[.()]+|[.()]+$/g, '') || '';
        const detail = CODE_CONCEPT_DICTIONARY[text];

        if (detail) {
            if (activeElementRef.current && activeElementRef.current !== target) {
                clearHighlight();
            }

            // 코드 내 해당 키워드 조각 하이라이팅 (스카이 블루 글로우)
            target.style.backgroundColor = 'rgba(56, 189, 248, 0.25)';
            target.style.outline = '1px solid #38bdf8';
            target.style.borderRadius = '3px';
            target.style.boxShadow = '0 0 8px rgba(56, 189, 248, 0.5)';
            activeElementRef.current = target;

            const pos = calculatePopoverPosition(target);
            setHoveredConcept({
                info: detail,
                keyword: text,
                ...pos,
            });
        } else {
            // 다른 비키워드 영역으로 마우스 이동 시 하이라이트 및 팝업 즉시 제거
            if (activeElementRef.current) {
                clearHighlight();
                setHoveredConcept(null);
            }
        }
    };

    const handleMouseLeave = () => {
        if (isPinned) return; // 고정된 상태에서는 마우스 떠나도 유지
        clearHighlight();
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
            onClick={handleClick}
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

                    {/* ON / OFF 개념 팝업 토글 버튼 (고대비 브라이트 옐로우 스타일) */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setTooltipEnabled(!tooltipEnabled);
                            if (tooltipEnabled) handleClose();
                        }}
                        style={{
                            color: tooltipEnabled ? '#fef08a' : '#e2e8f0',
                            backgroundColor: tooltipEnabled
                                ? 'rgba(217, 119, 6, 0.3)'
                                : 'rgba(30, 41, 59, 0.9)',
                            borderColor: tooltipEnabled ? '#f59e0b' : '#64748b',
                        }}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold shadow-sm transition hover:scale-105 active:scale-95"
                        title="마우스 호버 시 개념 팝업 켜기/끄기"
                    >
                        <span
                            style={{
                                backgroundColor: tooltipEnabled ? '#facc15' : '#94a3b8',
                                boxShadow: tooltipEnabled ? '0 0 10px #facc15' : 'none',
                            }}
                            className={`h-2.5 w-2.5 rounded-full ${
                                tooltipEnabled ? 'animate-pulse' : ''
                            }`}
                        />
                        <span className="tracking-wide">
                            {tooltipEnabled
                                ? '💡 개념 팝업 ON (마우스 클릭 고정 가능)'
                                : '💡 개념 팝업 OFF'}
                        </span>
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

            {/* 🌟 Interactive Code Concept Hover & Click-Pinned Tooltip Popover */}
            {tooltipEnabled && hoveredConcept && (
                <div
                    style={{
                        left: `${hoveredConcept.cardLeft}px`,
                        top: `${hoveredConcept.y}px`,
                        width: `${hoveredConcept.popoverWidth}px`,
                        maxWidth: 'calc(100% - 32px)',
                        boxSizing: 'border-box',
                        transform: hoveredConcept.placeBelow
                            ? 'translateY(0)'
                            : 'translateY(-100%)',
                    }}
                    className="pointer-events-auto absolute z-30 animate-in fade-in zoom-in-95 duration-150"
                >
                    {/* Top Arrow Pointer (when placed below) */}
                    {hoveredConcept.placeBelow && (
                        <div
                            style={{
                                left: `${hoveredConcept.arrowLeft}px`,
                            }}
                            className={`absolute -top-1 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-l border-t bg-slate-900 ${
                                isPinned ? 'border-amber-400' : 'border-sky-400'
                            }`}
                        />
                    )}

                    <div
                        style={{ boxSizing: 'border-box' }}
                        className={`relative w-full max-w-full overflow-hidden rounded-xl border p-3.5 shadow-2xl backdrop-blur-md bg-slate-900/98 ${
                            isPinned
                                ? 'border-amber-400/80 shadow-amber-500/20 ring-1 ring-amber-400/30'
                                : 'border-sky-400/70 shadow-sky-500/20 ring-1 ring-sky-400/30'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px] font-extrabold tracking-wider text-amber-300 uppercase shrink-0">
                                    {hoveredConcept.info.category}
                                </span>
                                {isPinned && (
                                    <span className="rounded bg-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-200 border border-amber-400/60 shrink-0">
                                        📌 고정됨
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-white border border-slate-700">
                                    {hoveredConcept.info.title}
                                </span>
                                {/* ✕ 팝업 헤더 우측 닫기 버튼 UX */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClose();
                                    }}
                                    aria-label="팝업 닫기"
                                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-extrabold text-slate-200 border border-slate-600 transition hover:bg-red-500 hover:text-white hover:border-red-400"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Description Paragraph (High Contrast Pure White & Break-words) */}
                        <p className="mt-2.5 text-xs font-medium leading-relaxed text-slate-100 break-words whitespace-normal">
                            {hoveredConcept.info.desc}
                        </p>

                        {/* Tip Box (High Contrast Vivid Amber Yellow) */}
                        {hoveredConcept.info.tip && (
                            <div className="mt-2.5 rounded-lg border border-amber-400/40 bg-amber-500/15 p-2.5 text-xs font-semibold text-amber-200 break-words whitespace-normal">
                                💡 {hoveredConcept.info.tip}
                            </div>
                        )}
                    </div>

                    {/* Bottom Arrow Pointer (when placed above) */}
                    {!hoveredConcept.placeBelow && (
                        <div
                            style={{
                                left: `${hoveredConcept.arrowLeft}px`,
                            }}
                            className={`absolute -bottom-1 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r bg-slate-900 ${
                                isPinned ? 'border-amber-400' : 'border-sky-400'
                            }`}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
