'use client';

import { useState, type HTMLAttributes } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    GripVertical,
    ListChecks,
    Lock,
    Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTouchDrag } from '@/hooks/useTouchDrag';

type PrintPreviewNavSection = {
    id: string;
    label: string;
    icon: LucideIcon;
};

export type PrintPreviewNavItem = {
    id: string;
    label: string;
    /** 이 항목의 자식들을 재정렬할 때 쓰이는 scope id. 생략 시 item.id를 사용한다. */
    scopeId?: string;
    children?: PrintPreviewNavItem[];
};

type PrintPreviewNavItemGroup = {
    sectionId: string;
    /** 이 그룹의 최상위 items를 재정렬할 때 쓰이는 scope id. */
    scopeId: string;
    items: PrintPreviewNavItem[];
};

type PrintPreviewNavProps = {
    sections: PrintPreviewNavSection[];
    excludedIds: string[];
    itemGroups: PrintPreviewNavItemGroup[];
    lockedSectionIds: string[];
    open: boolean;
    onRequestToggle: () => void;
    onToggle: (id: string) => void;
    onReorder: (draggedId: string, targetId: string, position?: DropPosition) => void;
    onReorderItem: (
        scopeId: string,
        siblingIds: string[],
        draggedId: string,
        targetId: string,
        position?: DropPosition
    ) => void;
    onNavigate: (id: string) => void;
    onToggleAll?: () => void;
    excludedCount?: number;
    onAddCustomSection?: () => void;
};

type DropPosition = 'before' | 'after';

function positionFromPointer(clientY: number, element: HTMLElement): DropPosition {
    const bounds = element.getBoundingClientRect();
    return clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
}

function positionFromOrder(sourceId: string, targetId: string, orderedIds: string[]): DropPosition {
    return orderedIds.indexOf(sourceId) < orderedIds.indexOf(targetId) ? 'after' : 'before';
}

function DropIndicator({ depth = 0 }: { depth?: number }) {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none relative z-20 h-0 px-1"
            style={{ marginLeft: depth * 14 }}
        >
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

const touchItemKey = (scopeId: string, itemId: string, siblingIds: string[]) =>
    JSON.stringify([scopeId, itemId, siblingIds]);

function parseTouchItemKey(key: string): [string, string, string[]] | null {
    try {
        const parsed: unknown = JSON.parse(key);
        if (
            Array.isArray(parsed) &&
            parsed.length === 3 &&
            typeof parsed[0] === 'string' &&
            typeof parsed[1] === 'string' &&
            Array.isArray(parsed[2]) &&
            parsed[2].every((id) => typeof id === 'string')
        ) {
            return [parsed[0], parsed[1], parsed[2]];
        }
    } catch {
        // Ignore malformed data attributes from outside this drag zone.
    }
    return null;
}

function ToggleSwitch({
    on,
    onClick,
    size = 'md',
}: {
    on: boolean;
    onClick: () => void;
    size?: 'sm' | 'md';
}) {
    const track = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
    const knob = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    const knobOn = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            aria-pressed={on}
            className={`relative shrink-0 rounded-full transition-colors ${track} ${on ? 'bg-blue-500' : 'bg-slate-700'}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 rounded-full bg-white transition-transform ${knob} ${on ? knobOn : 'translate-x-0'}`}
            />
        </button>
    );
}

/** 항목(경력사/프로젝트/자격증 등) → 하위 항목(세부 불릿) 트리를 재귀적으로 렌더링.
 *  각 레벨은 자신의 형제들끼리 드래그로 순서를 바꿀 수 있고, 토글로 인쇄 포함/제외를 켤 수 있다. */
function NavTreeNode({
    item,
    depth,
    scopeId,
    siblingIds,
    excludedIds,
    collapsedIds,
    onToggleCollapse,
    onToggle,
    onReorderItem,
    onNavigate,
    draggedId,
    dragOverId,
    dragOverPosition,
    onDragStateChange,
    touchDragHandleProps,
    touchDropTargetProps,
}: {
    item: PrintPreviewNavItem;
    depth: number;
    scopeId: string;
    siblingIds: string[];
    excludedIds: string[];
    collapsedIds: string[];
    onToggleCollapse: (id: string) => void;
    onToggle: (id: string) => void;
    onReorderItem: (
        scopeId: string,
        siblingIds: string[],
        draggedId: string,
        targetId: string,
        position?: DropPosition
    ) => void;
    onNavigate: (id: string) => void;
    draggedId: string | null;
    dragOverId: string | null;
    dragOverPosition: DropPosition | null;
    onDragStateChange: (
        draggedId: string | null,
        dragOverId: string | null,
        position: DropPosition | null
    ) => void;
    touchDragHandleProps: (sourceId: string) => HTMLAttributes<HTMLElement>;
    touchDropTargetProps: (targetId: string) => HTMLAttributes<HTMLElement>;
}) {
    const excluded = excludedIds.includes(item.id);
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isCollapsed = collapsedIds.includes(item.id);
    const isDraggingThis = draggedId === item.id;
    const isOverThis = dragOverId === item.id;
    const childScopeId = item.scopeId ?? item.id;
    const childIds = item.children?.map((c) => c.id) ?? [];
    const itemTouchKey = touchItemKey(scopeId, item.id, siblingIds);

    return (
        <div>
            {isOverThis && dragOverPosition === 'before' && <DropIndicator depth={depth} />}
            <div
                {...touchDropTargetProps(itemTouchKey)}
                draggable
                onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('text/plain', item.id);
                    onDragStateChange(item.id, null, null);
                }}
                onDragEnd={() => onDragStateChange(null, null, null)}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedId && draggedId !== item.id) {
                        onDragStateChange(
                            draggedId,
                            item.id,
                            positionFromPointer(e.clientY, e.currentTarget)
                        );
                    }
                }}
                onDragLeave={(e) => {
                    e.stopPropagation();
                    if (
                        dragOverId === item.id &&
                        !e.currentTarget.contains(e.relatedTarget as Node | null)
                    ) {
                        onDragStateChange(draggedId, null, null);
                    }
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fromId = e.dataTransfer.getData('text/plain') || draggedId;
                    if (fromId && fromId !== item.id) {
                        onReorderItem(
                            scopeId,
                            siblingIds,
                            fromId,
                            item.id,
                            dragOverPosition ?? positionFromPointer(e.clientY, e.currentTarget)
                        );
                    }
                    onDragStateChange(null, null, null);
                }}
                onClick={() => onNavigate(item.id)}
                style={{ paddingLeft: 6 + depth * 14 }}
                className={`group flex items-center gap-1.5 rounded-lg py-1.5 pr-2 cursor-pointer text-[11px] transition ${
                    isDraggingThis ? 'opacity-30' : ''
                } ${isOverThis ? 'ring-1 ring-blue-500 bg-blue-500/10' : 'hover:bg-slate-800/60'}`}
            >
                <span
                    {...touchDragHandleProps(itemTouchKey)}
                    onClick={(event) => event.stopPropagation()}
                    className="grid h-5 w-4 shrink-0 touch-none place-items-center text-slate-600 group-hover:text-slate-300 cursor-grab active:cursor-grabbing"
                    title="드래그 또는 터치하여 순서 변경"
                >
                    <GripVertical className="h-3 w-3" />
                </span>
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse(item.id);
                        }}
                        className="shrink-0 p-0.5 text-slate-400 hover:text-white"
                        title={isCollapsed ? '하위 항목 펼치기' : '하위 항목 접기'}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-3 w-3" />
                        ) : (
                            <ChevronDown className="h-3 w-3" />
                        )}
                    </button>
                ) : (
                    <span className="w-3.5 shrink-0" />
                )}
                <span
                    className={`flex-1 truncate ${excluded ? 'text-slate-500 line-through' : 'text-slate-300'}`}
                >
                    {item.label}
                </span>
                <ToggleSwitch size="sm" on={!excluded} onClick={() => onToggle(item.id)} />
            </div>

            {hasChildren && !isCollapsed && (
                <div>
                    {item.children!.map((child) => (
                        <NavTreeNode
                            key={child.id}
                            item={child}
                            depth={depth + 1}
                            scopeId={childScopeId}
                            siblingIds={childIds}
                            excludedIds={excludedIds}
                            collapsedIds={collapsedIds}
                            onToggleCollapse={onToggleCollapse}
                            onToggle={onToggle}
                            onReorderItem={onReorderItem}
                            onNavigate={onNavigate}
                            draggedId={draggedId}
                            dragOverId={dragOverId}
                            dragOverPosition={dragOverPosition}
                            onDragStateChange={onDragStateChange}
                            touchDragHandleProps={touchDragHandleProps}
                            touchDropTargetProps={touchDropTargetProps}
                        />
                    ))}
                </div>
            )}
            {isOverThis && dragOverPosition === 'after' && <DropIndicator depth={depth} />}
        </div>
    );
}

function collectIdsWithChildren(items: PrintPreviewNavItem[]): string[] {
    let ids: string[] = [];
    items.forEach((it) => {
        if (it.children && it.children.length > 0) {
            ids.push(it.id);
            ids = ids.concat(collectIdsWithChildren(it.children));
        }
    });
    return ids;
}

export function PrintPreviewNav({
    sections,
    excludedIds,
    itemGroups,
    lockedSectionIds,
    open,
    onRequestToggle,
    onToggle,
    onReorder,
    onReorderItem,
    onNavigate,
    onToggleAll,
    excludedCount = 0,
    onAddCustomSection,
}: PrintPreviewNavProps) {
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
    const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
    const [sectionDropPosition, setSectionDropPosition] = useState<DropPosition | null>(null);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
    const [itemDropPosition, setItemDropPosition] = useState<DropPosition | null>(null);
    const [collapsedIds, setCollapsedIds] = useState<string[]>(() => [
        ...itemGroups.map((g) => g.sectionId),
        ...itemGroups.flatMap((g) => collectIdsWithChildren(g.items)),
    ]);

    const touchSectionDrag = useTouchDrag({
        onDragStart: (id) => setDraggedSectionId(id),
        onDragOver: (sourceId, targetId) => {
            const nextTargetId = targetId && targetId !== sourceId ? targetId : null;
            setDragOverSectionId(nextTargetId);
            setSectionDropPosition(
                nextTargetId
                    ? positionFromOrder(
                          sourceId,
                          nextTargetId,
                          sections.map((s) => s.id)
                      )
                    : null
            );
        },
        onDrop: (sourceId, targetId) => {
            if (sourceId !== targetId) {
                onReorder(
                    sourceId,
                    targetId,
                    positionFromOrder(
                        sourceId,
                        targetId,
                        sections.map((s) => s.id)
                    )
                );
            }
        },
        onDragEnd: () => {
            setDraggedSectionId(null);
            setDragOverSectionId(null);
            setSectionDropPosition(null);
        },
    });
    const touchItemDrag = useTouchDrag({
        onDragStart: (key) => {
            const parsed = parseTouchItemKey(key);
            if (parsed) setDraggedItemId(parsed[1]);
        },
        onDragOver: (sourceKey, targetKey) => {
            const parsed = targetKey ? parseTouchItemKey(targetKey) : null;
            const source = parseTouchItemKey(sourceKey);
            const nextTarget = source && parsed && source[1] !== parsed[1] ? parsed : null;
            setDragOverItemId(nextTarget?.[1] ?? null);
            setItemDropPosition(
                source && nextTarget && source[0] === nextTarget[0]
                    ? positionFromOrder(source[1], nextTarget[1], source[2])
                    : null
            );
        },
        onDrop: (sourceKey, targetKey) => {
            const source = parseTouchItemKey(sourceKey);
            const target = parseTouchItemKey(targetKey);
            if (!source || !target || source[0] !== target[0] || source[1] === target[1]) return;
            if (source[2].includes(target[1])) {
                onReorderItem(
                    source[0],
                    source[2],
                    source[1],
                    target[1],
                    positionFromOrder(source[1], target[1], source[2])
                );
            }
        },
        onDragEnd: () => {
            setDraggedItemId(null);
            setDragOverItemId(null);
            setItemDropPosition(null);
        },
    });

    const itemsBySection = new Map(itemGroups.map((g) => [g.sectionId, g]));

    const toggleCollapsed = (id: string) => {
        setCollapsedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    if (!open) {
        return (
            <div className="h-full w-full bg-slate-900 flex flex-col items-center py-3 text-slate-100 select-none overflow-hidden">
                <button
                    type="button"
                    onClick={onRequestToggle}
                    className="mb-4 grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition shadow-sm shrink-0"
                    title="구성 관리 펼치기"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="w-8 border-b border-slate-800 mb-3 shrink-0" />

                <div className="flex-1 w-full overflow-y-auto px-1.5 space-y-3 flex flex-col items-center">
                    {sections.map((sec) => {
                        const excluded = excludedIds.includes(sec.id);
                        const Icon = sec.icon;
                        return (
                            <button
                                key={sec.id}
                                type="button"
                                onClick={() => onNavigate(sec.id)}
                                title={`${sec.label}${excluded ? ' (제외됨)' : ''}`}
                                className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                                    excluded
                                        ? 'border-slate-800/80 bg-slate-950/40 text-slate-600'
                                        : 'border-slate-700/60 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-slate-900 flex flex-col text-slate-100 select-none overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-3 bg-slate-950/60 shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <ListChecks className="h-4 w-4 shrink-0 text-blue-400" />
                    <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">구성 관리</p>
                        <p className="text-[10px] font-semibold text-slate-400 truncate">
                            드래그 순서 · 포함 토글
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {onToggleAll && (
                        <button
                            type="button"
                            onClick={onToggleAll}
                            className="rounded bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-700 hover:text-white px-2 py-1 text-[10px] font-black text-slate-300 transition"
                        >
                            {excludedCount > 0 ? '모두 포함' : '모두 제외'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onRequestToggle}
                        className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 p-1 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        title="사이드바 접기"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {sections.map((sec) => {
                    const excluded = excludedIds.includes(sec.id);
                    const isLocked = lockedSectionIds.includes(sec.id);
                    const group = itemsBySection.get(sec.id);
                    const items = group?.items ?? [];
                    const hasItems = items.length > 0;
                    const isCollapsed = collapsedIds.includes(sec.id);
                    const isDraggingThis = draggedSectionId === sec.id;
                    const isOverThis = dragOverSectionId === sec.id;
                    const itemIds = items.map((it) => it.id);

                    return (
                        <div key={sec.id} className="relative">
                            {isOverThis && sectionDropPosition === 'before' && <DropIndicator />}
                            <div
                                {...(!isLocked ? touchSectionDrag.dropTargetProps(sec.id) : {})}
                                draggable={!isLocked}
                                onDragStart={(e) => {
                                    if (isLocked) return;
                                    e.dataTransfer.setData('text/plain', sec.id);
                                    setDraggedSectionId(sec.id);
                                }}
                                onDragEnd={() => {
                                    setDraggedSectionId(null);
                                    setDragOverSectionId(null);
                                    setSectionDropPosition(null);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (
                                        !isLocked &&
                                        draggedSectionId &&
                                        draggedSectionId !== sec.id
                                    ) {
                                        setDragOverSectionId(sec.id);
                                        setSectionDropPosition(
                                            positionFromPointer(e.clientY, e.currentTarget)
                                        );
                                    }
                                }}
                                onDragLeave={(e) => {
                                    if (
                                        dragOverSectionId === sec.id &&
                                        !e.currentTarget.contains(e.relatedTarget as Node | null)
                                    ) {
                                        setDragOverSectionId(null);
                                        setSectionDropPosition(null);
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const fromId =
                                        e.dataTransfer.getData('text/plain') || draggedSectionId;
                                    if (fromId && fromId !== sec.id) {
                                        onReorder(
                                            fromId,
                                            sec.id,
                                            sectionDropPosition ??
                                                positionFromPointer(e.clientY, e.currentTarget)
                                        );
                                    }
                                    setDraggedSectionId(null);
                                    setDragOverSectionId(null);
                                    setSectionDropPosition(null);
                                }}
                                className={`group rounded-xl border transition ${
                                    excluded
                                        ? 'border-slate-800/80 bg-slate-950/40 opacity-60'
                                        : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                                } ${isDraggingThis ? 'opacity-30' : ''} ${isOverThis ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}
                            >
                                <div
                                    onClick={() => onNavigate(sec.id)}
                                    className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer"
                                >
                                    {!isLocked && (
                                        <span
                                            {...touchSectionDrag.dragHandleProps(sec.id)}
                                            onClick={(event) => event.stopPropagation()}
                                            className="grid h-6 w-4 shrink-0 touch-none place-items-center text-slate-500 group-hover:text-slate-300 cursor-grab active:cursor-grabbing"
                                            title="드래그 또는 터치하여 순서 변경"
                                        >
                                            <GripVertical className="h-3.5 w-3.5" />
                                        </span>
                                    )}
                                    <sec.icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <span
                                        className={`flex-1 truncate text-xs font-bold ${excluded ? 'text-slate-400 line-through' : 'text-white'}`}
                                    >
                                        {sec.label}
                                    </span>
                                    {hasItems && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCollapsed(sec.id);
                                            }}
                                            className="shrink-0 p-1 text-slate-400 hover:text-white"
                                            title={
                                                isCollapsed ? '하위 항목 펼치기' : '하위 항목 접기'
                                            }
                                        >
                                            {isCollapsed ? (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    )}
                                    {isLocked ? (
                                        <span title="고정 섹션">
                                            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                        </span>
                                    ) : (
                                        <ToggleSwitch
                                            on={!excluded}
                                            onClick={() => onToggle(sec.id)}
                                        />
                                    )}
                                </div>

                                {hasItems && !isCollapsed && group && (
                                    <div className="border-t border-slate-800/80 px-2 py-1 space-y-0.5 bg-slate-950/30">
                                        {items.map((item) => (
                                            <NavTreeNode
                                                key={item.id}
                                                item={item}
                                                depth={0}
                                                scopeId={group.scopeId}
                                                siblingIds={itemIds}
                                                excludedIds={excludedIds}
                                                collapsedIds={collapsedIds}
                                                onToggleCollapse={toggleCollapsed}
                                                onToggle={onToggle}
                                                onReorderItem={onReorderItem}
                                                onNavigate={onNavigate}
                                                draggedId={draggedItemId}
                                                dragOverId={dragOverItemId}
                                                dragOverPosition={itemDropPosition}
                                                onDragStateChange={(d, o, position) => {
                                                    setDraggedItemId(d);
                                                    setDragOverItemId(o);
                                                    setItemDropPosition(position);
                                                }}
                                                touchDragHandleProps={touchItemDrag.dragHandleProps}
                                                touchDropTargetProps={touchItemDrag.dropTargetProps}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            {isOverThis && sectionDropPosition === 'after' && <DropIndicator />}
                        </div>
                    );
                })}

                {onAddCustomSection && (
                    <button
                        type="button"
                        onClick={onAddCustomSection}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-400/50 bg-blue-500/10 px-3 py-2.5 text-xs font-black text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/20 hover:text-white"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        사용자 정의 섹션 추가
                    </button>
                )}
            </div>
        </div>
    );
}
