'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    MarkerType,
    type Edge,
    type EdgeMarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network } from 'lucide-react';
import { learningResourceApi } from '@/lib/api';
import type { LearningResourceRelationType } from '@/lib/api/types';
import { colorForCategory } from '@/lib/constants/learningResourceColors';
import { layoutWithDagre } from '@/lib/graph/dagreLayout';
import { LearningResourceNode, type LearningResourceFlowNode } from './LearningResourceNode';

type LearningResourceMindmapProps = {
    onOpenResource: (id: number) => void;
};

const nodeTypes = { learningResource: LearningResourceNode };

const relationEdgeStyle: Record<
    LearningResourceRelationType,
    { stroke: string; dashed: boolean; marker: boolean; label: string }
> = {
    PREREQUISITE: { stroke: '#0F172A', dashed: false, marker: true, label: '선수 학습' },
    FOLLOW_UP: { stroke: '#64748B', dashed: false, marker: true, label: '후속 학습' },
    RELATED: { stroke: '#94A3B8', dashed: true, marker: false, label: '관련' },
    OVERLAPS: { stroke: '#DC2626', dashed: true, marker: false, label: '중복' },
};

export function LearningResourceMindmap({ onOpenResource }: LearningResourceMindmapProps) {
    const {
        data: graph,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['learning-resource-graph'],
        queryFn: learningResourceApi.graph,
    });

    const categories = useMemo(() => {
        const map = new Map<string, string>();
        graph?.nodes.forEach((node) => map.set(node.category.slug, node.category.name));
        return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
    }, [graph]);

    const [selectedCategories, setSelectedCategories] = useState<Set<string> | null>(null);
    const activeCategories = useMemo(
        () => selectedCategories ?? new Set(categories.map((c) => c.slug)),
        [selectedCategories, categories]
    );

    const toggleCategory = (slug: string) => {
        setSelectedCategories((current) => {
            const base = current ?? new Set(categories.map((c) => c.slug));
            const next = new Set(base);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
    };

    const { nodes, edges } = useMemo(() => {
        if (!graph) return { nodes: [] as LearningResourceFlowNode[], edges: [] as Edge[] };

        const visibleNodeIds = new Set(
            graph.nodes.filter((n) => activeCategories.has(n.category.slug)).map((n) => n.id)
        );

        const rawNodes: LearningResourceFlowNode[] = graph.nodes
            .filter((n) => visibleNodeIds.has(n.id))
            .map((n) => ({
                id: String(n.id),
                type: 'learningResource',
                position: { x: 0, y: 0 },
                data: {
                    title: n.title,
                    categoryName: n.category.name,
                    categorySlug: n.category.slug,
                    resourceType: n.resourceType,
                    status: n.status,
                    priorityTier: n.priorityTier,
                },
            }));

        const rawEdges: Edge[] = graph.edges
            .filter((e) => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId))
            .map((e) => {
                const style = relationEdgeStyle[e.type];
                return {
                    id: `${e.sourceId}-${e.targetId}-${e.type}`,
                    source: String(e.sourceId),
                    target: String(e.targetId),
                    label: style.label,
                    style: {
                        stroke: style.stroke,
                        strokeDasharray: style.dashed ? '6 4' : undefined,
                    },
                    markerEnd: style.marker
                        ? ({ type: MarkerType.ArrowClosed, color: style.stroke } as EdgeMarkerType)
                        : undefined,
                };
            });

        return { nodes: layoutWithDagre(rawNodes, rawEdges, 'TB'), edges: rawEdges };
    }, [graph, activeCategories]);

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-400">
                그래프를 불러오는 중...
            </div>
        );
    }

    if (isError || !graph) {
        return (
            <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center text-sm font-bold text-red-600">
                그래프를 불러오지 못했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                        <Network className="h-5 w-5" />
                        학습 마인드맵
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        학습 자료 간 선후관계·중복관계를 그래프로 확인합니다. 노드를 클릭하면 수정
                        화면으로 이동합니다.
                    </p>
                </div>
            </div>

            {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    {categories.map((category) => {
                        const active = activeCategories.has(category.slug);
                        const color = colorForCategory(category.slug);
                        return (
                            <button
                                key={category.slug}
                                onClick={() => toggleCategory(category.slug)}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${active ? 'text-white' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                                style={active ? { backgroundColor: color, borderColor: color } : {}}
                            >
                                {category.name}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                {nodes.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        표시할 학습 자료가 없습니다. 카테고리 필터를 확인하거나 학습 자료를
                        추가해보세요.
                    </div>
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodeClick={(_, node) => onOpenResource(Number(node.id))}
                        fitView
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background />
                        <Controls />
                        <MiniMap pannable zoomable />
                    </ReactFlow>
                )}
            </div>
        </div>
    );
}
