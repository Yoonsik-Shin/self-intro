import { create } from 'zustand';
import type { PageOrientation } from '@/lib/pdfLayoutEngine';
import { DEFAULT_LINE_HEIGHT } from '@/store/usePrintStore';

/**
 * usePrintStore(이력서)와 같은 상태 shape을 쓰되, 포트폴리오 케이스스터디는 섹션 순서가
 * "문제→고민→트레이드오프→해결→성과" 고정 내러티브라 섹션 드래그 재정렬은 지원하지 않는다.
 * 페이지 분할(강제 배치/간격)과 항목 노출/인라인 문구 편집만 이력서급으로 정밀 제공한다.
 */
type PortfolioPrintState = {
    orientation: PageOrientation;
    zoom: number;
    excludedIds: string[];
    sectionGaps: Record<string, number>;
    lineHeight: number;
    forcedPageOverrides: Record<string, number>;
    atomHeights: Map<string, number>;
    hideGuides: boolean;
    printPending: boolean;

    setOrientation: (orientation: PageOrientation) => void;
    setZoom: (zoom: number) => void;
    toggleExcluded: (id: string) => void;
    setExcludedIds: (ids: string[]) => void;
    setGap: (id: string, px: number) => void;
    setSectionGaps: (gaps: Record<string, number>) => void;
    setLineHeight: (value: number) => void;
    forcePage: (ids: string[], pageIndex: number) => void;
    clearForcedPage: (ids: string[]) => void;
    setForcedPageOverrides: (overrides: Record<string, number>) => void;
    setAtomHeights: (heights: Map<string, number>) => void;
    setHideGuides: (value: boolean) => void;
    toggleHideGuides: () => void;
    setPrintPending: (pending: boolean) => void;
    reset: () => void;
    applyLayout: (settings: {
        excludedIds: string[];
        sectionGaps: Record<string, number>;
        forcedPageOverrides?: Record<string, number>;
        lineHeight?: number;
    }) => void;
};

export const usePortfolioPrintStore = create<PortfolioPrintState>((set, get) => ({
    orientation: 'portrait',
    zoom: 1.0,
    excludedIds: [],
    sectionGaps: {},
    lineHeight: DEFAULT_LINE_HEIGHT,
    forcedPageOverrides: {},
    atomHeights: new Map(),
    hideGuides: false,
    printPending: false,

    setOrientation: (orientation) => set({ orientation }),

    setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.3), 2.0) }),

    toggleExcluded: (id) =>
        set((state) => ({
            excludedIds: state.excludedIds.includes(id)
                ? state.excludedIds.filter((x) => x !== id)
                : [...state.excludedIds, id],
        })),

    setExcludedIds: (ids) => set({ excludedIds: ids }),

    setGap: (id, px) =>
        set((state) => ({ sectionGaps: { ...state.sectionGaps, [id]: Math.max(0, px) } })),

    setSectionGaps: (gaps) => set({ sectionGaps: gaps }),

    setLineHeight: (value) => set({ lineHeight: Math.min(Math.max(value, 1.0), 2.5) }),

    forcePage: (ids, pageIndex) =>
        set((state) => {
            const next = { ...state.forcedPageOverrides };
            ids.forEach((id) => {
                next[id] = pageIndex;
            });
            return { forcedPageOverrides: next };
        }),

    clearForcedPage: (ids) =>
        set((state) => {
            const next = { ...state.forcedPageOverrides };
            ids.forEach((id) => delete next[id]);
            return { forcedPageOverrides: next };
        }),

    setForcedPageOverrides: (overrides) => set({ forcedPageOverrides: overrides }),

    setAtomHeights: (heights) => set({ atomHeights: heights }),

    setHideGuides: (value) => set({ hideGuides: value }),

    toggleHideGuides: () => set({ hideGuides: !get().hideGuides }),

    setPrintPending: (pending) => set({ printPending: pending }),

    reset: () =>
        set({
            excludedIds: [],
            sectionGaps: {},
            lineHeight: DEFAULT_LINE_HEIGHT,
            forcedPageOverrides: {},
            printPending: false,
        }),

    applyLayout: (settings) =>
        set({
            excludedIds: settings.excludedIds || [],
            sectionGaps: settings.sectionGaps || {},
            lineHeight: settings.lineHeight ?? DEFAULT_LINE_HEIGHT,
            forcedPageOverrides: settings.forcedPageOverrides || {},
            printPending: false,
        }),
}));
