'use client';

import { createContext, useContext } from 'react';
import type { useTouchDrag } from '@/hooks/useTouchDrag';
import type { OutputLayout, OutputRow } from '@/lib/printLayoutModel';
import type { PrintAtomItem } from '@/lib/pdfLayoutEngine';

// getRowPairingKey 값이 같은 atom끼리 묶은 연속 구간 — 드래그 드롭 하이라이트/삽입을
// region 전체가 아니라 이 구간(섹션·항목 범위) 단위로 판정하기 위한 파생 타입.
export type RegionScopeRun = {
    regionId: string;
    runIndex: number;
    scopeKey: string;
    atoms: PrintAtomItem[];
};

export function positionFromPointer(clientY: number, element: HTMLElement): 'before' | 'after' {
    const bounds = element.getBoundingClientRect();
    return clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
}

export function positionFromOrder(
    sourceId: string,
    targetId: string,
    orderedIds: string[]
): 'before' | 'after' {
    return orderedIds.indexOf(sourceId) < orderedIds.indexOf(targetId) ? 'after' : 'before';
}

export type PrintDragContextValue = {
    draggedCanvasAtomId: string | null;
    setDraggedCanvasAtomId: (id: string | null) => void;
    dragOverEmptyRegion: { pageIndex: number; regionId: string } | null;
    setDragOverEmptyRegion: (value: { pageIndex: number; regionId: string } | null) => void;
    dragOverRun: {
        pageIndex: number;
        regionId: string;
        runIndex: number;
        anchorAtomId: string;
        position: 'before' | 'after';
    } | null;
    setDragOverRun: (
        value: {
            pageIndex: number;
            regionId: string;
            runIndex: number;
            anchorAtomId: string;
            position: 'before' | 'after';
        } | null
    ) => void;
    dragOverAtom: { pageIndex: number; atomId: string; side: 'left' | 'right' } | null;
    setDragOverAtom: (
        value: { pageIndex: number; atomId: string; side: 'left' | 'right' } | null
    ) => void;
    draggedRowId: string | null;
    setDraggedRowId: (id: string | null) => void;
    dragOverRow: { rowId: string; position: 'before' | 'after' } | null;
    setDragOverRow: (value: { rowId: string; position: 'before' | 'after' } | null) => void;
    dragOverRowTarget: { atomId: string; position: 'before' | 'after' } | null;
    setDragOverRowTarget: (value: { atomId: string; position: 'before' | 'after' } | null) => void;
    hoveredGripRowId: string | null;
    setHoveredGripRowId: (
        updater: string | null | ((current: string | null) => string | null)
    ) => void;
    hoveredGripAtomId: string | null;
    setHoveredGripAtomId: (
        updater: string | null | ((current: string | null) => string | null)
    ) => void;
    overflowRegionKeys: string[];
    touchCanvasDrag: ReturnType<typeof useTouchDrag>;
    touchRowDrag: ReturnType<typeof useTouchDrag>;
    printableAtoms: PrintAtomItem[];
    getRowPairingKey: (atomId: string) => string;
    isHeaderAtom: (atomId: string) => boolean;
    getRowAtomIds: (rowId: string, layout: OutputLayout) => string[];
    getRowSectionId: (rowId: string, layout: OutputLayout) => string | undefined;
    getAssociatedAtomIds: (id: string) => string[];
    placeAtomBeside: (
        pageIndex: number,
        draggedAtomId: string,
        targetAtomId: string,
        side: 'left' | 'right'
    ) => void;
    moveWholeSectionOnto: (
        movingMemberAtomId: string,
        targetHeaderId: string,
        position: 'before' | 'after'
    ) => void;
    clampAtomPositionPastHeader: (
        movingAtomIds: string[],
        anchorAtomId: string,
        position: 'before' | 'after'
    ) => 'before' | 'after';
    clampRowPositionPastHeader: (
        movingAtomIds: string[],
        targetRowId: string,
        position: 'before' | 'after'
    ) => 'before' | 'after';
    clearDragOverStates: () => void;
    resolveRowToRowMove: (
        movingRowId: string,
        targetRowId: string,
        position: 'before' | 'after'
    ) => void;
};

export const PrintDragContext = createContext<PrintDragContextValue | null>(null);

export function usePrintDragContext(): PrintDragContextValue {
    const ctx = useContext(PrintDragContext);
    if (!ctx) {
        throw new Error('usePrintDragContext must be used within PrintDragContext.Provider');
    }
    return ctx;
}

// OutputRow is re-exported here purely so consumers of this context file don't
// need a second import just for the type used in a couple of prop signatures.
export type { OutputRow };
