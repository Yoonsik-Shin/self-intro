'use client';

import { ListTree } from 'lucide-react';
import type { StudyTaxonomyNode } from '@/lib/api/types';

type Props = {
    nodes: StudyTaxonomyNode[];
    activeNodeId: number | null;
    onSelect: (id: number | null) => void;
    hideHeader?: boolean;
};

export function TaxonomyList({ nodes, activeNodeId, onSelect, hideHeader = false }: Props) {
    const nodeIds = new Set(nodes.map((node) => node.id));
    const childrenByParentId = new Map<number, StudyTaxonomyNode[]>();
    const topLevel: StudyTaxonomyNode[] = [];
    for (const node of nodes) {
        const isVisibleChild = node.parentId !== null && nodeIds.has(node.parentId);
        if (!isVisibleChild) {
            topLevel.push(node);
        } else {
            const siblings = childrenByParentId.get(node.parentId as number) ?? [];
            siblings.push(node);
            childrenByParentId.set(node.parentId as number, siblings);
        }
    }

    const renderItem = (node: StudyTaxonomyNode, depth: number) => {
        const children = childrenByParentId.get(node.id) ?? [];
        const isActive = activeNodeId === node.id;
        return (
            <div key={node.id}>
                <button
                    type="button"
                    onClick={() => onSelect(node.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition ${
                        isActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                    style={{ paddingLeft: `${8 + depth * 14}px` }}
                >
                    <span className="truncate">{node.name}</span>
                    <span
                        className={`shrink-0 font-mono text-[11px] ${isActive ? 'text-slate-300' : 'text-slate-400'}`}
                    >
                        {node.studyCount}
                    </span>
                </button>
                {children.length > 0 && (
                    <div>{children.map((child) => renderItem(child, depth + 1))}</div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-0.5">
            {!hideHeader && (
                <h3 className="mb-1 flex items-center gap-1.5 text-sm font-black tracking-wider text-slate-700">
                    <ListTree className="h-3.5 w-3.5 text-blue-600" />
                    <span>카테고리</span>
                </h3>
            )}
            <button
                type="button"
                onClick={() => onSelect(null)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition ${
                    activeNodeId === null
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
            >
                <span>전체</span>
                <span
                    className={`shrink-0 font-mono text-[11px] ${activeNodeId === null ? 'text-slate-300' : 'text-slate-400'}`}
                >
                    {nodes.reduce((sum, node) => sum + node.studyCount, 0)}
                </span>
            </button>
            {topLevel.map((node) => renderItem(node, 0))}
        </div>
    );
}
