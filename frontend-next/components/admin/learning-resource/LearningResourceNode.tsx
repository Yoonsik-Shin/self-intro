'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { colorForCategory } from '@/lib/constants/learningResourceColors';

export type LearningResourceNodeData = {
    title: string;
    categoryName: string;
    categorySlug: string;
    resourceType: string;
    status: string;
    priorityTier?: string;
};

export type LearningResourceFlowNode = Node<LearningResourceNodeData, 'learningResource'>;

const statusBorderStyles: Record<string, string> = {
    WISHLIST: 'border-dashed',
    OWNED: 'border-solid',
    IN_PROGRESS: 'border-solid',
    COMPLETED: 'border-solid',
};

const priorityBadgeStyles: Record<string, string> = {
    P0: 'bg-red-500 text-white',
    P1: 'bg-orange-400 text-white',
    P2: 'bg-yellow-300 text-slate-800',
    P3: 'bg-slate-200 text-slate-500',
};

export function LearningResourceNode({ data }: NodeProps<LearningResourceFlowNode>) {
    const color = colorForCategory(data.categorySlug);

    return (
        <div
            className={`relative w-[200px] rounded-xl border-2 bg-white px-3 py-2 shadow-sm ${statusBorderStyles[data.status] ?? 'border-solid'} ${data.status === 'IN_PROGRESS' ? 'ring-2 ring-amber-300' : ''}`}
            style={{ borderColor: color }}
        >
            <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-400" />

            {data.priorityTier && (
                <span
                    className={`absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 text-[10px] font-black ${priorityBadgeStyles[data.priorityTier] ?? 'bg-slate-200 text-slate-600'}`}
                >
                    {data.priorityTier}
                </span>
            )}

            <p
                className="mb-1 truncate text-[10px] font-black uppercase tracking-wide"
                style={{ color }}
            >
                {data.categoryName}
            </p>
            <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-800">
                {data.title}
            </p>

            {data.status === 'COMPLETED' && (
                <span className="absolute -bottom-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                    ✓
                </span>
            )}

            <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-400" />
        </div>
    );
}
