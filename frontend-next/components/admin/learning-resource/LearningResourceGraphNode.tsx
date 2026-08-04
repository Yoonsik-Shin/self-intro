'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { LearningResourcePriorityTier } from '@/lib/api/types';
import { colorForCourseNode } from '@/lib/constants/learningResourceColors';

export type LearningResourceGraphNodeData = {
    title: string;
    categoryName: string;
    categorySlug: string;
    priorityTier?: LearningResourcePriorityTier;
    radius: number;
    durationLabel?: string | null;
};

export type LearningResourceGraphFlowNode = Node<
    LearningResourceGraphNodeData,
    'learningResourceCourse'
>;

const HIDDEN_HANDLE_STYLE = { opacity: 0, pointerEvents: 'none' as const };

export function LearningResourceGraphNode({ data }: NodeProps<LearningResourceGraphFlowNode>) {
    const color = colorForCourseNode(data.categorySlug, data.priorityTier);
    const diameter = data.radius * 2;

    return (
        <div className="relative" style={{ width: diameter, height: diameter }}>
            <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
            <div
                className="flex h-full w-full cursor-pointer items-center justify-center rounded-full shadow-md ring-2 ring-white transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
            >
                <span
                    className="pointer-events-none select-none text-[9px] font-black text-white"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                    {data.priorityTier ?? '-'}
                </span>
            </div>
            <span
                className="pointer-events-none absolute left-1/2 top-full mt-1 max-w-[130px] -translate-x-1/2 truncate text-center text-[10px] font-bold text-slate-600"
                title={data.title}
            >
                {data.title}
            </span>
            {data.durationLabel && (
                <span className="pointer-events-none absolute left-1/2 top-full mt-4 -translate-x-1/2 whitespace-nowrap text-center text-[9px] font-semibold text-slate-400">
                    {data.durationLabel}
                </span>
            )}
            <Handle type="source" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
        </div>
    );
}
