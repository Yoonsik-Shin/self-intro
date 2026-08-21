'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
import { studyApi } from '@/lib/api';
import type { Study, StudyRelationType, StudySection } from '@/lib/api/types';
import { SECTION_LABEL, groupStudiesBySectionAndTaxonomy } from '@/lib/studyCategoryGroups';

const RELATION_COLOR: Record<StudyRelationType, string> = {
    PREREQUISITE: '#2563eb',
    FOLLOW_UP: '#7c3aed',
    RELATED: '#059669',
    APPLIED_TO: '#d97706',
};

type Props = {
    workspaceSlug?: string;
    previewMode?: boolean;
    initialStudies: Study[];
    search: string;
    activeSection: StudySection | null;
    activeTaxonomyNodeId: number | null;
};

export function StudyGraphView({
    workspaceSlug,
    previewMode = false,
    initialStudies,
    search,
    activeSection,
    activeTaxonomyNodeId,
}: Props) {
    const router = useRouter();

    // 그래프는 리스트와 달리 전체 study를 한 번에 그려야 노드/엣지가 완전해진다 —
    // 리스트 뷰의 무한스크롤 페이지(size=20)만으로는 관계가 끊겨 보인다.
    const { data: allStudies, isLoading } = useQuery<Study[]>({
        queryKey: ['studies', 'graph-all', workspaceSlug],
        queryFn: async () => {
            const page = await (workspaceSlug
                ? studyApi.workspaceList(workspaceSlug, { size: 300 })
                : studyApi.list({ size: 300 }));
            return page.content;
        },
        enabled: !previewMode,
        initialData: previewMode ? initialStudies : undefined,
        staleTime: 60 * 1000,
    });

    const studies = allStudies ?? initialStudies;

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return studies.filter((study) => {
            const matchesSearch =
                !keyword ||
                [
                    study.title,
                    study.summary,
                    ...study.tags.map((tag) => tag.name),
                    ...study.skills.map((skill) => skill.name),
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(keyword);
            const matchesSection = !activeSection || study.section === activeSection;
            const matchesTaxonomy =
                activeTaxonomyNodeId === null ||
                study.taxonomyNodes.some((node) => node.id === activeTaxonomyNodeId);
            return matchesSearch && matchesSection && matchesTaxonomy;
        });
    }, [studies, search, activeSection, activeTaxonomyNodeId]);

    const { nodes, edges } = useMemo(() => buildStudyGraph(filtered), [filtered]);

    const studyBasePath = workspaceSlug
        ? `/workspace/${encodeURIComponent(workspaceSlug)}/study`
        : '/study';

    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="h-[680px] bg-slate-50">
                {isLoading && !allStudies ? (
                    <div className="grid h-full place-items-center text-sm text-slate-400">
                        그래프를 불러오는 중...
                    </div>
                ) : nodes.length === 0 ? (
                    <div className="grid h-full place-items-center text-sm text-slate-400">
                        표시할 학습 기록이 없습니다.
                    </div>
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodeClick={(_, node) => {
                            if (node.data.kind !== 'STUDY' || previewMode) return;
                            router.push(
                                `${studyBasePath}/${encodeURIComponent(node.data.slug as string)}`
                            );
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
                <span>Section → Taxonomy → Study</span>
                {Object.entries(RELATION_COLOR).map(([type, color]) => (
                    <span key={type} className="inline-flex items-center gap-1.5">
                        <i className="h-0.5 w-5" style={{ backgroundColor: color }} /> {type}
                    </span>
                ))}
                <span className="ml-auto">
                    드래그·확대·축소가 가능하며 노드를 선택하면 상세로 이동합니다.
                </span>
            </div>
        </section>
    );
}

function buildStudyGraph(studies: Study[]): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const hierarchyEdges: Edge[] = [];
    const studyIds = new Set(studies.map((study) => study.id));
    let verticalOffset = 0;

    groupStudiesBySectionAndTaxonomy(studies).forEach(({ section, groups }) => {
        const sectionId = `section:${section}`;
        const sectionStart = verticalOffset;

        groups.forEach((group) => {
            const taxonomyId = `taxonomy:${section}:${group.key}`;
            const groupStart = verticalOffset;

            [...group.items]
                .sort((a, b) => a.title.localeCompare(b.title))
                .forEach((study) => {
                    const studyNodeId = `study:${study.id}`;
                    nodes.push({
                        id: studyNodeId,
                        position: { x: 650, y: verticalOffset },
                        data: { label: study.title, kind: 'STUDY', slug: study.slug },
                        style: studyNodeStyle('STUDY'),
                    });
                    hierarchyEdges.push(hierarchyEdge(taxonomyId, studyNodeId));
                    verticalOffset += 76;
                });

            nodes.push({
                id: taxonomyId,
                position: { x: 330, y: groupStart + (verticalOffset - groupStart) / 2 - 22 },
                data: { label: group.label, kind: 'TAXONOMY' },
                style: studyNodeStyle('TAXONOMY'),
            });
            hierarchyEdges.push(hierarchyEdge(sectionId, taxonomyId));
            verticalOffset += 36;
        });

        nodes.push({
            id: sectionId,
            position: { x: 20, y: sectionStart + (verticalOffset - sectionStart) / 2 - 22 },
            data: { label: SECTION_LABEL[section], kind: 'SECTION' },
            style: studyNodeStyle('SECTION'),
        });
        verticalOffset += 70;
    });

    const relationEdges: Edge[] = studies.flatMap((study) =>
        study.relatedStudies
            .filter((related) => studyIds.has(related.id))
            .map((related) => ({
                id: `relation:${study.id}:${related.id}:${related.type}`,
                source: `study:${study.id}`,
                target: `study:${related.id}`,
                label: related.type,
                type: 'smoothstep',
                animated: related.type === 'FOLLOW_UP',
                markerEnd: { type: MarkerType.ArrowClosed, color: RELATION_COLOR[related.type] },
                style: { stroke: RELATION_COLOR[related.type], strokeWidth: 1.5 },
                labelStyle: {
                    fontSize: 9,
                    fontWeight: 700,
                    fill: RELATION_COLOR[related.type],
                },
            }))
    );

    return { nodes, edges: [...hierarchyEdges, ...relationEdges] };
}

function studyNodeStyle(kind: 'SECTION' | 'TAXONOMY' | 'STUDY') {
    const styles = {
        SECTION: {
            width: 200,
            background: '#0f172a',
            color: '#ffffff',
            border: '1px solid #0f172a',
        },
        TAXONOMY: {
            width: 230,
            background: '#dbeafe',
            color: '#1e3a8a',
            border: '1px solid #93c5fd',
        },
        STUDY: {
            width: 270,
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
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

function hierarchyEdge(source: string, target: string): Edge {
    return {
        id: `hierarchy:${source}:${target}`,
        source,
        target,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 1.4 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    };
}
