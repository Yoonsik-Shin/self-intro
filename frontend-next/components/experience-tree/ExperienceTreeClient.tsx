'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Background,
    Controls,
    MarkerType,
    MiniMap,
    ReactFlow,
    type Edge,
    type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    AlertTriangle,
    BookOpen,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    FileText,
    Folder,
    FolderOpen,
    GitBranch,
    Layers3,
    List,
    Search,
    Network,
} from 'lucide-react';
import { categoryBreadcrumb, categoryFor, DOMAIN_META } from '@/lib/experienceTreeTaxonomy';
import type {
    DecisionDomain,
    ExperienceTreeDetail,
    ExperienceTreeIndex,
    ExperienceTreeSituationSummary,
    ExperienceTreeSituationRelation,
    TradeoffCriterion,
} from '@/lib/api/types';
import { markdownComponents } from '@/lib/markdown';

type ViewMode = 'TREE' | 'LIST' | 'MAP';

const DOMAIN_LABELS: Record<DecisionDomain, string> = {
    BACKEND: 'Backend',
    INFRASTRUCTURE: 'Infrastructure',
    ARCHITECTURE: 'Architecture',
    FRONTEND: 'Frontend',
};
const DOMAIN_FILTERS: Array<DecisionDomain | 'ALL'> = [
    'ALL',
    'BACKEND',
    'INFRASTRUCTURE',
    'ARCHITECTURE',
    'FRONTEND',
];

const CRITERION_LABELS: Record<TradeoffCriterion, string> = {
    PERFORMANCE: '성능',
    CONSISTENCY: '일관성',
    AVAILABILITY: '가용성',
    SCALABILITY: '확장성',
    IMPLEMENTATION_COMPLEXITY: '구현 복잡도',
    OPERATIONAL_COMPLEXITY: '운영 복잡도',
    COST: '비용',
    SECURITY: '보안',
    MAINTAINABILITY: '유지보수성',
    FAILURE_ISOLATION: '장애 격리',
};

const LEVEL_STYLE = {
    LOW: 'bg-emerald-50 text-emerald-700',
    MEDIUM: 'bg-amber-50 text-amber-700',
    HIGH: 'bg-rose-50 text-rose-700',
    CONTEXT_DEPENDENT: 'bg-slate-100 text-slate-700',
};

export function ExperienceTreeClient({
    initialIndex,
    initialView = 'TREE',
    initialDomain = 'ALL',
    initialSearch = '',
    initialSituation,
    basePath = '/experience-tree',
}: {
    initialIndex: ExperienceTreeIndex;
    initialView?: ViewMode;
    initialDomain?: DecisionDomain | 'ALL';
    initialSearch?: string;
    initialSituation?: string;
    basePath?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [viewMode, setViewMode] = useState<ViewMode>(initialView);
    const [domain, setDomain] = useState<DecisionDomain | 'ALL'>(initialDomain);
    const [search, setSearch] = useState(initialSearch);
    const [selectedKey, setSelectedKey] = useState<string | null>(
        initialSituation ?? initialIndex.situations[0]?.stableKey ?? null
    );

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const query = new URLSearchParams();
            if (viewMode !== 'TREE') query.set('view', viewMode.toLowerCase());
            if (domain !== 'ALL') query.set('domain', domain.toLowerCase());
            if (search.trim()) query.set('q', search.trim());
            if (selectedKey) query.set('situation', selectedKey);
            router.replace(`${pathname}${query.size ? `?${query}` : ''}`, { scroll: false });
        }, 200);
        return () => window.clearTimeout(timeout);
    }, [domain, pathname, router, search, selectedKey, viewMode]);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return initialIndex.situations.filter(
            (item) =>
                (domain === 'ALL' || item.domain === domain) &&
                (!keyword ||
                    item.title.toLowerCase().includes(keyword) ||
                    item.summary.toLowerCase().includes(keyword) ||
                    item.topic.toLowerCase().includes(keyword))
        );
    }, [domain, initialIndex.situations, search]);

    const openDetail = (key: string) => {
        setSelectedKey(key);
        router.push(`${basePath}/${encodeURIComponent(key)}`);
    };

    return (
        <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
            <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 -translate-y-16 translate-x-16 rounded-full bg-slate-800/5 blur-[50px]" />
                <div className="relative max-w-3xl">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        개발자 온톨로지
                    </h1>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500 sm:text-base">
                        개발 문제를 도메인·역량·주제·의사결정으로 분류하고 선택지, 트레이드오프,
                        오답과 실제 경험을 관계로 연결합니다.
                    </p>
                </div>
            </header>

            <div className="sticky top-16 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-1.5">
                    {DOMAIN_FILTERS.map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setDomain(value)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${domain === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {value === 'ALL' ? '전체' : DOMAIN_LABELS[value]}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="상황·주제 검색"
                            className="w-full bg-transparent text-sm outline-none sm:w-52"
                        />
                    </label>
                    <div className="flex rounded-xl bg-slate-100 p-1">
                        {(
                            [
                                ['TREE', GitBranch, '트리'],
                                ['LIST', List, '리스트'],
                                ['MAP', Network, '관계 맵'],
                            ] as const
                        ).map(([value, Icon, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setViewMode(value)}
                                title={label}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${viewMode === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {viewMode === 'TREE' && (
                <TreeView situations={filtered} selectedKey={selectedKey} onSelect={openDetail} />
            )}
            {viewMode === 'LIST' && (
                <ListView situations={filtered} selectedKey={selectedKey} onSelect={openDetail} />
            )}
            {viewMode === 'MAP' && (
                <DecisionMapView
                    situations={filtered}
                    relations={initialIndex.relations}
                    selectedKey={selectedKey}
                    onSelect={openDetail}
                />
            )}
        </div>
    );
}

function TreeView({
    situations,
    selectedKey,
    onSelect,
}: {
    situations: ExperienceTreeSituationSummary[];
    selectedKey: string | null;
    onSelect: (key: string) => void;
}) {
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
    const grouped = useMemo(() => {
        const result = new Map<DecisionDomain, Map<string, ExperienceTreeSituationSummary[]>>();
        situations.forEach((item) => {
            const byCategory =
                result.get(item.domain) ?? new Map<string, ExperienceTreeSituationSummary[]>();
            const category = categoryFor(item);
            byCategory.set(category.key, [...(byCategory.get(category.key) ?? []), item]);
            result.set(item.domain, byCategory);
        });
        return result;
    }, [situations]);

    const toggle = (key: string) => {
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };
    const isOpen = (key: string) => expanded.has(key);

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <FolderRow
                label="개발자 온톨로지"
                description="하나의 지식 루트에서 영역·역량·주제·의사결정 순서로 탐색합니다."
                count={situations.length}
                open={isOpen('root')}
                onToggle={() => toggle('root')}
                root
            />
            {isOpen('root') && (
                <div className="ml-9 border-l border-slate-200 pb-5 pl-5 sm:ml-12">
                    {[...grouped.entries()].map(([domain, categories], domainIndex) => {
                        const domainKey = `domain:${domain}`;
                        const domainCount = [...categories.values()].reduce(
                            (total, items) => total + items.length,
                            0
                        );
                        return (
                            <TreeBranch key={domain} last={domainIndex === grouped.size - 1}>
                                <FolderRow
                                    label={DOMAIN_META[domain].label}
                                    description={DOMAIN_META[domain].description}
                                    count={domainCount}
                                    open={isOpen(domainKey)}
                                    onToggle={() => toggle(domainKey)}
                                    emphasis="domain"
                                />
                                {isOpen(domainKey) && (
                                    <div className="ml-6 border-l border-slate-200 pl-5">
                                        {[...categories.entries()].map(
                                            ([categoryKey, items], categoryIndex) => {
                                                const category = categoryFor(items[0]);
                                                const folderKey = `${domainKey}:category:${categoryKey}`;
                                                const topics = new Map<
                                                    string,
                                                    ExperienceTreeSituationSummary[]
                                                >();
                                                items.forEach((item) =>
                                                    topics.set(item.topic, [
                                                        ...(topics.get(item.topic) ?? []),
                                                        item,
                                                    ])
                                                );
                                                return (
                                                    <TreeBranch
                                                        key={categoryKey}
                                                        last={categoryIndex === categories.size - 1}
                                                    >
                                                        <FolderRow
                                                            label={category.label}
                                                            description={category.description}
                                                            count={items.length}
                                                            open={isOpen(folderKey)}
                                                            onToggle={() => toggle(folderKey)}
                                                        />
                                                        {isOpen(folderKey) && (
                                                            <div className="ml-6 border-l border-slate-200 pl-5">
                                                                {[...topics.entries()].map(
                                                                    (
                                                                        [topic, topicItems],
                                                                        topicIndex
                                                                    ) => {
                                                                        const topicKey = `${folderKey}:topic:${topic}`;
                                                                        return (
                                                                            <TreeBranch
                                                                                key={topic}
                                                                                last={
                                                                                    topicIndex ===
                                                                                    topics.size - 1
                                                                                }
                                                                            >
                                                                                <FolderRow
                                                                                    label={
                                                                                        category
                                                                                            .topics[
                                                                                            topic
                                                                                        ] ?? topic
                                                                                    }
                                                                                    count={
                                                                                        topicItems.length
                                                                                    }
                                                                                    open={isOpen(
                                                                                        topicKey
                                                                                    )}
                                                                                    onToggle={() =>
                                                                                        toggle(
                                                                                            topicKey
                                                                                        )
                                                                                    }
                                                                                    emphasis="topic"
                                                                                />
                                                                                {isOpen(
                                                                                    topicKey
                                                                                ) && (
                                                                                    <DecisionTree
                                                                                        items={
                                                                                            topicItems
                                                                                        }
                                                                                        selectedKey={
                                                                                            selectedKey
                                                                                        }
                                                                                        onSelect={
                                                                                            onSelect
                                                                                        }
                                                                                    />
                                                                                )}
                                                                            </TreeBranch>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        )}
                                                    </TreeBranch>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </TreeBranch>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function FolderRow({
    label,
    description,
    count,
    open,
    onToggle,
    root = false,
    emphasis = 'folder',
}: {
    label: string;
    description?: string;
    count: number;
    open: boolean;
    onToggle: () => void;
    root?: boolean;
    emphasis?: 'domain' | 'folder' | 'topic';
}) {
    const FolderIcon = open ? FolderOpen : Folder;
    return (
        <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className={`group flex w-full items-center gap-3 rounded-xl text-left transition hover:bg-slate-50 ${root ? 'p-5 sm:p-6' : 'px-2 py-2.5'}`}
        >
            <span className="grid h-6 w-6 shrink-0 place-items-center text-slate-400">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            {root ? (
                <GitBranch className="h-6 w-6 shrink-0 text-blue-600" />
            ) : emphasis === 'domain' ? (
                <Layers3 className="h-5 w-5 shrink-0 text-blue-600" />
            ) : (
                <FolderIcon
                    className={`h-5 w-5 shrink-0 ${emphasis === 'topic' ? 'text-amber-500' : 'text-blue-500'}`}
                />
            )}
            <span className="min-w-0 flex-1">
                <span
                    className={`block text-slate-900 ${root ? 'text-xl font-black' : emphasis === 'domain' ? 'text-base font-black' : 'text-sm font-bold'}`}
                >
                    {label}
                </span>
                {description && (
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {description}
                    </span>
                )}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                {count}
            </span>
        </button>
    );
}

function TreeBranch({ children, last }: { children: React.ReactNode; last: boolean }) {
    return (
        <div className="relative py-1">
            <span className="absolute -left-5 top-0 h-7 w-5 rounded-bl-lg border-b border-l border-slate-200" />
            {last && <span className="absolute -left-[21px] top-7 bottom-0 w-1 bg-white" />}
            {children}
        </div>
    );
}

function DecisionTree({
    items,
    selectedKey,
    onSelect,
}: {
    items: ExperienceTreeSituationSummary[];
    selectedKey: string | null;
    onSelect: (key: string) => void;
}) {
    const keys = new Set(items.map((item) => item.stableKey));
    const children = new Map<string, ExperienceTreeSituationSummary[]>();
    items.forEach((item) => {
        if (item.parentKey && keys.has(item.parentKey)) {
            children.set(item.parentKey, [...(children.get(item.parentKey) ?? []), item]);
        }
    });
    const roots = items.filter((item) => !item.parentKey || !keys.has(item.parentKey));
    const renderNode = (item: ExperienceTreeSituationSummary, last: boolean) => (
        <li key={item.stableKey} className="relative py-0.5">
            <span className="absolute -left-5 top-0 h-6 w-5 rounded-bl-lg border-b border-l border-slate-200" />
            {last && <span className="absolute -left-[21px] top-6 bottom-0 w-1 bg-white" />}
            <button
                type="button"
                onClick={() => onSelect(item.stableKey)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${selectedKey === item.stableKey ? 'bg-slate-900 font-bold text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
                <FileText className="h-4 w-4 shrink-0 opacity-60" />
                <span className="min-w-0 flex-1">{item.title}</span>
                <span className="hidden shrink-0 text-[10px] opacity-50 sm:inline">
                    선택지 {item.optionCount}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-40" />
            </button>
            {(children.get(item.stableKey)?.length ?? 0) > 0 && (
                <ul className="ml-5 border-l border-slate-200 pl-5">
                    {children
                        .get(item.stableKey)!
                        .map((child, index, siblings) =>
                            renderNode(child, index === siblings.length - 1)
                        )}
                </ul>
            )}
        </li>
    );
    return (
        <ul className="ml-6 border-l border-slate-200 pl-5">
            {roots.map((item, index) => renderNode(item, index === roots.length - 1))}
        </ul>
    );
}

function ListView({
    situations,
    selectedKey,
    onSelect,
}: {
    situations: ExperienceTreeSituationSummary[];
    selectedKey: string | null;
    onSelect: (key: string) => void;
}) {
    return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {situations.map((item) => (
                <button
                    key={item.stableKey}
                    type="button"
                    onClick={() => onSelect(item.stableKey)}
                    className={`rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedKey === item.stableKey ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200 bg-white'}`}
                >
                    <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                        {categoryBreadcrumb(item).join(' › ')}
                    </p>
                    <h2 className="mt-2 font-black text-slate-950">{item.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {item.summary}
                    </p>
                    <p className="mt-3 text-xs font-bold text-slate-400">
                        선택지 {item.optionCount} · 경고 {item.warningCount} · 연결 Study{' '}
                        {item.studyCount}
                    </p>
                </button>
            ))}
        </div>
    );
}

function DecisionMapView({
    situations,
    relations,
    selectedKey,
    onSelect,
}: {
    situations: ExperienceTreeSituationSummary[];
    relations: ExperienceTreeSituationRelation[];
    selectedKey: string | null;
    onSelect: (key: string) => void;
}) {
    const domainOrder: DecisionDomain[] = ['BACKEND', 'ARCHITECTURE', 'INFRASTRUCTURE', 'FRONTEND'];
    const nodeKeys = new Set(situations.map((item) => item.stableKey));
    const relationColor: Record<ExperienceTreeSituationRelation['relationType'], string> = {
        PREREQUISITE: '#2563eb',
        LEADS_TO: '#7c3aed',
        ALTERNATIVE: '#d97706',
        COMBINES_WITH: '#059669',
    };
    const nodes: Node[] = [];
    const hierarchyEdges: Edge[] = [];
    let verticalOffset = 0;
    domainOrder.forEach((itemDomain) => {
        const domainItems = situations.filter((item) => item.domain === itemDomain);
        if (domainItems.length === 0) return;
        const domainId = `domain:${itemDomain}`;
        const domainStart = verticalOffset;
        const categories = new Map<string, ExperienceTreeSituationSummary[]>();
        domainItems.forEach((item) => {
            const category = categoryFor(item);
            categories.set(category.key, [...(categories.get(category.key) ?? []), item]);
        });
        categories.forEach((categoryItems, categoryKey) => {
            const category = categoryFor(categoryItems[0]);
            const categoryId = `${domainId}:category:${categoryKey}`;
            const categoryStart = verticalOffset;
            const topics = new Map<string, ExperienceTreeSituationSummary[]>();
            categoryItems.forEach((item) =>
                topics.set(item.topic, [...(topics.get(item.topic) ?? []), item])
            );
            topics.forEach((topicItems, topic) => {
                const topicId = `${categoryId}:topic:${topic}`;
                const topicStart = verticalOffset;
                topicItems.forEach((item) => {
                    nodes.push({
                        id: item.stableKey,
                        position: { x: 960, y: verticalOffset },
                        data: { label: item.title, kind: 'DECISION' },
                        style: ontologyNodeStyle('DECISION', selectedKey === item.stableKey),
                    });
                    hierarchyEdges.push(ontologyEdge(topicId, item.stableKey));
                    verticalOffset += 92;
                });
                nodes.push({
                    id: topicId,
                    position: { x: 650, y: topicStart + ((topicItems.length - 1) * 92) / 2 },
                    data: { label: category.topics[topic] ?? topic, kind: 'TOPIC' },
                    style: ontologyNodeStyle('TOPIC'),
                });
                hierarchyEdges.push(ontologyEdge(categoryId, topicId));
            });
            nodes.push({
                id: categoryId,
                position: { x: 330, y: categoryStart + (verticalOffset - categoryStart) / 2 - 25 },
                data: { label: category.label, kind: 'CAPABILITY' },
                style: ontologyNodeStyle('CAPABILITY'),
            });
            hierarchyEdges.push(ontologyEdge(domainId, categoryId));
            verticalOffset += 42;
        });
        nodes.push({
            id: domainId,
            position: { x: 20, y: domainStart + (verticalOffset - domainStart) / 2 - 25 },
            data: { label: DOMAIN_META[itemDomain].label, kind: 'DOMAIN' },
            style: ontologyNodeStyle('DOMAIN'),
        });
        verticalOffset += 80;
    });
    const relationEdges: Edge[] = relations
        .filter((relation) => nodeKeys.has(relation.sourceKey) && nodeKeys.has(relation.targetKey))
        .map((relation) => ({
            id: `${relation.sourceKey}-${relation.targetKey}-${relation.relationType}`,
            source: relation.sourceKey,
            target: relation.targetKey,
            label: relation.relationType,
            type: 'smoothstep',
            animated: relation.relationType === 'LEADS_TO',
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: relationColor[relation.relationType],
            },
            style: { stroke: relationColor[relation.relationType], strokeWidth: 1.5 },
            labelStyle: {
                fontSize: 9,
                fontWeight: 700,
                fill: relationColor[relation.relationType],
            },
        }));
    const edges = [...hierarchyEdges, ...relationEdges];
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-[680px] bg-slate-50">
                {nodes.length === 0 ? (
                    <EmptyPanel text="표시할 상황이 없습니다." />
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodeClick={(_, node) => {
                            if (node.data.kind === 'DECISION') onSelect(node.id);
                        }}
                        nodesConnectable={false}
                        nodesDraggable
                        fitView
                        minZoom={0.2}
                        maxZoom={2}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background gap={22} size={1} />
                        <Controls />
                        <MiniMap pannable zoomable />
                    </ReactFlow>
                )}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-slate-100 p-3 text-[11px] font-bold text-slate-500">
                <span>Domain → Capability → Topic → Decision</span>
                {Object.entries(relationColor).map(([type, color]) => (
                    <span key={type} className="inline-flex items-center gap-1.5">
                        <i className="h-0.5 w-5" style={{ backgroundColor: color }} /> {type}
                    </span>
                ))}
                <span className="ml-auto">
                    드래그·확대·축소가 가능하며 노드를 선택하면 상세를 엽니다.
                </span>
            </div>
        </section>
    );
}

function ontologyNodeStyle(kind: 'DOMAIN' | 'CAPABILITY' | 'TOPIC' | 'DECISION', selected = false) {
    const styles = {
        DOMAIN: {
            width: 220,
            background: '#0f172a',
            color: '#ffffff',
            border: '1px solid #0f172a',
        },
        CAPABILITY: {
            width: 240,
            background: '#dbeafe',
            color: '#1e3a8a',
            border: '1px solid #93c5fd',
        },
        TOPIC: { width: 230, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' },
        DECISION: {
            width: 270,
            background: selected ? '#eff6ff' : '#ffffff',
            color: '#0f172a',
            border: selected ? '2px solid #2563eb' : '1px solid #cbd5e1',
        },
    } as const;
    return {
        ...styles[kind],
        borderRadius: 14,
        fontSize: 12,
        fontWeight: 800,
        padding: 14,
        boxShadow: '0 1px 3px rgb(15 23 42 / 0.08)',
    };
}

function ontologyEdge(source: string, target: string): Edge {
    return {
        id: `ontology:${source}:${target}`,
        source,
        target,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 1.4 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    };
}

export function MatrixView({
    detail,
    loading,
}: {
    detail?: ExperienceTreeDetail;
    loading: boolean;
}) {
    if (loading) return <LoadingPanel />;
    if (!detail) return <EmptyPanel text="비교할 상황을 먼저 선택해주세요." />;
    const criteria = [
        ...new Set(
            detail.options.flatMap((option) => option.tradeoffs.map((item) => item.criterion))
        ),
    ];
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">{detail.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                    선택지별 상대적인 판단 기준입니다. 수치가 아닌 설명을 함께 확인하세요.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left">판단 기준</th>
                            {detail.options.map((option) => (
                                <th key={option.stableKey} className="min-w-52 px-4 py-3 text-left">
                                    {option.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {criteria.map((criterion) => (
                            <tr key={criterion} className="border-t border-slate-100">
                                <th className="px-4 py-4 text-left font-bold text-slate-700">
                                    {CRITERION_LABELS[criterion]}
                                </th>
                                {detail.options.map((option) => {
                                    const item = option.tradeoffs.find(
                                        (value) => value.criterion === criterion
                                    );
                                    return (
                                        <td key={option.stableKey} className="px-4 py-4 align-top">
                                            {item ? (
                                                <>
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[11px] font-black ${LEVEL_STYLE[item.level]}`}
                                                    >
                                                        {item.level}
                                                    </span>
                                                    <p className="mt-2 leading-5 text-slate-600">
                                                        {item.explanation}
                                                    </p>
                                                </>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export function TimelineView({
    situations,
    detail,
    loading,
    onSelect,
}: {
    situations: ExperienceTreeSituationSummary[];
    detail?: ExperienceTreeDetail;
    loading: boolean;
    onSelect: (key: string) => void;
}) {
    if (loading) return <LoadingPanel />;
    const events = [
        ...situations
            .filter((item) => item.nextReviewAt)
            .map((item) => ({
                id: `review-${item.stableKey}`,
                date: item.nextReviewAt!,
                type: 'REVIEW' as const,
                title: item.title,
                subtitle: `${DOMAIN_LABELS[item.domain]} · 정적 지식 재검토`,
                key: item.stableKey,
            })),
        ...(detail?.studies ?? []).map((study) => ({
            id: `study-${study.linkId}`,
            date: study.learnedAt,
            type: 'STUDY' as const,
            title: study.title,
            subtitle: `${study.section} · ${study.relationType}`,
            slug: study.slug,
        })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">검토·회고 타임라인</h2>
            <p className="mt-1 text-sm text-slate-500">
                검색 결과의 재검토 일정과 선택한 상황의 Study 기록을 시간순으로 봅니다.
            </p>
            {events.length === 0 ? (
                <p className="mt-8 text-center text-sm text-slate-400">
                    표시할 일정과 회고가 없습니다.
                </p>
            ) : (
                <ol className="mt-6 border-l-2 border-slate-200 pl-6">
                    {events.map((event) => (
                        <li key={event.id} className="relative pb-7">
                            <span
                                className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ${event.type === 'STUDY' ? 'bg-blue-600 ring-blue-100' : 'bg-amber-500 ring-amber-100'}`}
                            />
                            <p className="text-xs font-bold text-slate-400">
                                {event.date} ·{' '}
                                {event.type === 'STUDY' ? 'Study 회고' : '카탈로그 재검토'}
                            </p>
                            {'slug' in event ? (
                                <Link
                                    href={`/study/${event.slug}`}
                                    className="mt-1 block font-black text-slate-900 hover:text-blue-600"
                                >
                                    {event.title}
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => event.key && onSelect(event.key)}
                                    className="mt-1 block text-left font-black text-slate-900 hover:text-blue-600"
                                >
                                    {event.title}
                                </button>
                            )}
                            <p className="mt-1 text-sm text-slate-600">{event.subtitle}</p>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

export function DetailPanel({
    detail,
    loading,
    onSelect,
}: {
    detail?: ExperienceTreeDetail;
    loading: boolean;
    onSelect: (key: string) => void;
}) {
    if (loading) return <LoadingPanel />;
    if (!detail) return <EmptyPanel text="왼쪽에서 구현 상황을 선택해주세요." />;
    return (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                    {DOMAIN_LABELS[detail.domain]} · {detail.topic}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{detail.title}</h2>
                <p className="mt-2 leading-7 text-slate-600">{detail.summary}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">Problem</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{detail.problem}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
                {detail.options.map((option) => (
                    <article
                        key={option.stableKey}
                        className="rounded-2xl border border-slate-200 p-5"
                    >
                        <h3 className="font-black text-slate-950">{option.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{option.summary}</p>
                        <dl className="mt-4 space-y-3 text-sm">
                            <div>
                                <dt className="font-bold text-slate-900">동작 원리</dt>
                                <dd className="mt-1 whitespace-pre-line text-slate-600">
                                    {option.mechanism}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-bold text-emerald-700">적합한 경우</dt>
                                <dd className="mt-1 whitespace-pre-line text-slate-600">
                                    {option.applicableWhen}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-bold text-rose-700">피해야 하는 경우</dt>
                                <dd className="mt-1 whitespace-pre-line text-slate-600">
                                    {option.avoidWhen}
                                </dd>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <dt className="font-bold text-blue-700">장점</dt>
                                    <dd className="mt-1 whitespace-pre-line text-slate-600">
                                        {option.advantages}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-bold text-amber-700">단점</dt>
                                    <dd className="mt-1 whitespace-pre-line text-slate-600">
                                        {option.disadvantages}
                                    </dd>
                                </div>
                            </div>
                            {option.operationalNotes && (
                                <div>
                                    <dt className="font-bold text-violet-700">운영 메모</dt>
                                    <dd className="mt-1 whitespace-pre-line text-slate-600">
                                        {option.operationalNotes}
                                    </dd>
                                </div>
                            )}
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {option.tradeoffs.map((tradeoff) => (
                                <span
                                    key={tradeoff.criterion}
                                    title={tradeoff.explanation}
                                    className={`rounded-full px-2 py-1 text-[10px] font-black ${LEVEL_STYLE[tradeoff.level]}`}
                                >
                                    {CRITERION_LABELS[tradeoff.criterion]} · {tradeoff.level}
                                </span>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
            {detail.warnings.length > 0 && (
                <div>
                    <h3 className="mb-3 flex items-center gap-2 font-black text-rose-800">
                        <AlertTriangle className="h-5 w-5" />
                        잘못된 접근과 주의사항
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {detail.warnings.map((warning) => (
                            <article
                                key={warning.stableKey}
                                className="rounded-xl border border-rose-200 bg-rose-50/50 p-4"
                            >
                                <p className="text-[11px] font-black text-rose-600">
                                    {warning.classification} · {warning.severity}
                                </p>
                                <h4 className="mt-1 font-black text-rose-950">{warning.title}</h4>
                                <p className="mt-2 text-sm leading-6 text-rose-900/70">
                                    {warning.description}
                                </p>
                                <p className="mt-2 text-xs font-bold text-rose-800">
                                    교정: {warning.correction}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            )}
            {detail.contextMarkdown && (
                <div className="prose prose-slate max-w-none">
                    <h3>상황과 판단 맥락</h3>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {detail.contextMarkdown}
                    </ReactMarkdown>
                </div>
            )}
            {detail.constraintsMarkdown && (
                <div className="prose prose-slate max-w-none rounded-xl bg-slate-50 p-4">
                    <h3>제약 조건</h3>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {detail.constraintsMarkdown}
                    </ReactMarkdown>
                </div>
            )}
            {detail.relations.length > 0 && (
                <div>
                    <h3 className="mb-3 font-black text-slate-900">연결된 의사결정</h3>
                    <div className="flex flex-wrap gap-2">
                        {detail.relations.map((relation) => {
                            const relatedKey =
                                relation.sourceKey === detail.stableKey
                                    ? relation.targetKey
                                    : relation.sourceKey;
                            return (
                                <button
                                    type="button"
                                    key={`${relation.sourceKey}-${relation.targetKey}-${relation.relationType}`}
                                    onClick={() => onSelect(relatedKey)}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <b className="text-blue-700">{relation.relationType}</b>
                                    <span className="ml-2 text-slate-600">{relatedKey}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
                <div>
                    <h3 className="mb-3 flex items-center gap-2 font-black text-slate-900">
                        <BookOpen className="h-4 w-4" />
                        연결된 Study
                    </h3>
                    {detail.studies.length === 0 ? (
                        <p className="text-sm text-slate-400">연결된 공개 Study가 없습니다.</p>
                    ) : (
                        <div className="space-y-2">
                            {detail.studies.map((study) => (
                                <Link
                                    key={study.linkId}
                                    href={`/study/${study.slug}`}
                                    className="block rounded-xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <p className="text-xs font-bold text-blue-600">
                                        {study.section} · {study.relationType}
                                    </p>
                                    <p className="mt-1 font-bold text-slate-900">{study.title}</p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="mb-3 font-black text-slate-900">근거 자료</h3>
                    <div className="space-y-2">
                        {detail.sources.map((source) => (
                            <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700 hover:border-blue-300"
                            >
                                <span>
                                    <b>{source.publisher}</b>
                                    <br />
                                    {source.title}
                                    {(source.optionKey || source.warningKey) && (
                                        <small className="mt-1 block text-blue-600">
                                            {source.optionKey
                                                ? `선택지: ${source.optionKey}`
                                                : `주의사항: ${source.warningKey}`}
                                        </small>
                                    )}
                                </span>
                                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function LoadingPanel() {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />;
}
function EmptyPanel({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
            {text}
        </div>
    );
}
