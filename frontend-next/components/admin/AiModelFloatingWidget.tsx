'use client';

import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Cpu } from 'lucide-react';
import {
    AI_MODEL_OPTIONS,
    PROVIDER_BRAND_PATH,
    PROVIDER_COLOR,
    PROVIDER_FALLBACK_ICON,
    type AiModelProvider,
    type AiModelTagTone,
} from '@/lib/constants/aiModels';
import { useAiModelStore } from '@/store/useAiModelStore';

const WIDGET_SIZE = 32;
const PANEL_WIDTH = 288;
const PANEL_GAP = 10;
const TOOLTIP_GAP = 8;
const DRAG_THRESHOLD = 4;
// 드래그 중 위젯 중심이 도킹 표식으로부터 이 거리 안으로 들어오면 "자석처럼 달라붙을 준비됨"으로
// 표시하고, 그 상태에서 놓으면 헤더 제자리로 복귀한다(이미지 업로드 드롭존과 같은 느낌).
const SNAP_DISTANCE = 64;

const TAG_TONE_CLASS: Record<AiModelTagTone, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-500',
};

/** 실제 회사 로고가 있으면 그 SVG를, 없으면(GPT/커스텀) lucide 아이콘을 그린다. */
function ProviderMark({ provider, className }: { provider: AiModelProvider; className?: string }) {
    const brandPath = PROVIDER_BRAND_PATH[provider];
    if (brandPath) {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
                <path d={brandPath} />
            </svg>
        );
    }
    const FallbackIcon = PROVIDER_FALLBACK_ICON[provider] ?? Cpu;
    return <FallbackIcon className={className} />;
}

type Point = { x: number; y: number };

/**
 * 기본으로는 관리자 대시보드 헤더의 다른 버튼들과 똑같이 그 자리에 그대로 있는(문서 흐름을 따르는)
 * AI 모델 선택 버튼이다. 드래그하는 순간에만 "탈착"돼 화면 어디로든 자유롭게 옮길 수 있는
 * position:fixed 위젯으로 바뀌고, 그 뒤로는 놓은 자리에 계속 머문다. 예외 둘: (1) 자소서 드로어처럼
 * 자기만의 모델 선택 UI가 있는 화면이 닫혀 이 위젯이 다시 필요해지는 순간(숨김→노출 전환),
 * (2) 드래그하다 헤더 제자리 근처에서 놓으면 이미지 업로드 드롭존처럼 자석으로 달라붙어 도킹
 * 상태로 복귀한다 — "제자리"는 별도 표식 엘리먼트가 아니라, 도킹 상태일 때 이 버튼 자신이 실제로
 * 렌더링된 위치(homeRef)를 그대로 기준으로 삼는다(별도 표식은 flex gap 계산이 미묘하게 어긋나
 * 실제 버튼 위치와 안 맞는 문제가 있었다).
 */
export function AiModelFloatingWidget() {
    const [mounted, setMounted] = useState(false);
    const [mode, setMode] = useState<'docked' | 'floating'>('docked');
    const [floatingPosition, setFloatingPosition] = useState<Point | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isNearDock, setIsNearDock] = useState(false);

    const [dockHomePosition, setDockHomePosition] = useState<Point | null>(null);

    const modelKey = useAiModelStore((state) => state.modelKey);
    const customModelName = useAiModelStore((state) => state.customModelName);
    const setModelKey = useAiModelStore((state) => state.setModelKey);
    const setCustomModelName = useAiModelStore((state) => state.setCustomModelName);
    const suppressFloatingWidget = useAiModelStore((state) => state.suppressFloatingWidget);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wasSuppressedRef = useRef(false);
    const nearDockRef = useRef(false);
    const autoFloatedRef = useRef(false);
    const userDraggedRef = useRef(false);
    const modeRef = useRef(mode);

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    // 도킹 상태일 때 버튼이 실제로 있는 화면 좌표 — 드래그 스냅/마커의 기준점이다. 도킹 중엔 계속
    // 최신 값으로 갱신되고(리사이즈 등으로 헤더가 움직여도 따라감), 탈착된 뒤에는 마지막으로 도킹돼
    // 있던 좌표가 그대로 남아 "제자리"로 쓰인다.
    const homeRef = useRef<Point | null>(null);
    const dragStateRef = useRef<{
        startX: number;
        startY: number;
        originX: number;
        originY: number;
        moved: boolean;
    } | null>(null);

    useEffect(() => {
        // Portal은 브라우저 DOM이 준비된 뒤에만 렌더링한다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    // 도킹 상태인 동안 버튼의 실제 위치를 계속 홈 좌표로 동기화한다. mode만 의존성으로 두면 첫
    // 렌더(mounted=false라 아직 아무것도 안 그려져 buttonRef가 비어있는 순간)에 한 번 실행되고,
    // 그 다음 mounted가 true로 바뀌어 버튼이 실제로 그려져도 mode 값 자체는 안 바뀌었으니 이 effect가
    // 다시 안 돌아 homeRef가 영영 null로 남는다 — mounted도 의존성에 넣어야 그 시점에 다시 잡힌다.
    useEffect(() => {
        if (!mounted || mode !== 'docked') return;
        function syncHome() {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) homeRef.current = { x: rect.left, y: rect.top };
        }
        syncHome();
        window.addEventListener('resize', syncHome);
        return () => window.removeEventListener('resize', syncHome);
    }, [mounted, mode]);

    // 수집된 공고 상세 등 드로어/모달/팝업 창(fixed inset-0 오버레이)이 열렸는지 감지하여,
    // 한 번도 수동 드래그를 안 한 docked 상태이면 자동으로 floating(fixed portal) 모드로 변환한다.
    useEffect(() => {
        if (!mounted) return;

        function isOverlayOrPopupPresent(): boolean {
            if (typeof document === 'undefined') return false;
            const dialogs = document.querySelectorAll(
                '[role="dialog"], [aria-modal="true"], [data-modal="true"], [data-popup="true"]'
            );
            for (let i = 0; i < dialogs.length; i++) {
                const el = dialogs[i] as HTMLElement;
                const style = window.getComputedStyle(el);
                if (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0'
                ) {
                    return true;
                }
            }
            const fixedElements = document.querySelectorAll(
                '.fixed.inset-0, [class*="fixed"][class*="inset-0"]'
            );
            for (let i = 0; i < fixedElements.length; i++) {
                const el = fixedElements[i] as HTMLElement;
                if (el.closest('[data-ai-widget="true"]')) continue;
                const style = window.getComputedStyle(el);
                if (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0'
                ) {
                    return true;
                }
            }
            return false;
        }

        function checkAndToggleAutoFloating() {
            const popupPresent = isOverlayOrPopupPresent();

            if (popupPresent) {
                if (modeRef.current === 'docked' && !userDraggedRef.current) {
                    const rect = buttonRef.current?.getBoundingClientRect();
                    if (rect && (rect.left > 0 || rect.top > 0)) {
                        setFloatingPosition({ x: rect.left, y: rect.top });
                    } else if (homeRef.current) {
                        setFloatingPosition(homeRef.current);
                    }
                    setMode('floating');
                    autoFloatedRef.current = true;
                }
            } else {
                if (autoFloatedRef.current && !userDraggedRef.current) {
                    setMode('docked');
                    setFloatingPosition(null);
                    autoFloatedRef.current = false;
                }
            }
        }

        checkAndToggleAutoFloating();

        const observer = new MutationObserver(() => {
            checkAndToggleAutoFloating();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'aria-hidden'],
        });

        return () => observer.disconnect();
    }, [mounted]);

    // 자기만의 모델 선택 UI가 있는 화면(자소서 드로어 등)이 열려 숨겨졌다가 닫혀서 다시 필요해지는
    // 순간에만 헤더 자리로 되돌아온다. 드래그해서 옮긴 위치는 그 전까지는 그대로 유지된다.
    useEffect(() => {
        if (wasSuppressedRef.current && !suppressFloatingWidget) {
            setMode('docked');
            setFloatingPosition(null);
            autoFloatedRef.current = false;
            userDraggedRef.current = false;
        }
        wasSuppressedRef.current = suppressFloatingWidget;
    }, [suppressFloatingWidget]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [isOpen]);

    function handleDragStart(event: ReactPointerEvent<HTMLButtonElement>) {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pointerId = event.pointerId;
        event.preventDefault();
        setMode('floating');
        setFloatingPosition({ x: rect.left, y: rect.top });
        setIsDragging(true);
        setDockHomePosition(homeRef.current);
        dragStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: rect.left,
            originY: rect.top,
            moved: false,
        };

        function handleMove(moveEvent: PointerEvent) {
            if (moveEvent.pointerId !== pointerId) return;
            const dragState = dragStateRef.current;
            if (!dragState) return;
            const dx = moveEvent.clientX - dragState.startX;
            const dy = moveEvent.clientY - dragState.startY;
            if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                dragState.moved = true;
            }
            const maxX = window.innerWidth - WIDGET_SIZE;
            const maxY = window.innerHeight - WIDGET_SIZE;
            const nextX = Math.min(Math.max(dragState.originX + dx, 0), Math.max(maxX, 0));
            const nextY = Math.min(Math.max(dragState.originY + dy, 0), Math.max(maxY, 0));
            setFloatingPosition({ x: nextX, y: nextY });

            const home = homeRef.current;
            const near = home ? Math.hypot(nextX - home.x, nextY - home.y) < SNAP_DISTANCE : false;
            nearDockRef.current = near;
            setIsNearDock(near);
        }

        function handleUp(upEvent: PointerEvent) {
            if (upEvent.pointerId !== pointerId) return;
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
            if (upEvent.type !== 'pointercancel') {
                if (dragStateRef.current && !dragStateRef.current.moved) {
                    setIsOpen((open) => !open);
                } else if (nearDockRef.current) {
                    setMode('docked');
                    setFloatingPosition(null);
                    userDraggedRef.current = false;
                    autoFloatedRef.current = false;
                } else if (dragStateRef.current?.moved) {
                    userDraggedRef.current = true;
                    autoFloatedRef.current = false;
                }
            }
            dragStateRef.current = null;
            nearDockRef.current = false;
            setIsNearDock(false);
            setIsDragging(false);
            setDockHomePosition(null);
        }

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
    }

    if (!mounted) return null;
    // 도킹 상태는 헤더(z-30) 안에 실제로 존재해서, 그 위를 덮는 모달(z-[9999])이 뜨면 알아서
    // 가려진다 — 굳이 렌더를 끌 필요가 없다. "탈착"된 상태(z-10000, 모달 위까지 뜸)만 숨긴다.
    if (mode === 'floating' && suppressFloatingWidget) return null;

    const selected = AI_MODEL_OPTIONS.find((option) => option.id === modelKey);
    const badgeColor = selected ? PROVIDER_COLOR[selected.provider] : PROVIDER_COLOR.custom;
    const showTooltip = isHovering && !isOpen && !isDragging;
    const dockHome = isDragging ? dockHomePosition : null;

    const refX =
        floatingPosition?.x ?? (typeof window !== 'undefined' ? window.innerWidth - 120 : 0);
    const refY = floatingPosition?.y ?? 16;
    const openToLeft =
        refX + WIDGET_SIZE / 2 > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);
    const openUpward =
        refY + WIDGET_SIZE / 2 > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);

    const panelStyle: CSSProperties = {
        position: 'absolute',
        width: PANEL_WIDTH,
        zIndex: 50,
        ...(openToLeft ? { right: 0 } : { left: 0 }),
        ...(openUpward ? { bottom: WIDGET_SIZE + PANEL_GAP } : { top: WIDGET_SIZE + PANEL_GAP }),
    };

    const tooltipStyle: CSSProperties = {
        position: 'absolute',
        zIndex: 50,
        ...(openToLeft ? { right: 0 } : { left: 0 }),
        ...(openUpward
            ? { bottom: WIDGET_SIZE + TOOLTIP_GAP }
            : { top: WIDGET_SIZE + TOOLTIP_GAP }),
    };

    const buttonEl = (
        <button
            ref={buttonRef}
            type="button"
            onPointerDown={handleDragStart}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            aria-label={`기본 AI 모델: ${selected?.name ?? modelKey}`}
            style={{ height: WIDGET_SIZE, width: WIDGET_SIZE, backgroundColor: badgeColor }}
            className={`relative flex touch-none cursor-grab items-center justify-center rounded-full text-white shadow-lg ring-2 ring-white transition select-none active:cursor-grabbing ${
                isNearDock ? 'scale-125 ring-4 ring-indigo-400' : isOpen ? 'ring-slate-900' : ''
            }`}
        >
            <ProviderMark provider={selected?.provider ?? 'custom'} className="h-3.5 w-3.5" />
            {selected && (
                <span className="absolute -right-1 -bottom-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-white bg-white px-0.5 text-[8px] leading-none font-semibold text-slate-700 shadow">
                    {selected.versionBadge}
                </span>
            )}
        </button>
    );

    // 드래그하는 동안 "여기다 놓으면 도킹된다"는 목표 지점을 헤더 제자리에 직접 표시한다 —
    // 가까워지면(isNearDock) 점선이 채워진 원으로 바뀌어 자석처럼 붙을 준비가 됐음을 알려준다.
    const dockMarkerEl = dockHome && (
        <div
            className={`pointer-events-none fixed z-[9999] rounded-full border-2 border-dashed transition-all ${
                isNearDock
                    ? 'scale-110 border-indigo-500 bg-indigo-100/70'
                    : 'border-slate-300 bg-slate-100/50'
            }`}
            style={{
                left: dockHome.x,
                top: dockHome.y,
                width: WIDGET_SIZE,
                height: WIDGET_SIZE,
            }}
        />
    );

    const tooltipEl = showTooltip && (
        <div
            style={tooltipStyle}
            className="pointer-events-none whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
        >
            <div className="flex items-center gap-1.5 font-bold">
                <Cpu className="h-3 w-3 text-indigo-300" />
                {selected?.name ?? modelKey}
            </div>
            <div className="mt-0.5 text-[10px] font-medium text-slate-300">
                기본 AI 모델 · 클릭해서 변경 · 드래그해서 이동
            </div>
        </div>
    );

    const panelEl = isOpen && (
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
                            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                                isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                            }`}
                        >
                            <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                                style={{ backgroundColor: PROVIDER_COLOR[option.provider] }}
                            >
                                <ProviderMark provider={option.provider} className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
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
                            {isSelected && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
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
                어필분석·보완프로젝트추천·학습계획·PDF초안·자소서 생성의 기본값입니다. 각 화면에서
                필요하면 그때그때 다른 모델로 덮어써 실행할 수 있습니다.
            </p>
        </div>
    );

    if (mode === 'docked') {
        return (
            <div
                ref={containerRef}
                data-ai-widget="true"
                className="relative mr-2 inline-flex shrink-0"
                style={{ width: WIDGET_SIZE, height: WIDGET_SIZE }}
            >
                {buttonEl}
                {tooltipEl}
                {panelEl}
            </div>
        );
    }

    return createPortal(
        <>
            {dockMarkerEl}
            <div
                ref={containerRef}
                data-ai-widget="true"
                className="fixed z-[10000]"
                style={{ left: floatingPosition?.x ?? 0, top: floatingPosition?.y ?? 0 }}
            >
                {buttonEl}
                {tooltipEl}
                {panelEl}
            </div>
        </>,
        document.body
    );
}
