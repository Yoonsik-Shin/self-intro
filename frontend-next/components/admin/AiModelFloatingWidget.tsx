'use client';

import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Cpu } from 'lucide-react';
import { AI_MODEL_OPTIONS, type AiModelTagTone } from '@/lib/constants/aiModels';
import { useAiModelStore } from '@/store/useAiModelStore';

const WIDGET_SIZE = 48;
const WIDGET_MARGIN = 24;
const PANEL_WIDTH = 288;
const PANEL_GAP = 10;
const DRAG_THRESHOLD = 4;

const TAG_TONE_CLASS: Record<AiModelTagTone, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-500',
};

/**
 * 관리자 대시보드 어디서든(헤더 레이아웃과 무관하게, 모달 위에도) 떠 있는 기본 AI 모델 선택
 * 위젯. 드래그해서 위치를 옮길 수 있고, 클릭하면 모델 목록이 뜬다 — 개발자도구의 플로팅
 * 인스펙터 아이콘과 같은 상호작용 패턴이다. document.body에 포탈로 그려서 어떤 부모의
 * overflow/z-index에도 영향받지 않는다.
 */
export function AiModelFloatingWidget() {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const modelKey = useAiModelStore((state) => state.modelKey);
    const customModelName = useAiModelStore((state) => state.customModelName);
    const setModelKey = useAiModelStore((state) => state.setModelKey);
    const setCustomModelName = useAiModelStore((state) => state.setCustomModelName);
    const widgetPosition = useAiModelStore((state) => state.widgetPosition);
    const setWidgetPosition = useAiModelStore((state) => state.setWidgetPosition);

    const containerRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<{
        startX: number;
        startY: number;
        originX: number;
        originY: number;
        moved: boolean;
    } | null>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (widgetPosition || typeof window === 'undefined') return;
        setWidgetPosition({
            x: window.innerWidth - WIDGET_SIZE - WIDGET_MARGIN,
            y: window.innerHeight - WIDGET_SIZE - WIDGET_MARGIN,
        });
    }, [widgetPosition, setWidgetPosition]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const position = widgetPosition ?? { x: WIDGET_MARGIN, y: WIDGET_MARGIN };

    function handleDragStart(event: ReactMouseEvent) {
        event.preventDefault();
        dragStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
            moved: false,
        };

        function handleMove(moveEvent: MouseEvent) {
            const dragState = dragStateRef.current;
            if (!dragState) return;
            const dx = moveEvent.clientX - dragState.startX;
            const dy = moveEvent.clientY - dragState.startY;
            if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                dragState.moved = true;
            }
            const maxX = window.innerWidth - WIDGET_SIZE;
            const maxY = window.innerHeight - WIDGET_SIZE;
            setWidgetPosition({
                x: Math.min(Math.max(dragState.originX + dx, 0), Math.max(maxX, 0)),
                y: Math.min(Math.max(dragState.originY + dy, 0), Math.max(maxY, 0)),
            });
        }

        function handleUp() {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            if (dragStateRef.current && !dragStateRef.current.moved) {
                setIsOpen((open) => !open);
            }
            dragStateRef.current = null;
        }

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    }

    if (!mounted) return null;

    const selected = AI_MODEL_OPTIONS.find((option) => option.id === modelKey);
    const openToLeft = position.x + WIDGET_SIZE / 2 > window.innerWidth / 2;
    const openUpward = position.y + WIDGET_SIZE / 2 > window.innerHeight / 2;

    const panelStyle: CSSProperties = {
        position: 'absolute',
        width: PANEL_WIDTH,
        ...(openToLeft ? { right: 0 } : { left: 0 }),
        ...(openUpward ? { bottom: WIDGET_SIZE + PANEL_GAP } : { top: WIDGET_SIZE + PANEL_GAP }),
    };

    return createPortal(
        <div
            ref={containerRef}
            className="fixed z-[10000]"
            style={{ left: position.x, top: position.y }}
        >
            <button
                type="button"
                onMouseDown={handleDragStart}
                title={`기본 AI 모델: ${selected?.name ?? modelKey} (드래그해서 위치 이동)`}
                className={`flex h-12 w-12 cursor-grab items-center justify-center rounded-full border shadow-lg backdrop-blur transition select-none active:cursor-grabbing ${
                    isOpen
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white/95 text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                }`}
            >
                <Cpu className="h-5 w-5" />
            </button>

            {isOpen && (
                <div
                    style={panelStyle}
                    className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                    <div className="px-2 pb-1.5 pt-1 text-[11px] font-bold text-slate-400">
                        기본 AI 모델
                    </div>
                    <div className="max-h-80 space-y-0.5 overflow-y-auto">
                        {AI_MODEL_OPTIONS.map((option) => {
                            const isSelected = option.id === modelKey;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        setModelKey(option.id);
                                        if (option.id !== 'CUSTOM') setIsOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition ${
                                        isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="min-w-0">
                                        <span className="flex items-center gap-1.5">
                                            <span className="truncate text-[13px] font-bold text-slate-800">
                                                {option.name}
                                            </span>
                                            <span
                                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${TAG_TONE_CLASS[option.tagTone]}`}
                                            >
                                                {option.tag}
                                            </span>
                                        </span>
                                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                                            {option.price}
                                        </span>
                                    </span>
                                    {isSelected && (
                                        <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {modelKey === 'CUSTOM' && (
                        <input
                            type="text"
                            value={customModelName}
                            onChange={(event) => setCustomModelName(event.target.value)}
                            placeholder="예: claude-sonnet-5, gpt-5.4-mini"
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                        />
                    )}
                    <p className="mt-2 px-1 text-[11px] leading-relaxed text-slate-400">
                        어필분석·보완프로젝트추천·학습계획·PDF초안·자소서 생성의 기본값입니다. 각
                        화면에서 필요하면 그때그때 다른 모델로 덮어써 실행할 수 있습니다.
                    </p>
                </div>
            )}
        </div>,
        document.body
    );
}
