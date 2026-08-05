'use client';

import type { TaxonomyNode } from '@/lib/api/types';

type Props = {
    nodes: TaxonomyNode[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
};

export function TaxonomyPicker({ nodes, selectedIds, onChange }: Props) {
    const childrenByParentId = new Map<number, TaxonomyNode[]>();
    const topLevel: TaxonomyNode[] = [];
    for (const node of nodes) {
        if (node.parentId === null) {
            topLevel.push(node);
        } else {
            const siblings = childrenByParentId.get(node.parentId) ?? [];
            siblings.push(node);
            childrenByParentId.set(node.parentId, siblings);
        }
    }

    const toggle = (id: number) => {
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((value) => value !== id)
                : [...selectedIds, id]
        );
    };

    const renderItem = (node: TaxonomyNode, depth: number) => {
        const children = childrenByParentId.get(node.id) ?? [];
        const checked = selectedIds.includes(node.id);
        return (
            <div key={node.id}>
                <label
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50 cursor-pointer"
                    style={{ paddingLeft: `${8 + depth * 16}px` }}
                >
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(node.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                    <span className={checked ? 'font-bold text-slate-900' : 'text-slate-600'}>
                        {node.name}
                    </span>
                </label>
                {children.length > 0 && (
                    <div>{children.map((child) => renderItem(child, depth + 1))}</div>
                )}
            </div>
        );
    };

    if (nodes.length === 0) {
        return <p className="text-xs text-slate-400">등록된 카테고리가 없습니다.</p>;
    }

    return (
        <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 p-1.5">
            {topLevel.map((node) => renderItem(node, 0))}
        </div>
    );
}
