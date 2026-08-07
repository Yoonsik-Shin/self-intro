'use client';

import {
    Fragment,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowDown, ArrowUp, LayoutTemplate, MoveVertical, RotateCcw, X } from 'lucide-react';
import type { PortfolioCaseStudy, PortfolioCaseStudyContent, PrintTemplate } from '@/lib/api/types';
import { resumeMarkdownComponents } from '@/lib/markdown';
import {
    getPageMetrics,
    partitionAtomsIntoPages,
    type PageOrientation,
    type PrintAtomItem,
} from '@/lib/pdfLayoutEngine';
import { usePortfolioPrintStore } from '@/store/usePortfolioPrintStore';
import { PdfPageLayer } from '@/components/print/PdfPageLayer';
import { PrintPreviewBar } from '@/components/print/PrintPreviewBar';
import { PrintEyeButton } from '@/components/print/PrintEyeButton';

type ContentOverrides = {
    summary?: string;
    problem?: string;
    thoughtProcess?: string;
    solution?: string;
    outcomeSummary?: string;
};

/** print_template.content_overrides에 실제로 들어가는 포트폴리오 전용 payload 모양.
 * 타입 선언상 PrintTemplate.contentOverrides는 이력서용 PrintTemplateContentOverrides지만,
 * document_type=PORTFOLIO 행에는 이 모양으로 저장한다(같은 컬럼을 문서 종류별로 다르게 씀). */
type PortfolioContentOverridesPayload = {
    narrative?: ContentOverrides;
    forcedPageOverrides?: Record<string, number>;
};

type Props = {
    caseStudy: Pick<PortfolioCaseStudy, 'title'>;
    content: PortfolioCaseStudyContent;
    onExit: () => void;
    initialLayout?: PrintTemplate | null;
    /** initialLayout이 없을 때(아직 저장된 배치가 없는 방향) 캔버스를 어느 방향으로 열지. */
    initialOrientation?: PageOrientation;
    adminMode?: boolean;
    onSaveLayout?: (settings: {
        orientation: PageOrientation;
        excludedIds: string[];
        sectionGaps: Record<string, number>;
        forcedPageOverrides: Record<string, number>;
        contentOverrides: ContentOverrides;
        lineHeight: number;
    }) => void;
};

function InlineEditableText({
    value,
    onChange,
    placeholder,
    className = '',
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}) {
    const editorRef = useRef<HTMLSpanElement | null>(null);

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor || document.activeElement === editor) return;
        if (editor.innerText !== value) editor.innerText = value;
    }, [value]);

    return (
        <span
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={placeholder || '문구 편집'}
            data-placeholder={placeholder}
            onInput={(e) => onChange(e.currentTarget.innerText.replace(/\r/g, ''))}
            className={`inline-editable-text ${className}`}
        />
    );
}

const orientationLabel: Record<PageOrientation, string> = { portrait: '세로', landscape: '가로' };

/** window.print() 실행 직전, landscape일 때만 @page 용지 크기와 html/body 폭을 동적으로 덮어쓴다.
 * globals.css의 기본 @page는 portrait 고정이라 이 방법이 아니면 landscape 용지로 인쇄할 수 없다. */
function triggerPrint(orientation: PageOrientation) {
    let styleEl: HTMLStyleElement | null = null;
    if (orientation === 'landscape') {
        styleEl = document.createElement('style');
        styleEl.setAttribute('data-portfolio-print-override', 'true');
        styleEl.textContent = `
            @page { size: A4 landscape; margin: 0 !important; }
            @media print {
                html, body, #__next, main { width: 297mm !important; }
            }
        `;
        document.head.appendChild(styleEl);
    }
    const cleanup = () => {
        styleEl?.remove();
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
}

export function PortfolioPrintCanvas({
    caseStudy,
    content,
    onExit,
    initialLayout = null,
    initialOrientation = 'portrait',
    adminMode = false,
    onSaveLayout,
}: Props) {
    const store = usePortfolioPrintStore();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [inlineEditMode, setInlineEditMode] = useState(false);
    // 부모가 이 컴포넌트를 열 때마다(닫혀 있다가 다시 열릴 때) 매번 새로 마운트하는 것을 전제로,
    // 초기 문구 override는 lazy state 초기값에서 한 번만 계산한다 — effect에서 다시 setState하지 않는다.
    const [contentOverrides, setContentOverrides] = useState<ContentOverrides>(() => {
        const payload = initialLayout?.contentOverrides as
            PortfolioContentOverridesPayload | undefined;
        return payload?.narrative ?? {};
    });

    // zustand 스토어는 모듈 싱글턴이라 컴포넌트 리마운트로는 초기화되지 않는다 — 이전 세션의
    // 다른 케이스스터디/방향 상태가 새 세션으로 새는 것을 막기 위해 여기서 매번 명시적으로 맞춘다.
    useEffect(() => {
        if (initialLayout) {
            const payload = initialLayout.contentOverrides as PortfolioContentOverridesPayload;
            store.setOrientation(
                initialLayout.orientation === 'LANDSCAPE' ? 'landscape' : 'portrait'
            );
            store.applyLayout({
                excludedIds: initialLayout.excludedIds,
                sectionGaps: initialLayout.sectionGaps,
                forcedPageOverrides: payload?.forcedPageOverrides ?? {},
                lineHeight: initialLayout.lineHeight,
            });
        } else {
            store.reset();
            store.setOrientation(initialOrientation);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialLayout?.id, initialOrientation]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                store.setZoom(store.zoom + (-e.deltaY > 0 ? 0.05 : -0.05));
            }
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.zoom]);

    const resolved = useMemo(
        () => ({
            summary: contentOverrides.summary ?? content.summary,
            problem: contentOverrides.problem ?? content.problem,
            thoughtProcess: contentOverrides.thoughtProcess ?? content.thoughtProcess,
            solution: contentOverrides.solution ?? content.solution,
            outcomeSummary: contentOverrides.outcomeSummary ?? content.outcome.summary,
        }),
        [contentOverrides, content]
    );

    const renderInlineText = (
        field: keyof ContentOverrides,
        baseValue: string,
        className: string,
        placeholder: string
    ) => {
        const value = resolved[field] ?? '';
        const isOverridden = value !== baseValue;
        if (!inlineEditMode) {
            return <span className={className}>{value}</span>;
        }
        return (
            <span className="group/edit relative block w-full">
                <span
                    aria-hidden="true"
                    className={`invisible block whitespace-pre-line ${className}`}
                >
                    {value || ' '}
                </span>
                <InlineEditableText
                    value={value}
                    onChange={(next) =>
                        setContentOverrides((cur) => ({
                            ...cur,
                            [field]: next.trim() === baseValue.trim() ? undefined : next,
                        }))
                    }
                    placeholder={placeholder}
                    className={`absolute inset-0 block whitespace-pre-line outline-2 outline-blue-400 -outline-offset-1 bg-blue-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${className}`}
                />
                {isOverridden && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContentOverrides((cur) => ({ ...cur, [field]: undefined }));
                        }}
                        className="absolute -top-3.5 right-1 z-30 inline-flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.2 text-[9px] font-black text-white shadow-xs hover:bg-amber-600 transition print:hidden"
                        title="원본 문구로 복원"
                    >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>원본 복원</span>
                    </button>
                )}
            </span>
        );
    };

    const atoms = useMemo<PrintAtomItem[]>(() => {
        const list: PrintAtomItem[] = [];
        list.push({
            id: 'portfolio-header',
            type: 'portfolio-header',
            sectionId: 'header',
            isHeader: true,
        });
        if (resolved.problem)
            list.push({ id: 'portfolio-problem', type: 'portfolio-problem', sectionId: 'problem' });
        if (resolved.thoughtProcess)
            list.push({ id: 'portfolio-thought', type: 'portfolio-thought', sectionId: 'thought' });
        if (content.tradeoffs.length > 0) {
            list.push({
                id: 'portfolio-tradeoffs-header',
                type: 'portfolio-tradeoffs-header',
                sectionId: 'tradeoffs',
                isHeader: true,
            });
            content.tradeoffs.forEach((t, i) =>
                list.push({
                    id: `portfolio-tradeoff:${i}`,
                    type: 'portfolio-tradeoff-item',
                    sectionId: 'tradeoffs',
                    dataId: i,
                    title: t.option,
                })
            );
        }
        if (resolved.solution)
            list.push({
                id: 'portfolio-solution',
                type: 'portfolio-solution',
                sectionId: 'solution',
            });
        if (resolved.outcomeSummary || content.outcome.metrics.length > 0) {
            list.push({
                id: 'portfolio-outcome-header',
                type: 'portfolio-outcome-header',
                sectionId: 'outcome',
                isHeader: true,
            });
            if (resolved.outcomeSummary)
                list.push({
                    id: 'portfolio-outcome-summary',
                    type: 'portfolio-outcome-summary',
                    sectionId: 'outcome',
                });
            content.outcome.metrics.forEach((m, i) =>
                list.push({
                    id: `portfolio-outcome-metric:${i}`,
                    type: 'portfolio-outcome-metric',
                    sectionId: 'outcome',
                    dataId: i,
                    title: m.label,
                })
            );
        }
        const hasMermaid = Boolean(content.architecture.mermaidSource);
        const hasImages = content.architecture.imageUrls.length > 0;
        if (hasMermaid || hasImages) {
            list.push({
                id: 'portfolio-architecture-header',
                type: 'portfolio-architecture-header',
                sectionId: 'architecture',
                isHeader: true,
            });
            if (hasMermaid)
                list.push({
                    id: 'portfolio-architecture-diagram',
                    type: 'portfolio-architecture-diagram',
                    sectionId: 'architecture',
                });
            content.architecture.imageUrls.forEach((_, i) =>
                list.push({
                    id: `portfolio-architecture-image:${i}`,
                    type: 'portfolio-architecture-image',
                    sectionId: 'architecture',
                    dataId: i,
                })
            );
        }
        return list.filter((atom) => !store.excludedIds.includes(atom.id));
    }, [content, resolved, store.excludedIds]);

    const pageMetrics = getPageMetrics(store.orientation);
    const pageLayers = useMemo(
        () =>
            partitionAtomsIntoPages(
                atoms,
                store.atomHeights,
                store.sectionGaps,
                store.forcedPageOverrides,
                pageMetrics.contentHeightPx
            ),
        [
            atoms,
            store.atomHeights,
            store.sectionGaps,
            store.forcedPageOverrides,
            pageMetrics.contentHeightPx,
        ]
    );

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let frame = 0;
        let disposed = false;

        const measure = () => {
            frame = 0;
            if (disposed) return;
            const elements = Array.from(canvas.querySelectorAll<HTMLElement>('[data-atom-id]'));
            const newHeights = new Map<string, number>();
            elements.forEach((el) => {
                const atomId = el.dataset.atomId;
                if (!atomId) return;
                const target = el.querySelector<HTMLElement>('[data-print-el]') || el;
                const height = target.offsetHeight;
                if (height > 0) newHeights.set(atomId, height);
            });
            const previous = usePortfolioPrintStore.getState().atomHeights;
            const changed =
                previous.size !== newHeights.size ||
                Array.from(newHeights).some(
                    ([id, height]) =>
                        previous.get(id) === undefined ||
                        Math.abs((previous.get(id) ?? 0) - height) > 1
                );
            if (changed) store.setAtomHeights(newHeights);
        };

        const scheduleMeasure = () => {
            if (frame || disposed) return;
            frame = window.requestAnimationFrame(measure);
        };

        const observer = new ResizeObserver(scheduleMeasure);
        Array.from(canvas.querySelectorAll<HTMLElement>('[data-atom-id] [data-print-el]')).forEach(
            (el) => observer.observe(el)
        );
        measure();
        void document.fonts.ready.then(scheduleMeasure);

        return () => {
            disposed = true;
            if (frame) window.cancelAnimationFrame(frame);
            observer.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageLayers, atoms, store.sectionGaps, store.zoom, store.orientation]);

    const atomPageMap = useMemo(() => {
        const map = new Map<string, number>();
        pageLayers.forEach((page) =>
            page.items.forEach((item) => map.set(item.id, page.pageIndex))
        );
        return map;
    }, [pageLayers]);

    const handleZoomFit = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const fitZoom = (canvas.clientWidth - 64) / pageMetrics.widthPx;
        store.setZoom(fitZoom);
    };

    const renderGapControl = (id: string) => (
        <div
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const startY = e.clientY;
                const startGap = Math.max(0, store.sectionGaps[id] ?? 0);
                const onMove = (me: MouseEvent) =>
                    store.setGap(id, Math.max(0, Math.round(startGap + (me.clientY - startY))));
                const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
            }}
            title="위아래로 끌어서 간격 조절"
            className="grid h-6 w-6 cursor-ns-resize place-items-center rounded-full bg-slate-700/90 text-white transition hover:bg-blue-600 hover:scale-110"
        >
            <MoveVertical className="h-3 w-3" />
        </div>
    );

    const renderItemControls = (id: string) => {
        if (store.hideGuides) return null;
        const forcedPage = store.forcedPageOverrides[id];
        const currentPage = atomPageMap.get(id) ?? 0;
        return (
            <div className="pp-controls print:hidden flex items-center gap-1 bg-slate-900/90 p-1 rounded-full shadow-lg backdrop-blur-md z-40">
                <PrintEyeButton
                    id={id}
                    excluded={store.excludedIds.includes(id)}
                    onToggle={store.toggleExcluded}
                />
                {forcedPage !== undefined ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            store.clearForcedPage([id]);
                        }}
                        title="자동 배치로 되돌리기"
                        className="flex h-6 items-center gap-1 rounded-full bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700 transition cursor-pointer shadow-sm"
                    >
                        <ArrowDown className="h-3 w-3" />
                        <span>{forcedPage + 1}p 고정 해제</span>
                    </button>
                ) : (
                    currentPage > 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                store.forcePage([id], currentPage - 1);
                            }}
                            title="이전 페이지로 강제 이동"
                            className="flex h-6 items-center gap-1 rounded-full bg-indigo-600 px-2.5 text-[10px] font-black text-white hover:bg-indigo-500 transition cursor-pointer shadow-sm"
                        >
                            <ArrowUp className="h-3 w-3" />
                            <span>{currentPage}p로 올리기</span>
                        </button>
                    )
                )}
                {renderGapControl(id)}
            </div>
        );
    };

    const renderAtomContent = (atom: PrintAtomItem) => {
        switch (atom.type) {
            case 'portfolio-header':
                return (
                    <div data-print-el className="border-b border-slate-200 pb-3">
                        <h1 className="text-lg font-black text-slate-900 sm:text-xl">
                            {caseStudy.title}
                        </h1>
                        {resolved.summary && (
                            <div className="mt-1 text-xs pdf-body-text text-slate-600">
                                {renderInlineText(
                                    'summary',
                                    content.summary,
                                    'text-xs pdf-body-text text-slate-600',
                                    '한줄 요약'
                                )}
                            </div>
                        )}
                    </div>
                );
            case 'portfolio-problem':
                return (
                    <div data-print-el>
                        <h2 className="mb-1.5 text-xs font-black text-slate-900">문제 인식</h2>
                        {renderInlineText(
                            'problem',
                            content.problem,
                            'text-[12px] pdf-body-text text-slate-700',
                            '문제 인식'
                        )}
                    </div>
                );
            case 'portfolio-thought':
                return (
                    <div data-print-el>
                        <h2 className="mb-1.5 text-xs font-black text-slate-900">고민한 것</h2>
                        {renderInlineText(
                            'thoughtProcess',
                            content.thoughtProcess,
                            'text-[12px] pdf-body-text text-slate-700',
                            '고민한 것'
                        )}
                    </div>
                );
            case 'portfolio-tradeoffs-header':
                return (
                    <div data-print-el className="border-b border-slate-200 pb-1">
                        <h2 className="text-xs font-black text-slate-900">트레이드오프</h2>
                    </div>
                );
            case 'portfolio-tradeoff-item': {
                const tradeoff = content.tradeoffs[atom.dataId as number];
                if (!tradeoff) return null;
                return (
                    <div data-print-el className="rounded-lg border border-slate-200 p-2.5">
                        <h3 className="text-[12px] font-black text-slate-900">{tradeoff.option}</h3>
                        <ul className="mt-1 space-y-0.5 text-[11px] pdf-body-text text-slate-600">
                            {tradeoff.pros && <li>+ {tradeoff.pros}</li>}
                            {tradeoff.cons && <li>- {tradeoff.cons}</li>}
                            {tradeoff.chosenBecause && (
                                <li className="font-semibold text-slate-800">
                                    선택 이유: {tradeoff.chosenBecause}
                                </li>
                            )}
                        </ul>
                    </div>
                );
            }
            case 'portfolio-solution':
                return (
                    <div data-print-el>
                        <h2 className="mb-1.5 text-xs font-black text-slate-900">해결</h2>
                        {renderInlineText(
                            'solution',
                            content.solution,
                            'text-[12px] pdf-body-text text-slate-700',
                            '해결'
                        )}
                    </div>
                );
            case 'portfolio-outcome-header':
                return (
                    <div data-print-el className="border-b border-slate-200 pb-1">
                        <h2 className="text-xs font-black text-slate-900">성과</h2>
                    </div>
                );
            case 'portfolio-outcome-summary':
                return (
                    <div data-print-el>
                        {renderInlineText(
                            'outcomeSummary',
                            content.outcome.summary,
                            'text-[12px] pdf-body-text text-slate-700',
                            '성과 요약'
                        )}
                    </div>
                );
            case 'portfolio-outcome-metric': {
                const metric = content.outcome.metrics[atom.dataId as number];
                if (!metric) return null;
                return (
                    <div
                        data-print-el
                        className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px]"
                    >
                        <span className="font-bold text-slate-700">{metric.label}</span>
                        <span className="text-slate-500">
                            {metric.before} →{' '}
                            <span className="font-black text-slate-900">{metric.after}</span>
                        </span>
                    </div>
                );
            }
            case 'portfolio-architecture-header':
                return (
                    <div data-print-el className="border-b border-slate-200 pb-1">
                        <h2 className="text-xs font-black text-slate-900">아키텍처</h2>
                    </div>
                );
            case 'portfolio-architecture-diagram':
                return (
                    <div data-print-el className="text-[11px]">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={resumeMarkdownComponents}
                        >
                            {`\`\`\`mermaid\n${content.architecture.mermaidSource}\n\`\`\``}
                        </ReactMarkdown>
                    </div>
                );
            case 'portfolio-architecture-image': {
                const url = content.architecture.imageUrls[atom.dataId as number];
                if (!url) return null;
                return (
                    <div data-print-el>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt="아키텍처 이미지"
                            className="w-full rounded-lg border border-slate-200"
                        />
                    </div>
                );
            }
            default:
                return null;
        }
    };

    const handlePrint = () => triggerPrint(store.orientation);

    const handleSaveLayout = () => {
        onSaveLayout?.({
            orientation: store.orientation,
            excludedIds: store.excludedIds,
            sectionGaps: store.sectionGaps,
            forcedPageOverrides: store.forcedPageOverrides,
            contentOverrides,
            lineHeight: store.lineHeight,
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950">
            <PrintPreviewBar
                excludedCount={store.excludedIds.length}
                totalPages={pageLayers.length}
                navOpen={false}
                onToggleAll={() => store.setExcludedIds([])}
                onToggleNav={() => {}}
                onSaveServer={adminMode ? handleSaveLayout : undefined}
                onPrint={handlePrint}
                onCancel={onExit}
                zoom={store.zoom}
                onZoomChange={store.setZoom}
                onZoomFit={handleZoomFit}
                lineHeight={store.lineHeight}
                onLineHeightChange={store.setLineHeight}
                hideGuides={store.hideGuides}
                onToggleHideGuides={store.toggleHideGuides}
                inlineEditMode={adminMode ? inlineEditMode : undefined}
                onToggleInlineEditMode={adminMode ? () => setInlineEditMode((v) => !v) : undefined}
            />

            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 print:hidden">
                <LayoutTemplate className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-400">용지 방향</span>
                {(['portrait', 'landscape'] as PageOrientation[]).map((o) => (
                    <button
                        key={o}
                        type="button"
                        onClick={() => store.setOrientation(o)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                            store.orientation === o
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        {orientationLabel[o]}
                    </button>
                ))}
            </div>

            <div
                ref={canvasRef}
                className="relative flex-1 overflow-auto bg-slate-950 py-10"
                style={{ scrollbarGutter: 'stable' }}
            >
                <div
                    className="mx-auto flex flex-col items-center gap-10 transition-transform"
                    style={
                        {
                            transform: `scale(${store.zoom})`,
                            transformOrigin: 'top center',
                            '--print-line-height': store.lineHeight,
                        } as CSSProperties
                    }
                >
                    {pageLayers.map((page) => (
                        <PdfPageLayer
                            key={page.pageIndex}
                            pageIndex={page.pageIndex}
                            totalPages={pageLayers.length}
                            orientation={store.orientation}
                            hideGuides={store.hideGuides}
                        >
                            <div className="portfolio-page flex h-full w-full flex-col gap-3">
                                {page.items.map((atom) => {
                                    const gap = Math.max(0, store.sectionGaps[atom.id] ?? 0);
                                    return (
                                        <Fragment key={atom.id}>
                                            {gap > 0 && (
                                                <div
                                                    aria-hidden
                                                    data-print-gap
                                                    style={{ height: `${gap}px` }}
                                                />
                                            )}
                                            <div data-atom-id={atom.id} className="group relative">
                                                {renderItemControls(atom.id)}
                                                {renderAtomContent(atom)}
                                            </div>
                                        </Fragment>
                                    );
                                })}
                            </div>
                        </PdfPageLayer>
                    ))}
                </div>
            </div>

            {adminMode && (
                <button
                    type="button"
                    onClick={onExit}
                    className="absolute right-4 top-[4.25rem] z-50 hidden h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white print:hidden"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
