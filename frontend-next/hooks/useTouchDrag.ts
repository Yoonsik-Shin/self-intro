'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react';

type TouchDragOptions = {
    disabled?: boolean;
    activationDistance?: number;
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
            return target?.dataset.touchDropId ?? null;
        },
        [zoneId]
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
        [activationDistance, disabled, findDropTarget, finishDrag]
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
