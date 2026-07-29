'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

export type RootHubNodeData = {
    label: string;
    radius: number;
};

export type RootHubFlowNode = Node<RootHubNodeData, 'learningResourceRoot'>;

const HIDDEN_HANDLE_STYLE = { opacity: 0, pointerEvents: 'none' as const };

export function RootHubNode({ data }: NodeProps<RootHubFlowNode>) {
    const diameter = data.radius * 2;

    return (
        <div className="relative" style={{ width: diameter, height: diameter }}>
            <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
            <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 shadow-lg ring-4 ring-white">
                <span className="px-2 text-center text-xs font-black leading-tight text-white">
                    {data.label}
                </span>
            </div>
            <Handle type="source" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
        </div>
    );
}
