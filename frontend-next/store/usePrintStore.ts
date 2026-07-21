import { create } from 'zustand';
import { reorderablePrintSections, LOCKED_PRINT_SECTION_ID } from '@/lib/printSections';

type DragPosition = 'before' | 'after' | null;

type PrintState = {
  zoom: number;
  printExcludedIds: string[];
  printSectionOrder: string[];
  sectionGaps: Record<string, number>;
  forcedPageOverrides: Record<string, number>;
  hidePrintGuides: boolean;
  navPanelOpen: boolean;
  printPending: boolean;
  draggedSectionId: string | null;
  dragOverSectionId: string | null;
  dragOverPosition: DragPosition;
  atomHeights: Map<string, number>;
  printModalOpen: boolean;
  printModeResolved: boolean;

  setZoom: (zoom: number) => void;
  toggleExcluded: (id: string) => void;
  setExcludedIds: (ids: string[]) => void;
  toggleAllExcluded: () => void;
  reorderSections: (draggedId: string, targetId: string, position?: 'before' | 'after') => void;
  setSectionOrder: (order: string[]) => void;
  setGap: (id: string, px: number) => void;
  setSectionGaps: (gaps: Record<string, number>) => void;
  forcePage: (ids: string[], pageIndex: number) => void;
  clearForcedPage: (ids: string[]) => void;
  setForcedPageOverrides: (overrides: Record<string, number>) => void;
  setHidePrintGuides: (value: boolean) => void;
  toggleHidePrintGuides: () => void;
  setNavPanelOpen: (open: boolean) => void;
  setDragState: (draggedId: string | null, overId: string | null, position: DragPosition) => void;
  setAtomHeights: (heights: Map<string, number>) => void;
  setPrintPending: (pending: boolean) => void;
  setPrintModalOpen: (open: boolean) => void;
  resetManual: () => void;
  applyTemplate: (settings: { excludedIds: string[]; sectionOrder: string[]; sectionGaps: Record<string, number>; forcedPageOverrides?: Record<string, number> }) => void;
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
  forcedPageOverrides: {},
  hidePrintGuides: readHidePrintGuides(),
  navPanelOpen: false,
  printPending: false,
  draggedSectionId: null,
  dragOverSectionId: null,
  dragOverPosition: null,
  atomHeights: new Map(),
  printModalOpen: false,
  printModeResolved: false,

  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.3), 2.0) }),

  toggleExcluded: (id) => {
    if (id === LOCKED_PRINT_SECTION_ID) return;
    set((state) => ({
      printExcludedIds: state.printExcludedIds.includes(id)
        ? state.printExcludedIds.filter((x) => x !== id)
        : [...state.printExcludedIds, id],
    }));
  },

  setExcludedIds: (ids) => set({ printExcludedIds: ids }),

  toggleAllExcluded: () => {
    const { printExcludedIds } = get();
    set({
      printExcludedIds: printExcludedIds.length > 0 ? [] : reorderablePrintSections.map((s) => s.id),
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

  setGap: (id, px) =>
    set((state) => ({
      sectionGaps: { ...state.sectionGaps, [id]: Math.max(0, px) },
    })),

  setSectionGaps: (gaps) => set({ sectionGaps: gaps }),

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

  resetManual: () =>
    set({
      printExcludedIds: [],
      printSectionOrder: reorderablePrintSections.map((s) => s.id),
      sectionGaps: {},
      forcedPageOverrides: {},
      printPending: false,
      printModeResolved: true,
    }),

  applyTemplate: (settings) => {
    const allIds = reorderablePrintSections.map((s) => s.id);
    const orderList = settings.sectionOrder || [];
    const merged = [...orderList.filter((id) => allIds.includes(id)), ...allIds.filter((id) => !orderList.includes(id))];

    set({
      printExcludedIds: settings.excludedIds || [],
      printSectionOrder: merged,
      sectionGaps: settings.sectionGaps || {},
      forcedPageOverrides: settings.forcedPageOverrides || {},
      printPending: false,
      printModeResolved: true,
    });
  },
}));
