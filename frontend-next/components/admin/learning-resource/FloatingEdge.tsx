'use client';

import { getStraightPath, useInternalNode, type EdgeProps, type InternalNode } from '@xyflow/react';

function circleCenter(node: InternalNode) {
    const pos = node.internals.positionAbsolute;
    const radius = (node.data as { radius?: number }).radius ?? (node.measured?.width ?? 40) / 2;
    return { x: pos.x + radius, y: pos.y + radius, radius };
}

/**
 * 노드가 카드가 아니라 원이라 기본 핸들 기준 앵커로는 선이 도형 안쪽에서 시작/끝난다.
 * 두 원의 중심을 잇는 직선과 각 원의 경계가 만나는 점을 직접 계산해 원 테두리에서
 * 붙었다 떨어지는 선으로 그린다(React Flow 공식 "floating edges" 패턴).
 */
export function FloatingEdge({ id, source, target, style, markerEnd }: EdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) return null;

    const s = circleCenter(sourceNode);
    const t = circleCenter(targetNode);

    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const [path] = getStraightPath({
        sourceX: s.x + (dx / dist) * s.radius,
        sourceY: s.y + (dy / dist) * s.radius,
        targetX: t.x - (dx / dist) * t.radius,
        targetY: t.y - (dy / dist) * t.radius,
    });

    return (
        <path
            id={id}
            className="react-flow__edge-path"
            d={path}
            style={style}
            markerEnd={markerEnd}
        />
    );
}
