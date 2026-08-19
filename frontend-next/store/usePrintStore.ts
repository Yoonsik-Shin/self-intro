import { create } from 'zustand';
import { reorderablePrintSections, LOCKED_PRINT_SECTION_ID } from '@/lib/printSections';
import {
    clearAtomPlacements,
    createDefaultOutputLayout,
    createOutputLayoutFromLegacy,
    forceAtomsIntoRegion,
    forceAtomsToPage,
    forceAtomsNextToRow,
    addOutputRow,
    insertAtomsIntoOutputRegion,
    insertAtomsNextToRow,
    mergeAdjacentSingleColumnRows,
    moveRowNextToAtom,
    moveSectionRows,
    placeAtomsInOutputRegion,
    placeAtomsInOutputRegionById,
    replaceOutputPageComposition,
    resizeOutputRegionPair,
    normalizeOutputLayout,
    outputLayoutToForcedPageOverrides,
    setOutputPageMargins,
    setOutputPageLayoutMode,
    setOutputRowColumnCount,
    setOutputRowGap,
    type OutputLayout,
    type OutputLayoutMode,
    type OutputPageMargins,
    type OutputRegionKind,
} from '@/lib/printLayoutModel';

type DragPosition = 'before' | 'after' | null;

/** 프론트 leading-relaxed(Tailwind)와 같은 배수 — 백엔드 PrintTemplate.DEFAULT_LINE_HEIGHT와 동일값. */
export const DEFAULT_LINE_HEIGHT = 1.625;

type PrintState = {
    zoom: number;
    printExcludedIds: string[];
    printSectionOrder: string[];
    sectionGaps: Record<string, number>;
    lineHeight: number;
    forcedPageOverrides: Record<string, number>;
    outputLayout: OutputLayout;
    itemOrderOverrides: Record<string, string[]>;
    hidePrintGuides: boolean;
    navPanelOpen: boolean;
    printPending: boolean;
    draggedSectionId: string | null;
    dragOverSectionId: string | null;
    dragOverPosition: DragPosition;
    atomHeights: Map<string, number>;
    printModalOpen: boolean;
    printModeResolved: boolean;
    autoPrintRequested: boolean;

    setZoom: (zoom: number) => void;
    toggleExcluded: (id: string) => void;
    setExcludedIds: (ids: string[]) => void;
    toggleAllExcluded: () => void;
    reorderSections: (draggedId: string, targetId: string, position?: 'before' | 'after') => void;
    setSectionOrder: (order: string[]) => void;
    reorderItemInScope: (
        scopeId: string,
        currentOrder: string[],
        draggedId: string,
        targetId: string,
        position?: 'before' | 'after'
    ) => void;
    setItemOrderOverrides: (overrides: Record<string, string[]>) => void;
    setGap: (id: string, px: number) => void;
    setSectionGaps: (gaps: Record<string, number>) => void;
    setLineHeight: (value: number) => void;
    forcePage: (ids: string[], pageIndex: number) => void;
    forceIntoRegion: (
        ids: string[],
        regionId: string,
        anchor: { atomId: string; position: 'before' | 'after' } | null
    ) => void;
    forceNextToRow: (ids: string[], targetRowId: string, position: 'before' | 'after') => void;
    clearForcedPage: (ids: string[]) => void;
    setForcedPageOverrides: (overrides: Record<string, number>) => void;
    setOutputLayout: (layout: OutputLayout) => void;
    setPageLayoutMode: (pageIndex: number, mode: OutputLayoutMode) => void;
    placeAtomsInRegion: (ids: string[], pageIndex: number, regionKind: OutputRegionKind) => void;
    placeAtomsInRegionById: (ids: string[], regionId: string) => void;
    insertAtomsIntoRegion: (
        ids: string[],
        regionId: string,
        anchor: { atomId: string; position: 'before' | 'after' } | null
    ) => void;
    moveRowToAtom: (
        rowId: string,
        anchor: { atomId: string; position: 'before' | 'after' }
    ) => void;
    insertAtomsNextToRow: (
        ids: string[],
        targetRowId: string,
        position: 'before' | 'after'
    ) => void;
    moveSectionRows: (
        rowIds: string[],
        anchor: { rowId: string; position: 'before' | 'after' }
    ) => void;
    mergeRows: (rowAId: string, rowBId: string) => void;
    setPageMargins: (margins: Partial<OutputPageMargins>) => void;
    setFontScale: (value: number) => void;
    setFontFamily: (value: string) => void;
    addRow: (pageIndex: number, columnCount: number) => void;
    setRowColumnCount: (rowId: string, columnCount: number) => void;
    setRowGap: (rowId: string, gapMm: number) => void;
    resizeRegionPair: (leftRegionId: string, rightRegionId: string, leftShare: number) => void;
    replacePageComposition: (pageIndex: number, composition: string[][][]) => void;
    setHidePrintGuides: (value: boolean) => void;
    toggleHidePrintGuides: () => void;
    setNavPanelOpen: (open: boolean) => void;
    setDragState: (draggedId: string | null, overId: string | null, position: DragPosition) => void;
    setAtomHeights: (heights: Map<string, number>) => void;
    setPrintPending: (pending: boolean) => void;
    setPrintModalOpen: (open: boolean) => void;
    setAutoPrintRequested: (requested: boolean) => void;
    resetManual: () => void;
    applyTemplate: (settings: {
        excludedIds: string[];
        sectionOrder: string[];
        sectionGaps: Record<string, number>;
        forcedPageOverrides?: Record<string, number>;
        outputLayout?: OutputLayout;
        itemOrderOverrides?: Record<string, string[]>;
        lineHeight?: number;
    }) => void;
};

function readHidePrintGuides(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem('print_hide_guides') === 'true';
    } catch {
        return false;
    }
}

export const usePrintStore = create<PrintState>((set, get) => ({
    zoom: 1.0,
    printExcludedIds: [],
    printSectionOrder: reorderablePrintSections.map((s) => s.id),
    sectionGaps: {},
    lineHeight: DEFAULT_LINE_HEIGHT,
    forcedPageOverrides: {},
    outputLayout: createDefaultOutputLayout(),
    itemOrderOverrides: {},
    hidePrintGuides: readHidePrintGuides(),
    navPanelOpen: false,
    printPending: false,
    draggedSectionId: null,
    dragOverSectionId: null,
    dragOverPosition: null,
    atomHeights: new Map(),
    printModalOpen: false,
    printModeResolved: false,
    autoPrintRequested: false,

    setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.3), 2.0) }),

    toggleExcluded: (id) => {
        if (id === LOCKED_PRINT_SECTION_ID) return;
        set((state) => {
            const isCurrentlyExcluded = state.printExcludedIds.includes(id);
            let nextExcluded: string[];

            if (isCurrentlyExcluded) {
                // Including the section (turning ON): remove parent 'id' and all child item IDs starting with `${id}:` or `${id}-`
                nextExcluded = state.printExcludedIds.filter(
                    (x) => x !== id && !x.startsWith(`${id}:`) && !x.startsWith(`${id}-`)
                );
            } else {
                // Excluding the section (turning OFF): add 'id'
                nextExcluded = [...state.printExcludedIds, id];
            }

            return { printExcludedIds: nextExcluded };
        });
    },

    setExcludedIds: (ids) => set({ printExcludedIds: ids }),

    toggleAllExcluded: () => {
        const { printExcludedIds, printSectionOrder } = get();
        const sectionIds = Array.from(
            new Set([
                ...reorderablePrintSections.map((section) => section.id),
                ...printSectionOrder.filter((id) => id !== LOCKED_PRINT_SECTION_ID),
            ])
        );
        set({
            printExcludedIds: printExcludedIds.length > 0 ? [] : sectionIds,
        });
    },

    reorderSections: (draggedId, targetId, position = 'before') => {
        if (draggedId === targetId) return;
        if (draggedId === LOCKED_PRINT_SECTION_ID || targetId === LOCKED_PRINT_SECTION_ID) return;
        set((state) => {
            const next = state.printSectionOrder.filter((id) => id !== draggedId);
            let targetIndex = next.indexOf(targetId);
            if (position === 'after') targetIndex += 1;
            next.splice(targetIndex, 0, draggedId);
            return { printSectionOrder: next };
        });
    },

    setSectionOrder: (order) => set({ printSectionOrder: order }),

    reorderItemInScope: (scopeId, currentOrder, draggedId, targetId, position = 'before') => {
        if (draggedId === targetId) return;
        set((state) => {
            const base = state.itemOrderOverrides[scopeId] ?? currentOrder;
            const next = base.filter((id) => id !== draggedId);
            let targetIndex = next.indexOf(targetId);
            if (targetIndex === -1) targetIndex = next.length;
            if (position === 'after') targetIndex += 1;
            next.splice(targetIndex, 0, draggedId);
            return {
                itemOrderOverrides: { ...state.itemOrderOverrides, [scopeId]: next },
            };
        });
    },

    setItemOrderOverrides: (overrides) => set({ itemOrderOverrides: overrides }),

    setGap: (id, px) =>
        set((state) => ({
            sectionGaps: { ...state.sectionGaps, [id]: Math.max(0, px) },
        })),

    setSectionGaps: (gaps) => set({ sectionGaps: gaps }),

    setLineHeight: (value) => set({ lineHeight: Math.min(Math.max(value, 1.0), 2.5) }),

    forcePage: (ids, pageIndex) =>
        set((state) => {
            const movableIds = ids.filter((id) => id !== 'intro-profile');
            const outputLayout = forceAtomsToPage(state.outputLayout, movableIds, pageIndex);
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    forceIntoRegion: (ids, regionId, anchor) =>
        set((state) => {
            const movableIds = ids.filter((id) => id !== 'intro-profile');
            const outputLayout = forceAtomsIntoRegion(
                state.outputLayout,
                movableIds,
                regionId,
                anchor
            );
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    forceNextToRow: (ids, targetRowId, position) =>
        set((state) => {
            const movableIds = ids.filter((id) => id !== 'intro-profile');
            const outputLayout = forceAtomsNextToRow(
                state.outputLayout,
                movableIds,
                targetRowId,
                position
            );
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    clearForcedPage: (ids) =>
        set((state) => {
            const outputLayout = clearAtomPlacements(state.outputLayout, ids);
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    setForcedPageOverrides: (overrides) => {
        const outputLayout = createOutputLayoutFromLegacy(overrides);
        set({ forcedPageOverrides: overrides, outputLayout });
    },

    setOutputLayout: (value) => {
        const outputLayout = normalizeOutputLayout(value);
        set({
            outputLayout,
            forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
        });
    },

    setPageLayoutMode: (pageIndex, mode) =>
        set((state) => {
            const outputLayout = setOutputPageLayoutMode(state.outputLayout, pageIndex, mode);
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    placeAtomsInRegion: (ids, pageIndex, regionKind) =>
        set((state) => {
            const movableIds = ids.filter((id) => id !== 'intro-profile');
            const outputLayout = placeAtomsInOutputRegion(
                state.outputLayout,
                movableIds,
                pageIndex,
                regionKind
            );
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    placeAtomsInRegionById: (ids, regionId) =>
        set((state) => {
            const movableIds = ids.filter((id) => id !== 'intro-profile');
            const outputLayout = placeAtomsInOutputRegionById(
                state.outputLayout,
                movableIds,
                regionId
            );
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    insertAtomsIntoRegion: (ids, regionId, anchor) =>
        set((state) => {
            const movableIds = ids.filter((id) => id !== 'intro-profile');
            const outputLayout = insertAtomsIntoOutputRegion(
                state.outputLayout,
                movableIds,
                regionId,
                anchor
            );
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    moveRowToAtom: (rowId, anchor) =>
        set((state) => {
            const outputLayout = moveRowNextToAtom(state.outputLayout, rowId, anchor);
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    insertAtomsNextToRow: (ids, targetRowId, position) =>
        set((state) => {
            const movableIds = ids.filter((id) => id !== 'intro-profile');
            const outputLayout = insertAtomsNextToRow(
                state.outputLayout,
                movableIds,
                targetRowId,
                position
            );
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    moveSectionRows: (rowIds, anchor) =>
        set((state) => {
            const outputLayout = moveSectionRows(state.outputLayout, rowIds, anchor);
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    mergeRows: (rowAId, rowBId) =>
        set((state) => {
            const outputLayout = mergeAdjacentSingleColumnRows(state.outputLayout, rowAId, rowBId);
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    setPageMargins: (margins) =>
        set((state) => ({ outputLayout: setOutputPageMargins(state.outputLayout, margins) })),

    setFontScale: (value) =>
        set((state) => ({
            outputLayout: normalizeOutputLayout({
                ...state.outputLayout,
                fontScale: value,
            }),
        })),

    setFontFamily: (value) =>
        set((state) => ({
            outputLayout: normalizeOutputLayout({
                ...state.outputLayout,
                fontFamily: value,
            }),
        })),

    addRow: (pageIndex, columnCount) =>
        set((state) => ({
            outputLayout: addOutputRow(state.outputLayout, pageIndex, columnCount),
        })),

    setRowColumnCount: (rowId, columnCount) =>
        set((state) => ({
            outputLayout: setOutputRowColumnCount(state.outputLayout, rowId, columnCount),
        })),

    setRowGap: (rowId, gapMm) =>
        set((state) => ({ outputLayout: setOutputRowGap(state.outputLayout, rowId, gapMm) })),

    resizeRegionPair: (leftRegionId, rightRegionId, leftShare) =>
        set((state) => ({
            outputLayout: resizeOutputRegionPair(
                state.outputLayout,
                leftRegionId,
                rightRegionId,
                leftShare
            ),
        })),

    replacePageComposition: (pageIndex, composition) =>
        set((state) => {
            const outputLayout = replaceOutputPageComposition(
                state.outputLayout,
                pageIndex,
                composition
            );
            return {
                outputLayout,
                forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            };
        }),

    setHidePrintGuides: (value) => {
        try {
            localStorage.setItem('print_hide_guides', String(value));
        } catch {
            // ignore
        }
        set({ hidePrintGuides: value });
    },

    toggleHidePrintGuides: () => {
        const next = !get().hidePrintGuides;
        get().setHidePrintGuides(next);
    },

    setNavPanelOpen: (open) => set({ navPanelOpen: open }),

    setDragState: (draggedSectionId, dragOverSectionId, dragOverPosition) =>
        set({ draggedSectionId, dragOverSectionId, dragOverPosition }),

    setAtomHeights: (heights) => set({ atomHeights: heights }),

    setPrintPending: (pending) => set({ printPending: pending }),

    setPrintModalOpen: (open) => set({ printModalOpen: open }),

    setAutoPrintRequested: (requested) => set({ autoPrintRequested: requested }),

    resetManual: () =>
        set({
            printExcludedIds: [],
            printSectionOrder: reorderablePrintSections.map((s) => s.id),
            sectionGaps: {},
            lineHeight: DEFAULT_LINE_HEIGHT,
            forcedPageOverrides: {},
            outputLayout: createDefaultOutputLayout(),
            itemOrderOverrides: {},
            printPending: false,
            printModeResolved: true,
        }),

    applyTemplate: (settings) => {
        const orderList = settings.sectionOrder || [];
        const customIds = orderList.filter((id) => id.startsWith('custom-section:'));
        const allIds = [...reorderablePrintSections.map((s) => s.id), ...customIds];
        const merged = [
            ...orderList.filter((id) => allIds.includes(id)),
            ...allIds.filter((id) => !orderList.includes(id)),
        ];

        const overrides = { ...(settings.forcedPageOverrides || {}) };
        delete overrides['intro-profile'];
        const outputLayout = settings.outputLayout
            ? normalizeOutputLayout(settings.outputLayout)
            : createOutputLayoutFromLegacy(overrides);

        set({
            printExcludedIds: settings.excludedIds || [],
            printSectionOrder: merged,
            sectionGaps: settings.sectionGaps || {},
            lineHeight: settings.lineHeight ?? DEFAULT_LINE_HEIGHT,
            forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
            outputLayout,
            itemOrderOverrides: settings.itemOrderOverrides || {},
            printPending: false,
            printModeResolved: true,
        });
    },
}));

// 임시 디버그 훅 — 실 데이터로 재현 안 되는 버그 진단용. 콘솔에서:
// copy(JSON.stringify(__printStore.getState().outputLayout))
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    (window as unknown as { __printStore?: typeof usePrintStore }).__printStore = usePrintStore;
}
