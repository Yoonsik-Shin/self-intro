'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    MarkerType,
    applyNodeChanges,
    type Edge,
    type EdgeMarkerType,
    type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { learningResourceApi } from '@/lib/api';
import type { LearningResourcePriorityTier, LearningResourceRelationType } from '@/lib/api/types';
import { colorForCategory } from '@/lib/constants/learningResourceColors';
import { formatDuration } from '@/lib/format';
import {
    CATEGORY_NODE_RADIUS,
    ROOT_NODE_RADIUS,
    layoutRadialTree,
} from '@/lib/graph/radialTreeLayout';
import { CategoryHubNode, type CategoryHubFlowNode } from './CategoryHubNode';
import { FloatingEdge } from './FloatingEdge';
import {
    LearningResourceGraphNode,
    type LearningResourceGraphFlowNode,
} from './LearningResourceGraphNode';
import { RootHubNode, type RootHubFlowNode } from './RootHubNode';

type LearningResourceMindmapProps = {
    onOpenResource: (id: number) => void;
};

type FlowNode = RootHubFlowNode | CategoryHubFlowNode | LearningResourceGraphFlowNode;
type PriorityFilterValue = LearningResourcePriorityTier | 'NONE';

const nodeTypes = {
    learningResourceRoot: RootHubNode,
    learningResourceCategory: CategoryHubNode,
    learningResourceCourse: LearningResourceGraphNode,
};
const edgeTypes = { floating: FloatingEdge };

const MIN_RADIUS = 14;
const MAX_RADIUS = 46;
const RADIUS_PER_LINK = 7;

const RESOURCE_TYPE_LABEL: Record<string, string> = {
    ONLINE_COURSE: '온라인 강의',
    BOOK: '도서',
    OFFLINE: '오프라인 자료',
};

const ALL_PRIORITIES: PriorityFilterValue[] = ['P0', 'P1', 'P2', 'P3', 'NONE'];
const DEFAULT_CATEGORY_SLUG = 'backend-core';
const DEFAULT_PRIORITY: PriorityFilterValue = 'P0';
const PRIORITY_LABEL: Record<PriorityFilterValue, string> = {
    P0: 'P0',
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
    NONE: '미지정',
};
const PRIORITY_ACTIVE_CLASS: Record<PriorityFilterValue, string> = {
    P0: 'border-red-500 bg-red-500 text-white',
    P1: 'border-orange-400 bg-orange-400 text-white',
    P2: 'border-yellow-300 bg-yellow-300 text-slate-800',
    P3: 'border-slate-300 bg-slate-300 text-slate-700',
    NONE: 'border-slate-500 bg-slate-500 text-white',
};

const relationEdgeStyle: Record<
    LearningResourceRelationType,
    { stroke: string; dashed: boolean; marker: boolean; label: string }
> = {
    PREREQUISITE: { stroke: '#0F172A', dashed: false, marker: true, label: '선수 학습' },
    FOLLOW_UP: { stroke: '#64748B', dashed: false, marker: true, label: '후속 학습' },
    RELATED: { stroke: '#94A3B8', dashed: true, marker: false, label: '관련' },
    OVERLAPS: { stroke: '#DC2626', dashed: true, marker: false, label: '중복' },
};

const courseNodeId = (id: number) => `res:${id}`;
const categoryNodeId = (slug: string) => `cat:${slug}`;
const ROOT_ID = 'root';

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
    const [selectedPriorities, setSelectedPriorities] = useState<Set<PriorityFilterValue> | null>(
        null
    );
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [showDuration, setShowDuration] = useState(false);
    const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const dragGrabOffset = useRef<{ dx: number; dy: number } | null>(null);

    const handlePanelDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        const panel = panelRef.current;
        if (!container || !panel) return;
        const containerRect = container.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        dragGrabOffset.current = { dx: e.clientX - panelRect.left, dy: e.clientY - panelRect.top };
        if (!panelPos) {
            setPanelPos({
                left: panelRect.left - containerRect.left,
                top: panelRect.top - containerRect.top,
            });
        }
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePanelDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragGrabOffset.current) return;
        const container = containerRef.current;
        const panel = panelRef.current;
        if (!container || !panel) return;
        const containerRect = container.getBoundingClientRect();
        const maxLeft = Math.max(containerRect.width - panel.offsetWidth, 0);
        const maxTop = Math.max(containerRect.height - panel.offsetHeight, 0);
        const left = Math.min(
            Math.max(e.clientX - containerRect.left - dragGrabOffset.current.dx, 0),
            maxLeft
        );
        const top = Math.min(
            Math.max(e.clientY - containerRect.top - dragGrabOffset.current.dy, 0),
            maxTop
        );
        setPanelPos({ left, top });
    };

    const handlePanelDragEnd = () => {
        dragGrabOffset.current = null;
    };

    // 214개를 한 번에 다 펼치면 압도적이라, 처음 열었을 때는 "백엔드 코어" + "P0"만 보여주고
    // 나머지는 필터 패널에서 직접 켜도록 한다. 카테고리가 아직 로드 전이거나 해당 슬러그가
    // 없으면(카탈로그가 바뀐 경우) 전체를 보여주는 쪽으로 자연스럽게 폴백한다.
    const activeCategories = useMemo(() => {
        if (selectedCategories) return selectedCategories;
        const hasDefault = categories.some((c) => c.slug === DEFAULT_CATEGORY_SLUG);
        return hasDefault
            ? new Set([DEFAULT_CATEGORY_SLUG])
            : new Set(categories.map((c) => c.slug));
    }, [selectedCategories, categories]);
    const activePriorities = useMemo(
        () => selectedPriorities ?? new Set<PriorityFilterValue>([DEFAULT_PRIORITY]),
        [selectedPriorities]
    );

    const toggleCategory = (slug: string) => {
        setSelectedCategories((current) => {
            const base = current ?? activeCategories;
            const next = new Set(base);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
    };

    const togglePriority = (value: PriorityFilterValue) => {
        setSelectedPriorities((current) => {
            const base = current ?? activePriorities;
            const next = new Set(base);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    };

    // relation이 214개 중 23개뿐인 희소 그래프라 물리 시뮬레이션 기반 클러스터링은
    // 매 프레임 재계산 비용도 크고 결과도 "카테고리별로 대충 뭉친 점 무더기"에
    // 가까웠다. 중심에 루트(전체 자료 유형) 하나를 두고 그 둘레에 카테고리가,
    // 각 카테고리 바깥으로 강의가 부채꼴로 퍼지는 방사형 정적 트리로 바꿔 상위 분류
    // -> 하위 강의 구조가 선으로 바로 보이게 하고, 매 프레임 재계산도 없앴다.
    // 실제 relation(선수/중복)은 트리 위에 별도 엣지로 덧그린다.
    const { initialNodes, edges } = useMemo(() => {
        if (!graph) {
            return { initialNodes: [] as FlowNode[], edges: [] as Edge[] };
        }

        const visibleNodeIds = new Set(
            graph.nodes
                .filter(
                    (n) =>
                        activeCategories.has(n.category.slug) &&
                        activePriorities.has(n.priorityTier ?? 'NONE')
                )
                .map((n) => n.id)
        );

        const visibleEdges = graph.edges.filter(
            (e) => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId)
        );

        const degree = new Map<number, number>();
        visibleEdges.forEach((e) => {
            degree.set(e.sourceId, (degree.get(e.sourceId) ?? 0) + 1);
            degree.set(e.targetId, (degree.get(e.targetId) ?? 0) + 1);
        });

        const visibleCourses = graph.nodes.filter((n) => visibleNodeIds.has(n.id));
        const visibleCategorySlugs = new Set(visibleCourses.map((n) => n.category.slug));
        const activeCategoryDefs = categories.filter((c) => visibleCategorySlugs.has(c.slug));

        const leafInputs = visibleCourses.map((n) => ({
            id: courseNodeId(n.id),
            categorySlug: n.category.slug,
        }));

        const { rootPosition, categoryPositions, leafPositions } = layoutRadialTree(
            leafInputs,
            activeCategoryDefs.map((c) => ({ slug: c.slug })),
            visibleEdges.map((e) => ({
                source: courseNodeId(e.sourceId),
                target: courseNodeId(e.targetId),
            }))
        );

        const resourceTypes = new Set(graph.nodes.map((n) => n.resourceType));
        const rootLabel =
            resourceTypes.size === 1
                ? (RESOURCE_TYPE_LABEL[[...resourceTypes][0]] ?? '학습 자료')
                : '전체 학습 자료';

        const rootNode: RootHubFlowNode = {
            id: ROOT_ID,
            type: 'learningResourceRoot',
            position: {
                x: rootPosition.x - ROOT_NODE_RADIUS,
                y: rootPosition.y - ROOT_NODE_RADIUS,
            },
            data: { label: rootLabel, radius: ROOT_NODE_RADIUS },
        };

        const categoryCounts = new Map<string, number>();
        visibleCourses.forEach((n) => {
            categoryCounts.set(n.category.slug, (categoryCounts.get(n.category.slug) ?? 0) + 1);
        });

        const categoryNodes: CategoryHubFlowNode[] = activeCategoryDefs
            .filter((c) => categoryPositions[c.slug])
            .map((c) => {
                const pos = categoryPositions[c.slug];
                return {
                    id: categoryNodeId(c.slug),
                    type: 'learningResourceCategory',
                    position: {
                        x: pos.x - CATEGORY_NODE_RADIUS,
                        y: pos.y - CATEGORY_NODE_RADIUS,
                    },
                    data: {
                        name: c.name,
                        slug: c.slug,
                        radius: CATEGORY_NODE_RADIUS,
                        count: categoryCounts.get(c.slug) ?? 0,
                    },
                };
            });

        const courseNodes: LearningResourceGraphFlowNode[] = visibleCourses.map((n) => {
            const radius = Math.min(
                MAX_RADIUS,
                Math.max(MIN_RADIUS, MIN_RADIUS + (degree.get(n.id) ?? 0) * RADIUS_PER_LINK)
            );
            const pos = leafPositions[courseNodeId(n.id)] ?? { x: 0, y: 0 };
            return {
                id: courseNodeId(n.id),
                type: 'learningResourceCourse',
                position: { x: pos.x - radius, y: pos.y - radius },
                data: {
                    title: n.title,
                    categoryName: n.category.name,
                    categorySlug: n.category.slug,
                    priorityTier: n.priorityTier,
                    radius,
                    durationLabel: showDuration ? formatDuration(n.durationMinutes) : null,
                },
            };
        });

        const rootToCategoryEdges: Edge[] = activeCategoryDefs
            .filter((c) => categoryPositions[c.slug])
            .map((c) => ({
                id: `struct-root-${c.slug}`,
                type: 'floating',
                source: ROOT_ID,
                target: categoryNodeId(c.slug),
                style: { stroke: '#CBD5E1', strokeWidth: 2 },
            }));

        const categoryToCourseEdges: Edge[] = visibleCourses.map((n) => ({
            id: `struct-${n.category.slug}-${n.id}`,
            type: 'floating',
            source: categoryNodeId(n.category.slug),
            target: courseNodeId(n.id),
            style: { stroke: '#E2E8F0', strokeWidth: 1.5 },
        }));

        const relationEdges: Edge[] = visibleEdges.map((e) => {
            const style = relationEdgeStyle[e.type];
            return {
                id: `rel-${e.sourceId}-${e.targetId}-${e.type}`,
                type: 'floating',
                source: courseNodeId(e.sourceId),
                target: courseNodeId(e.targetId),
                label: style.label,
                style: {
                    stroke: style.stroke,
                    strokeWidth: 2,
                    strokeDasharray: style.dashed ? '6 4' : undefined,
                },
                markerEnd: style.marker
                    ? ({ type: MarkerType.ArrowClosed, color: style.stroke } as EdgeMarkerType)
                    : undefined,
            };
        });

        return {
            initialNodes: [rootNode, ...categoryNodes, ...courseNodes],
            edges: [...rootToCategoryEdges, ...categoryToCourseEdges, ...relationEdges],
        };
    }, [graph, activeCategories, activePriorities, categories, showDuration]);

    const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
    const [syncedInitialNodes, setSyncedInitialNodes] = useState(initialNodes);
    if (initialNodes !== syncedInitialNodes) {
        setSyncedInitialNodes(initialNodes);
        setNodes(initialNodes);
    }

    const onNodesChange: OnNodesChange<FlowNode> = useCallback((changes) => {
        setNodes((current) => applyNodeChanges(changes, current));
    }, []);

    const handleNodeClick = (_: unknown, node: FlowNode) => {
        if (node.id.startsWith('res:')) {
            onOpenResource(Number(node.id.slice('res:'.length)));
        }
    };

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
        <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
            style={{ height: '640px' }}
        >
            {nodes.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    표시할 학습 자료가 없습니다. 필터를 확인하거나 학습 자료를 추가해보세요.
                </div>
            ) : (
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onNodeClick={handleNodeClick}
                    nodesConnectable={false}
                    fitView
                    proOptions={{ hideAttribution: true }}
                >
                    <Background />
                    <Controls />
                    <MiniMap pannable zoomable />
                </ReactFlow>
            )}

            {categories.length > 0 && (
                <div
                    ref={panelRef}
                    className={`absolute z-10 flex items-start gap-0 ${panelPos ? '' : 'right-4 top-4'}`}
                    style={panelPos ? { left: panelPos.left, top: panelPos.top } : undefined}
                >
                    {filtersOpen && (
                        <div className="max-h-[560px] w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
                            <div
                                onPointerDown={handlePanelDragStart}
                                onPointerMove={handlePanelDragMove}
                                onPointerUp={handlePanelDragEnd}
                                className="flex touch-none select-none items-center gap-1 rounded-t-xl border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-400 active:cursor-grabbing"
                                style={{ cursor: 'grab' }}
                            >
                                <GripVertical size={14} className="text-slate-300" />
                                필터
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-100 p-3">
                                <p className="text-[11px] font-bold text-slate-400">
                                    러닝타임 표시
                                </p>
                                <button
                                    onClick={() => setShowDuration((v) => !v)}
                                    role="switch"
                                    aria-checked={showDuration}
                                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${showDuration ? 'bg-slate-900' : 'bg-slate-200'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showDuration ? 'translate-x-4' : 'translate-x-0.5'}`}
                                    />
                                </button>
                            </div>
                            <div className="border-b border-slate-100 p-3 pt-2">
                                <p className="mb-1.5 text-[11px] font-bold text-slate-400">
                                    우선순위
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {ALL_PRIORITIES.map((value) => {
                                        const active = activePriorities.has(value);
                                        return (
                                            <button
                                                key={value}
                                                onClick={() => togglePriority(value)}
                                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${active ? PRIORITY_ACTIVE_CLASS[value] : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                                            >
                                                {PRIORITY_LABEL[value]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-3 pt-2">
                                <p className="mb-1.5 text-[11px] font-bold text-slate-400">
                                    카테고리
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {categories.map((category) => {
                                        const active = activeCategories.has(category.slug);
                                        const color = colorForCategory(category.slug);
                                        return (
                                            <button
                                                key={category.slug}
                                                onClick={() => toggleCategory(category.slug)}
                                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${active ? 'text-white' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                                                style={
                                                    active
                                                        ? {
                                                              backgroundColor: color,
                                                              borderColor: color,
                                                          }
                                                        : {}
                                                }
                                            >
                                                {category.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setFiltersOpen((v) => !v)}
                        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        title={filtersOpen ? '필터 접기' : '필터 펼치기'}
                    >
                        {filtersOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            )}
        </div>
    );
}
