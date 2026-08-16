'use client';

import { Fragment, memo, type DragEvent } from 'react';
import { GripVertical, Minus, Plus } from 'lucide-react';
import type { OutputRegion, OutputRow } from '@/lib/printLayoutModel';
import type { PrintAtomItem } from '@/lib/pdfLayoutEngine';
import { usePrintStore } from '@/store/usePrintStore';
import { AtomCard } from './PrintAtomCard';
import { usePrintAtomRenderContext } from './PrintAtomRenderContext';
import { positionFromPointer, usePrintDragContext, type RegionScopeRun } from './PrintDragContext';

function DropIndicatorLine() {
    return (
        <div aria-hidden="true" className="pointer-events-none relative z-20 h-0 print:hidden">
            <div className="absolute inset-x-1 top-0 flex -translate-y-1/2 items-center gap-2">
                <span className="h-0.5 flex-1 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.75)]" />
                <span className="shrink-0 rounded-full border border-blue-300 bg-blue-600 px-2 py-0.5 text-[9px] font-black text-white shadow-lg">
                    여기에 배치
                </span>
                <span className="h-0.5 flex-1 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.75)]" />
            </div>
        </div>
    );
}

export const CanvasAtomRenderer = memo(function CanvasAtomRenderer({
    atom,
    draggable,
    pageIndex,
}: {
    atom: PrintAtomItem;
    draggable: boolean;
    pageIndex: number;
}) {
    const store = usePrintStore();
    const { inlineEditMode } = usePrintAtomRenderContext();
    const {
        touchCanvasDrag,
        hoveredGripAtomId,
        setHoveredGripAtomId,
        draggedCanvasAtomId,
        setDraggedCanvasAtomId,
        isHeaderAtom,
        getRowPairingKey,
        dragOverAtom,
        setDragOverAtom,
        clearDragOverStates,
        placeAtomBeside,
    } = usePrintDragContext();

    return (
        <div
            key={atom.id}
            data-atom-id={atom.id}
            draggable={draggable && atom.id !== 'intro-profile' && !inlineEditMode}
            onDragStart={(event: DragEvent<HTMLDivElement>) => {
                if (!draggable || atom.id === 'intro-profile' || inlineEditMode) {
                    event.preventDefault();
                    return;
                }
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', atom.id);
                const dragPreview = document.createElement('canvas');
                dragPreview.width = 220;
                dragPreview.height = 40;
                const context = dragPreview.getContext('2d');
                if (context) {
                    context.fillStyle = '#0f172a';
                    context.beginPath();
                    context.roundRect(0, 0, 220, 40, 10);
                    context.fill();
                    context.fillStyle = '#ffffff';
                    context.font = '700 13px sans-serif';
                    context.fillText('블록 이동 중', 16, 25);
                }
                event.dataTransfer.setDragImage(dragPreview, 18, 20);
                setDraggedCanvasAtomId(atom.id);
            }}
            onDragEnd={() => {
                setDraggedCanvasAtomId(null);
                clearDragOverStates();
            }}
            onContextMenu={(event) => {
                if (draggable && atom.id !== 'intro-profile' && !inlineEditMode) {
                    event.preventDefault();
                }
            }}
            onMouseEnter={() => setHoveredGripAtomId(atom.id)}
            onMouseLeave={() =>
                setHoveredGripAtomId((current) => (current === atom.id ? null : current))
            }
            className={`group/atom relative w-full min-w-0 rounded-md transition ${
                draggable && atom.id !== 'intro-profile' && !inlineEditMode
                    ? 'cursor-grab active:cursor-grabbing [-webkit-touch-callout:none]'
                    : ''
            } ${
                hoveredGripAtomId === atom.id
                    ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-white'
                    : ''
            }`}
            title={
                draggable && atom.id !== 'intro-profile' && !inlineEditMode
                    ? '항목을 끌어 왼쪽 또는 오른쪽 열로 옮길 수 있습니다.'
                    : undefined
            }
        >
            {draggable &&
                atom.id !== 'intro-profile' &&
                !inlineEditMode &&
                !store.hidePrintGuides && (
                    <span
                        {...touchCanvasDrag.dragHandleProps(atom.id)}
                        title="터치하여 끌면 왼쪽 또는 오른쪽 열로 옮길 수 있습니다."
                        className="absolute -left-4 top-1 z-20 hidden h-5 w-4 touch-none cursor-grab items-center justify-center rounded bg-slate-900/85 text-white shadow-sm group-hover/atom:flex [@media(pointer:coarse)]:left-1 [@media(pointer:coarse)]:flex [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-8 print:hidden"
                    >
                        <GripVertical className="h-3 w-3 [@media(pointer:coarse)]:h-4 [@media(pointer:coarse)]:w-4" />
                    </span>
                )}
            {draggable &&
                atom.id !== 'intro-profile' &&
                !inlineEditMode &&
                draggedCanvasAtomId &&
                draggedCanvasAtomId !== atom.id &&
                !isHeaderAtom(draggedCanvasAtomId) &&
                !atom.isHeader &&
                getRowPairingKey(draggedCanvasAtomId) === getRowPairingKey(atom.id) && (
                    <>
                        {(['left', 'right'] as const).map((side) => {
                            const active =
                                dragOverAtom?.pageIndex === pageIndex &&
                                dragOverAtom.atomId === atom.id &&
                                dragOverAtom.side === side;
                            return (
                                <div
                                    key={side}
                                    {...touchCanvasDrag.dropTargetProps(
                                        `atom:${pageIndex}:${side}:${atom.id}`
                                    )}
                                    className={`absolute inset-y-0 z-40 w-[22%] min-w-10 max-w-20 touch-none print:hidden ${side === 'left' ? 'left-0' : 'right-0'}`}
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        setDragOverAtom({ pageIndex, atomId: atom.id, side });
                                    }}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        event.dataTransfer.dropEffect = 'move';
                                        setDragOverAtom({ pageIndex, atomId: atom.id, side });
                                    }}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        const draggedId =
                                            draggedCanvasAtomId ||
                                            event.dataTransfer.getData('text/plain');
                                        if (draggedId)
                                            placeAtomBeside(pageIndex, draggedId, atom.id, side);
                                        setDraggedCanvasAtomId(null);
                                        clearDragOverStates();
                                    }}
                                >
                                    {active && (
                                        <span
                                            className={`pointer-events-none absolute inset-y-1 flex w-1 items-center rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(59,130,246,0.18)] ${side === 'left' ? 'left-0' : 'right-0'}`}
                                        >
                                            <span
                                                className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-blue-600 px-2 py-1 text-[9px] font-black text-white shadow-lg ${side === 'left' ? 'left-2' : 'right-2'}`}
                                            >
                                                {side === 'left' ? '왼쪽에 배치' : '오른쪽에 배치'}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            <AtomCard atom={atom} />
        </div>
    );
});

export const RegionRunRenderer = memo(function RegionRunRenderer({
    pageIndex,
    region,
    run,
}: {
    pageIndex: number;
    region: OutputRegion;
    run: RegionScopeRun;
}) {
    const store = usePrintStore();
    const {
        draggedCanvasAtomId,
        setDraggedCanvasAtomId,
        getRowPairingKey,
        isHeaderAtom,
        getRowAtomIds,
        getAssociatedAtomIds,
        printableAtoms,
        draggedRowId,
        setDraggedRowId,
        dragOverRun,
        setDragOverRun,
        dragOverRowTarget,
        setDragOverRowTarget,
        touchCanvasDrag,
        touchRowDrag,
        clearDragOverStates,
        moveWholeSectionOnto,
        clampAtomPositionPastHeader,
    } = usePrintDragContext();

    const canDropInRun =
        !!draggedCanvasAtomId && getRowPairingKey(draggedCanvasAtomId) === run.scopeKey;
    // 헤더를 끌고 있고 이 run이 "다른 섹션"의 헤더로 시작하는 run이면, run
    // 자체는 다른 scopeKey라 canDropInRun은 false지만 그 헤더 위에 놓는 건
    // "섹션 전체를 그 섹션 앞/뒤로 옮기기"로 별도 허용한다.
    const isForeignHeaderRun =
        !!draggedCanvasAtomId &&
        isHeaderAtom(draggedCanvasAtomId) &&
        run.atoms[0]?.isHeader === true &&
        run.atoms[0].sectionId !==
            printableAtoms.find((a) => a.id === draggedCanvasAtomId)?.sectionId;
    // 행 그립(왼쪽 끝)으로 행을 끌 때도 그 행이 속한 섹션과 다른 섹션의 헤더
    // 위에 놓으면 같은 "섹션 전체 이동"을 허용한다 — 대부분의 사용자는 헤더를
    // 직접 카드째로 끌기보다 이 행 그립을 먼저 잡기 때문에 이 경로도 필요하다.
    const draggedRowSectionId = draggedRowId
        ? getRowAtomIds(draggedRowId, store.outputLayout)
              .map((id) => printableAtoms.find((a) => a.id === id)?.sectionId)
              .find((v): v is string => v !== undefined)
        : undefined;
    const isForeignHeaderRunForRow =
        !!draggedRowSectionId &&
        run.atoms[0]?.isHeader === true &&
        run.atoms[0].sectionId !== draggedRowSectionId;
    const isRunOver =
        (canDropInRun || isForeignHeaderRun || isForeignHeaderRunForRow) &&
        dragOverRun?.pageIndex === pageIndex &&
        dragOverRun.regionId === region.id &&
        dragOverRun.runIndex === run.runIndex;
    const lastAtomId = run.atoms[run.atoms.length - 1].id;

    return (
        <div key={`run:${region.id}:${run.runIndex}`} className="relative min-w-0">
            {!store.hidePrintGuides && (
                <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 z-10 rounded-md border-2 border-dashed transition print:hidden ${
                        isRunOver
                            ? 'border-blue-500 bg-blue-100/35 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.16)]'
                            : 'border-slate-300/70'
                    }`}
                />
            )}
            <div
                className="relative z-0 flex min-w-0 flex-col"
                {...touchCanvasDrag.dropTargetProps(
                    `run:${pageIndex}:${region.id}:${run.runIndex}:${lastAtomId}`
                )}
                onDragOver={(event) => {
                    if (!canDropInRun) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                    if (!canDropInRun) return;
                    event.preventDefault();
                    const atomId = draggedCanvasAtomId || event.dataTransfer.getData('text/plain');
                    if (atomId) {
                        store.insertAtomsIntoRegion(getAssociatedAtomIds(atomId), region.id, {
                            atomId: lastAtomId,
                            position: 'after',
                        });
                    }
                    setDraggedCanvasAtomId(null);
                    clearDragOverStates();
                }}
            >
                {run.atoms.map((atom) => {
                    const isRowOverThisAtom =
                        !!draggedRowId && dragOverRowTarget?.atomId === atom.id;
                    const isForeignHeaderTarget = isForeignHeaderRun && atom.id === run.atoms[0].id;
                    const isForeignHeaderTargetForRow =
                        isForeignHeaderRunForRow && atom.id === run.atoms[0].id;
                    return (
                        <Fragment key={atom.id}>
                            {((isRunOver &&
                                dragOverRun?.anchorAtomId === atom.id &&
                                dragOverRun.position === 'before') ||
                                (isRowOverThisAtom &&
                                    !isForeignHeaderTargetForRow &&
                                    dragOverRowTarget?.position === 'before')) && (
                                <DropIndicatorLine />
                            )}
                            <div
                                {...(draggedRowId
                                    ? touchRowDrag.dropTargetProps(`atom:${atom.id}`)
                                    : touchCanvasDrag.dropTargetProps(
                                          `run:${pageIndex}:${region.id}:${run.runIndex}:${atom.id}`
                                      ))}
                                onDragEnter={(event) => {
                                    if (draggedRowId || canDropInRun || isForeignHeaderTarget) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                    }
                                }}
                                onDragOver={(event) => {
                                    if (isForeignHeaderTargetForRow) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        event.dataTransfer.dropEffect = 'move';
                                        setDragOverRun({
                                            pageIndex,
                                            regionId: region.id,
                                            runIndex: run.runIndex,
                                            anchorAtomId: atom.id,
                                            position: positionFromPointer(
                                                event.clientY,
                                                event.currentTarget
                                            ),
                                        });
                                        setDragOverRowTarget(null);
                                        return;
                                    }
                                    if (draggedRowId) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        event.dataTransfer.dropEffect = 'move';
                                        setDragOverRowTarget({
                                            atomId: atom.id,
                                            position: positionFromPointer(
                                                event.clientY,
                                                event.currentTarget
                                            ),
                                        });
                                        return;
                                    }
                                    if (isForeignHeaderTarget) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        event.dataTransfer.dropEffect = 'move';
                                        setDragOverRun({
                                            pageIndex,
                                            regionId: region.id,
                                            runIndex: run.runIndex,
                                            anchorAtomId: atom.id,
                                            position: positionFromPointer(
                                                event.clientY,
                                                event.currentTarget
                                            ),
                                        });
                                        return;
                                    }
                                    if (!canDropInRun) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.dataTransfer.dropEffect = 'move';
                                    setDragOverRun({
                                        pageIndex,
                                        regionId: region.id,
                                        runIndex: run.runIndex,
                                        anchorAtomId: atom.id,
                                        position: positionFromPointer(
                                            event.clientY,
                                            event.currentTarget
                                        ),
                                    });
                                }}
                                onDrop={(event) => {
                                    if (isForeignHeaderTargetForRow && draggedRowId) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        const position = positionFromPointer(
                                            event.clientY,
                                            event.currentTarget
                                        );
                                        const anyRowAtomId = getRowAtomIds(
                                            draggedRowId,
                                            store.outputLayout
                                        )[0];
                                        if (anyRowAtomId) {
                                            moveWholeSectionOnto(anyRowAtomId, atom.id, position);
                                        }
                                        setDraggedRowId(null);
                                        clearDragOverStates();
                                        return;
                                    }
                                    if (draggedRowId) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        // 다른 섹션 헤더 위 분기(isForeignHeaderTargetForRow)는
                                        // 위에서 이미 처리됐다 — 여기 도달했다면 "같은 섹션
                                        // 안에서의 위치 재조정"이어야 한다. rowSectionId를
                                        // 못 구하거나 대상 atom의 섹션이 다르면(예: 대상이
                                        // 헤더가 아닌 다른 섹션의 일반 항목) 아무 것도 하지
                                        // 않는다 — 예전엔 여기 가드가 없어서 행이 무관한
                                        // 섹션 region 안으로 섞여 들어가는 버그가 있었다.
                                        const rowAtomIds = getRowAtomIds(
                                            draggedRowId,
                                            store.outputLayout
                                        );
                                        const rowSectionId = rowAtomIds
                                            .map(
                                                (id) =>
                                                    printableAtoms.find((a) => a.id === id)
                                                        ?.sectionId
                                            )
                                            .find((v): v is string => v !== undefined);
                                        if (rowSectionId && rowSectionId === atom.sectionId) {
                                            const position = clampAtomPositionPastHeader(
                                                rowAtomIds,
                                                atom.id,
                                                positionFromPointer(
                                                    event.clientY,
                                                    event.currentTarget
                                                )
                                            );
                                            store.moveRowToAtom(draggedRowId, {
                                                atomId: atom.id,
                                                position,
                                            });
                                        }
                                        setDraggedRowId(null);
                                        clearDragOverStates();
                                        return;
                                    }
                                    if (isForeignHeaderTarget && draggedCanvasAtomId) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        const position = positionFromPointer(
                                            event.clientY,
                                            event.currentTarget
                                        );
                                        moveWholeSectionOnto(
                                            draggedCanvasAtomId,
                                            atom.id,
                                            position
                                        );
                                        setDraggedCanvasAtomId(null);
                                        clearDragOverStates();
                                        return;
                                    }
                                    if (!canDropInRun) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const draggedId =
                                        draggedCanvasAtomId ||
                                        event.dataTransfer.getData('text/plain');
                                    if (draggedId) {
                                        const movingIds = getAssociatedAtomIds(draggedId);
                                        const position = clampAtomPositionPastHeader(
                                            movingIds,
                                            atom.id,
                                            positionFromPointer(event.clientY, event.currentTarget)
                                        );
                                        store.insertAtomsIntoRegion(movingIds, region.id, {
                                            atomId: atom.id,
                                            position,
                                        });
                                    }
                                    setDraggedCanvasAtomId(null);
                                    clearDragOverStates();
                                }}
                            >
                                <CanvasAtomRenderer atom={atom} draggable pageIndex={pageIndex} />
                            </div>
                            {((isRunOver &&
                                dragOverRun?.anchorAtomId === atom.id &&
                                dragOverRun.position === 'after') ||
                                (isRowOverThisAtom &&
                                    !isForeignHeaderTargetForRow &&
                                    dragOverRowTarget?.position === 'after')) && (
                                <DropIndicatorLine />
                            )}
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
});

export const RegionRenderer = memo(function RegionRenderer({
    pageIndex,
    region,
    columnIndex,
    runs,
}: {
    pageIndex: number;
    region: OutputRegion;
    columnIndex: number;
    runs: RegionScopeRun[];
}) {
    const store = usePrintStore();
    const {
        overflowRegionKeys,
        dragOverEmptyRegion,
        setDragOverEmptyRegion,
        touchCanvasDrag,
        draggedCanvasAtomId,
        setDraggedCanvasAtomId,
        getAssociatedAtomIds,
    } = usePrintDragContext();

    const regionKey = `${pageIndex}:${region.id}`;
    const isOverflowing = overflowRegionKeys.includes(regionKey);
    const label = `${columnIndex + 1}번째 열`;

    if (runs.length === 0) {
        // 완전히 빈 region — 어떤 항목이든 받아 새 컬럼을 만들 수 있다(기존 동작).
        const isOver =
            dragOverEmptyRegion?.pageIndex === pageIndex &&
            dragOverEmptyRegion.regionId === region.id;
        return (
            <div
                key={region.id}
                data-output-region-key={regionKey}
                {...touchCanvasDrag.dropTargetProps(`region:${pageIndex}:${region.id}`)}
                className="relative h-full min-w-0 min-h-[24mm] print:min-h-0"
                onDragEnter={(event) => {
                    if (!draggedCanvasAtomId) return;
                    event.preventDefault();
                    setDragOverEmptyRegion({ pageIndex, regionId: region.id });
                }}
                onDragOver={(event) => {
                    if (!draggedCanvasAtomId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverEmptyRegion({ pageIndex, regionId: region.id });
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    const atomId = draggedCanvasAtomId || event.dataTransfer.getData('text/plain');
                    if (atomId) {
                        store.insertAtomsIntoRegion(getAssociatedAtomIds(atomId), region.id, null);
                    }
                    setDraggedCanvasAtomId(null);
                    setDragOverEmptyRegion(null);
                }}
            >
                {!store.hidePrintGuides && (
                    <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 z-10 rounded-md border-2 border-dashed transition print:hidden ${
                            isOverflowing
                                ? 'border-rose-500 bg-rose-50/20'
                                : isOver
                                  ? 'border-blue-500 bg-blue-100/35 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.16)]'
                                  : 'border-slate-300/70'
                        }`}
                    >
                        {isOver && (
                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black text-white shadow-xl">
                                {label}에 배치
                            </span>
                        )}
                        {isOverflowing && (
                            <span className="absolute bottom-1 right-1 rounded bg-rose-600 px-2 py-1 text-[9px] font-black text-white shadow">
                                열 높이 초과
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div key={region.id} data-output-region-key={regionKey} className="relative h-full min-w-0">
            <div className="relative z-0 flex min-w-0 flex-col">
                {runs.map((run) => (
                    <RegionRunRenderer
                        key={`run:${region.id}:${run.runIndex}`}
                        pageIndex={pageIndex}
                        region={region}
                        run={run}
                    />
                ))}
            </div>
            {isOverflowing && !store.hidePrintGuides && (
                <span className="pointer-events-none absolute bottom-1 right-1 z-10 rounded bg-rose-600 px-2 py-1 text-[9px] font-black text-white shadow print:hidden">
                    열 높이 초과
                </span>
            )}
        </div>
    );
});

export const RowRenderer = memo(function RowRenderer({
    pageIndex,
    row,
    rawRegions,
    pageRuns,
}: {
    pageIndex: number;
    row: OutputRow;
    rawRegions: OutputRegion[];
    pageRuns: { runsByRegionId: Map<string, RegionScopeRun[]> } | undefined;
}) {
    const store = usePrintStore();
    const {
        dragOverRow,
        setDragOverRow,
        hoveredGripRowId,
        setHoveredGripRowId,
        hoveredGripAtomId,
        draggedRowId,
        setDraggedRowId,
        draggedCanvasAtomId,
        setDraggedCanvasAtomId,
        touchRowDrag,
        touchCanvasDrag,
        getRowAtomIds,
        getRowPairingKey,
        getAssociatedAtomIds,
        clampRowPositionPastHeader,
        resolveRowToRowMove,
        clearDragOverStates,
    } = usePrintDragContext();

    // 다른 곳으로 옮겨졌거나 인쇄 제외돼 완전히
    // 빈 컬럼은 화면에서 숨긴다. 저장된 구조는
    // 그대로 두고(비파괴적) 렌더링만 걸러서, 콘텐츠가
    // 다시 채워지면 원래 열 배치로 즉시 복원된다.
    const visibleRegions = rawRegions.filter(
        (region) => (pageRuns?.runsByRegionId.get(region.id)?.length ?? 0) > 0
    );
    const regions = visibleRegions.length > 0 ? visibleRegions : rawRegions;
    const isRowDropOver = dragOverRow?.rowId === row.id;
    return (
        <Fragment key={row.id}>
            {isRowDropOver && dragOverRow?.position === 'before' && <DropIndicatorLine />}
            <div
                data-output-row={row.id}
                data-layout-mode={row.layoutMode}
                className={`group/output-row relative grid min-w-0 rounded-md transition ${
                    hoveredGripRowId === row.id ||
                    (hoveredGripAtomId !== null &&
                        getRowAtomIds(row.id, store.outputLayout).includes(hoveredGripAtomId))
                        ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-white'
                        : ''
                }`}
                style={{
                    gridTemplateColumns: regions
                        .map((region) => `${region.widthFraction}fr`)
                        .join(' '),
                    columnGap: `${row.gapMm}mm`,
                }}
                onMouseEnter={() => setHoveredGripRowId(row.id)}
                onMouseLeave={() =>
                    setHoveredGripRowId((current) => (current === row.id ? null : current))
                }
                {...(draggedRowId
                    ? touchRowDrag.dropTargetProps(`row:${pageIndex}:${row.id}`)
                    : regions.length > 1
                      ? touchCanvasDrag.dropTargetProps(`atomrow:${pageIndex}:${row.id}`)
                      : {})}
                onDragOver={(event) => {
                    if (draggedRowId) {
                        if (draggedRowId === row.id) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDragOverRow({
                            rowId: row.id,
                            position: positionFromPointer(event.clientY, event.currentTarget),
                        });
                        return;
                    }
                    if (draggedCanvasAtomId && regions.length > 1) {
                        const rowScopeKey = regions
                            .map((region) => pageRuns?.runsByRegionId.get(region.id)?.[0]?.scopeKey)
                            .find((key) => key !== undefined);
                        if (rowScopeKey && getRowPairingKey(draggedCanvasAtomId) === rowScopeKey) {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            setDragOverRow({
                                rowId: row.id,
                                position: positionFromPointer(event.clientY, event.currentTarget),
                            });
                        }
                    }
                }}
                onDrop={(event) => {
                    if (draggedRowId) {
                        if (draggedRowId === row.id) return;
                        event.preventDefault();
                        const position = positionFromPointer(event.clientY, event.currentTarget);
                        resolveRowToRowMove(draggedRowId, row.id, position);
                        setDraggedRowId(null);
                        setDragOverRow(null);
                        return;
                    }
                    if (draggedCanvasAtomId && regions.length > 1) {
                        event.preventDefault();
                        const movingIds = getAssociatedAtomIds(draggedCanvasAtomId);
                        const position = clampRowPositionPastHeader(
                            movingIds,
                            row.id,
                            positionFromPointer(event.clientY, event.currentTarget)
                        );
                        store.insertAtomsNextToRow(movingIds, row.id, position);
                        setDraggedCanvasAtomId(null);
                        clearDragOverStates();
                        setDragOverRow(null);
                    }
                }}
            >
                {!store.hidePrintGuides && (
                    <span
                        draggable
                        onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', row.id);
                            setDraggedRowId(row.id);
                        }}
                        onDragEnd={() => {
                            setDraggedRowId(null);
                            setDragOverRow(null);
                        }}
                        {...touchRowDrag.dragHandleProps(row.id)}
                        title="이 행 전체를 끌어 위/아래 순서를 바꿉니다."
                        className="absolute -left-4 top-1 z-50 hidden h-5 w-4 touch-none cursor-grab items-center justify-center rounded bg-slate-900/85 text-white shadow-sm group-hover/output-row:flex [@media(pointer:coarse)]:left-1 [@media(pointer:coarse)]:flex [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-8 print:hidden"
                    >
                        <GripVertical className="h-3 w-3 [@media(pointer:coarse)]:h-4 [@media(pointer:coarse)]:w-4" />
                    </span>
                )}
                {!store.hidePrintGuides && (
                    <div className="absolute right-0 top-0 z-50 hidden -translate-y-full items-center gap-1 rounded-t-md bg-slate-950 px-1.5 py-1 shadow-xl group-hover/output-row:flex [@media(hover:none)]:flex print:hidden">
                        {regions.length > 1 && (
                            <button
                                type="button"
                                onClick={() => store.setRowColumnCount(row.id, 1)}
                                className="h-5 rounded px-1.5 text-[9px] font-black text-slate-300 hover:bg-slate-800 hover:text-white"
                                title="이 행의 블록을 다시 세로 한 줄로 합칩니다."
                            >
                                한 줄로 합치기
                            </button>
                        )}
                        {regions.length === 2 && (
                            <label className="flex items-center gap-1 px-1 text-[8px] font-bold text-slate-300">
                                폭
                                <input
                                    type="range"
                                    min={20}
                                    max={80}
                                    value={Math.round(
                                        (regions[0].widthFraction /
                                            (regions[0].widthFraction + regions[1].widthFraction)) *
                                            100
                                    )}
                                    onChange={(event) =>
                                        store.resizeRegionPair(
                                            regions[0].id,
                                            regions[1].id,
                                            Number(event.target.value) / 100
                                        )
                                    }
                                    className="w-16 accent-blue-500"
                                />
                            </label>
                        )}
                        {regions.length > 1 && (
                            <label className="flex items-center gap-1 px-1 text-[8px] font-bold text-slate-300">
                                간격
                                <span className="flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            store.setRowGap(row.id, Math.max(0, row.gapMm - 1))
                                        }
                                        className="grid h-6 w-6 shrink-0 place-items-center rounded border border-slate-600 bg-slate-900 text-white active:bg-slate-700 [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8"
                                    >
                                        <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <input
                                        type="number"
                                        min={0}
                                        max={20}
                                        value={row.gapMm}
                                        onChange={(event) =>
                                            store.setRowGap(row.id, Number(event.target.value))
                                        }
                                        className="h-5 w-9 rounded border border-slate-600 bg-slate-900 px-1 text-center text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            store.setRowGap(row.id, Math.min(20, row.gapMm + 1))
                                        }
                                        className="grid h-6 w-6 shrink-0 place-items-center rounded border border-slate-600 bg-slate-900 text-white active:bg-slate-700 [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8"
                                    >
                                        <Plus className="h-2.5 w-2.5" />
                                    </button>
                                </span>
                            </label>
                        )}
                    </div>
                )}
                {regions.map((region, columnIndex) => (
                    <RegionRenderer
                        key={region.id}
                        pageIndex={pageIndex}
                        region={region}
                        columnIndex={columnIndex}
                        runs={pageRuns?.runsByRegionId.get(region.id) ?? []}
                    />
                ))}
            </div>
            {isRowDropOver && dragOverRow?.position === 'after' && <DropIndicatorLine />}
        </Fragment>
    );
});
