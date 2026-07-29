'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { colorForCategory } from '@/lib/constants/learningResourceColors';

export type CategoryHubNodeData = {
    name: string;
    slug: string;
    radius: number;
    count: number;
};

export type CategoryHubFlowNode = Node<CategoryHubNodeData, 'learningResourceCategory'>;

const HIDDEN_HANDLE_STYLE = { opacity: 0, pointerEvents: 'none' as const };

export function CategoryHubNode({ data }: NodeProps<CategoryHubFlowNode>) {
    const color = colorForCategory(data.slug);
    const diameter = data.radius * 2;

    return (
        <div className="relative" style={{ width: diameter, height: diameter }}>
            <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
            <div
                className="flex h-full w-full items-center justify-center rounded-full shadow-md ring-4 ring-white"
                style={{ backgroundColor: color }}
            >
                <span className="text-[10px] font-black text-white">{data.count}</span>
            </div>
            <span className="pointer-events-none absolute left-1/2 top-full mt-1 w-max max-w-[140px] -translate-x-1/2 whitespace-normal text-center text-xs font-black leading-tight text-slate-700">
                {data.name}
            </span>
            <Handle type="source" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
        </div>
    );
}
