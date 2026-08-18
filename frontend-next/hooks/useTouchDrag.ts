'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react';

type TouchDragOptions = {
    disabled?: boolean;
    activationDistance?: number;
    /** 정확한 드롭존 밖이어도 이 거리(px) 안이면 가장 가까운 드롭존으로 스냅한다. */
    snapDistance?: number;
    onDragStart?: (sourceId: string) => void;
    onDragOver?: (sourceId: string, targetId: string | null) => void;
    onDrop: (sourceId: string, targetId: string) => void;
    onDragEnd?: () => void;
};

type ActivePointer = {
    pointerId: number;
    sourceId: string;
    startX: number;
    startY: number;
    active: boolean;
};

type TouchDropTargetProps = HTMLAttributes<HTMLElement> & {
    'data-touch-drop-zone': string;
    'data-touch-drop-id': string;
};

/**
 * Adds touch/pen drag-and-drop alongside native HTML5 mouse drag-and-drop.
 * Attach dragHandleProps to a small handle and dropTargetProps to each target.
 */
export function useTouchDrag({
    disabled = false,
    activationDistance = 6,
    snapDistance = 48,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: TouchDragOptions) {
    const reactId = useId();
    const zoneId = `touch-dnd-${reactId}`;
    const activePointerRef = useRef<ActivePointer | null>(null);
    const overIdRef = useRef<string | null>(null);
    const callbacksRef = useRef({ onDragStart, onDragOver, onDrop, onDragEnd });
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    // 드래그 시작 시점에 한 번만 스냅샷 — 매 pointermove마다 전체 드롭존을
    // 다시 측정하면 레이아웃 강제 리플로우가 반복돼 드래그 중 렉이 생긴다.
    const dropZoneRectsRef = useRef<Array<{ id: string; rect: DOMRect }> | null>(null);

    useEffect(() => {
        callbacksRef.current = { onDragStart, onDragOver, onDrop, onDragEnd };
    }, [onDragEnd, onDragOver, onDragStart, onDrop]);

    const finishDrag = useCallback((drop: boolean) => {
        const activePointer = activePointerRef.current;
        if (!activePointer) return;

        if (drop && activePointer.active && overIdRef.current) {
            callbacksRef.current.onDrop(activePointer.sourceId, overIdRef.current);
        }
        if (activePointer.active) callbacksRef.current.onDragEnd?.();

        activePointerRef.current = null;
        overIdRef.current = null;
        dropZoneRectsRef.current = null;
        setDraggedId(null);
        setDragOverId(null);
    }, []);

    useEffect(() => () => finishDrag(false), [finishDrag]);

    const findDropTarget = useCallback(
        (clientX: number, clientY: number) => {
            const element = document.elementFromPoint(clientX, clientY);
            let target = element?.closest<HTMLElement>('[data-touch-drop-zone]') ?? null;
            while (target && target.dataset.touchDropZone !== zoneId) {
                target =
                    target.parentElement?.closest<HTMLElement>('[data-touch-drop-zone]') ?? null;
            }
            if (target) return target.dataset.touchDropId ?? null;

            // 손가락이 드롭존을 살짝 벗어나도(카드 사이 여백, 위에 뜬 컨트롤
            // 버튼 등) snapDistance 안이면 가장 가까운 드롭존으로 스냅한다.
            const candidates = dropZoneRectsRef.current;
            if (!candidates) return null;
            let nearestId: string | null = null;
            let nearestDistance = Infinity;
            for (const { id, rect } of candidates) {
                const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
                const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
                const distance = Math.hypot(dx, dy);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestId = id;
                }
            }
            return nearestDistance <= snapDistance ? nearestId : null;
        },
        [zoneId, snapDistance]
    );

    const dragHandleProps = useCallback(
        (sourceId: string): HTMLAttributes<HTMLElement> => ({
            onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
                if (disabled || event.pointerType === 'mouse' || !event.isPrimary) return;
                activePointerRef.current = {
                    pointerId: event.pointerId,
                    sourceId,
                    startX: event.clientX,
                    startY: event.clientY,
                    active: false,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
            },
            onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
                const activePointer = activePointerRef.current;
                if (!activePointer || activePointer.pointerId !== event.pointerId) return;

                if (!activePointer.active) {
                    const distance = Math.hypot(
                        event.clientX - activePointer.startX,
                        event.clientY - activePointer.startY
                    );
                    if (distance < activationDistance) return;
                    activePointer.active = true;
                    setDraggedId(activePointer.sourceId);
                    dropZoneRectsRef.current = Array.from(
                        document.querySelectorAll<HTMLElement>(`[data-touch-drop-zone="${zoneId}"]`)
                    ).map((el) => ({
                        id: el.dataset.touchDropId ?? '',
                        rect: el.getBoundingClientRect(),
                    }));
                    callbacksRef.current.onDragStart?.(activePointer.sourceId);
                }

                event.preventDefault();
                const nextOverId = findDropTarget(event.clientX, event.clientY);
                if (nextOverId === overIdRef.current) return;
                overIdRef.current = nextOverId;
                setDragOverId(nextOverId);
                callbacksRef.current.onDragOver?.(activePointer.sourceId, nextOverId);
            },
            onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
                const activePointer = activePointerRef.current;
                if (!activePointer || activePointer.pointerId !== event.pointerId) return;
                if (activePointer.active) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                finishDrag(true);
            },
            onPointerCancel: () => finishDrag(false),
            onLostPointerCapture: () => {
                if (activePointerRef.current) finishDrag(false);
            },
        }),
        [activationDistance, disabled, findDropTarget, finishDrag, zoneId]
    );

    const dropTargetProps = useCallback(
        (targetId: string): TouchDropTargetProps => ({
            'data-touch-drop-zone': zoneId,
            'data-touch-drop-id': targetId,
        }),
        [zoneId]
    );

    return { draggedId, dragOverId, dragHandleProps, dropTargetProps };
}
