'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    FileText,
    Folder,
    FolderOpen,
    GitBranch,
    History,
    MoreHorizontal,
    Rocket,
} from 'lucide-react';
import { studyApi } from '@/lib/api';
import type { Study, StudySection } from '@/lib/api/types';
import { SECTION_LABEL, groupStudiesBySectionAndTaxonomy } from '@/lib/studyCategoryGroups';

const SECTION_DESCRIPTION: Record<StudySection, string> = {
    FUNDAMENTAL: '언어 문법, 자료구조, 알고리즘 등 기초를 다지는 학습 기록',
    ADVANCED: '아키텍처·인프라·AI 등 실무에 적용한 심화 설계와 구현',
    RETROSPECT: '실제 프로젝트에서 겪은 문제와 해결 과정을 되짚는 회고',
    ETC: '분류하기 애매한 실습 자료와 기타 기록',
};
const SECTION_ICON: Record<StudySection, typeof BookOpen> = {
    FUNDAMENTAL: BookOpen,
    ADVANCED: Rocket,
    RETROSPECT: History,
    ETC: MoreHorizontal,
};

type Props = {
    workspaceSlug?: string;
    previewMode?: boolean;
    initialStudies: Study[];
    search: string;
    activeSection: StudySection | null;
    activeTaxonomyNodeId: number | null;
};

export function StudyTreeView({
    workspaceSlug,
    previewMode = false,
    initialStudies,
    search,
    activeSection,
    activeTaxonomyNodeId,
}: Props) {
    const router = useRouter();
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));

    // 그래프 뷰와 같은 캐시 키를 써서(react-query가 알아서 공유) 중복 네트워크 요청 없이
    // 전체 study 목록을 가져온다 — 트리도 리스트의 무한스크롤 페이지만으로는 완전한 구조를 못 그린다.
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

    const sections = useMemo(() => groupStudiesBySectionAndTaxonomy(filtered), [filtered]);

    const toggle = (key: string) => {
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };
    const isOpen = (key: string) => expanded.has(key);

    const studyBasePath = workspaceSlug
        ? `/workspace/${encodeURIComponent(workspaceSlug)}/study`
        : '/study';

    if (isLoading && !allStudies) {
        return (
            <section className="rounded-lg border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
                트리를 불러오는 중...
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <FolderRow
                label="Study 전체"
                description="4대 카테고리와 주제별로 학습 기록을 탐색합니다."
                count={filtered.length}
                open={isOpen('root')}
                onToggle={() => toggle('root')}
                root
            />
            {isOpen('root') && (
                <div className="ml-9 pb-5 pl-5 sm:ml-12">
                    {sections.map(({ section, count: sectionCount, groups }, sectionIndex) => {
                        const sectionKey = `section:${section}`;
                        const sectionLast = sectionIndex === sections.length - 1;
                        const SectionIcon = SECTION_ICON[section];

                        return (
                            <TreeBranch key={section} last={sectionLast}>
                                <FolderRow
                                    label={SECTION_LABEL[section]}
                                    description={SECTION_DESCRIPTION[section]}
                                    count={sectionCount}
                                    open={isOpen(sectionKey)}
                                    onToggle={() => toggle(sectionKey)}
                                    icon={SectionIcon}
                                    emphasis="domain"
                                />
                                {isOpen(sectionKey) && (
                                    <div className="ml-6 pl-5">
                                        {groups.map((group, groupIndex) => {
                                            const folderKey = `${sectionKey}:group:${group.key}`;
                                            const groupLast = groupIndex === groups.length - 1;
                                            const items = [...group.items].sort((a, b) =>
                                                a.title.localeCompare(b.title)
                                            );

                                            return (
                                                <TreeBranch key={group.key} last={groupLast}>
                                                    <FolderRow
                                                        label={group.label}
                                                        description={`${group.items.length}건의 학습 기록`}
                                                        count={group.items.length}
                                                        open={isOpen(folderKey)}
                                                        onToggle={() => toggle(folderKey)}
                                                    />
                                                    {isOpen(folderKey) && (
                                                        <div className="ml-6 pl-5">
                                                            {items.map((study, itemIndex) => {
                                                                const itemLast =
                                                                    itemIndex === items.length - 1;
                                                                return (
                                                                    <TreeBranch
                                                                        key={study.id}
                                                                        last={itemLast}
                                                                        compact
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (previewMode)
                                                                                    return;
                                                                                router.push(
                                                                                    `${studyBasePath}/${encodeURIComponent(study.slug)}`
                                                                                );
                                                                            }}
                                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                                                                        >
                                                                            <FileText className="h-4 w-4 shrink-0 opacity-60" />
                                                                            <span className="min-w-0 flex-1">
                                                                                {study.title}
                                                                            </span>
                                                                            <span className="hidden shrink-0 text-[10px] opacity-50 sm:inline">
                                                                                관련{' '}
                                                                                {
                                                                                    study
                                                                                        .relatedStudies
                                                                                        .length
                                                                                }
                                                                            </span>
                                                                            <ChevronRight className="h-4 w-4 shrink-0 opacity-40" />
                                                                        </button>
                                                                    </TreeBranch>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </TreeBranch>
                                            );
                                        })}
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
    icon: Icon,
}: {
    label: string;
    description?: string;
    count: number;
    open: boolean;
    onToggle: () => void;
    root?: boolean;
    emphasis?: 'domain' | 'folder';
    icon?: typeof BookOpen;
}) {
    const FolderIcon = open ? FolderOpen : Folder;
    return (
        <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className={`group flex w-full items-center gap-3 rounded-md text-left transition hover:bg-slate-50 ${root ? 'p-5 sm:p-6' : 'px-2 py-2.5'}`}
        >
            <span className="grid h-6 w-6 shrink-0 place-items-center text-slate-400">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            {root ? (
                <GitBranch className="h-6 w-6 shrink-0 text-blue-600" />
            ) : Icon ? (
                <Icon className="h-5 w-5 shrink-0 text-blue-600" />
            ) : (
                <FolderIcon className="h-5 w-5 shrink-0 text-blue-500" />
            )}
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span
                        className={`text-slate-900 ${root ? 'text-xl font-black' : emphasis === 'domain' ? 'text-base font-black' : 'text-sm font-bold'}`}
                    >
                        {label}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                        {count}
                    </span>
                </span>
                {description && (
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {description}
                    </span>
                )}
            </span>
        </button>
    );
}

function TreeBranch({
    children,
    last,
    compact = false,
}: {
    children: React.ReactNode;
    last: boolean;
    compact?: boolean;
}) {
    // 부모가 트렁크 선을 그리지 않는다 — 각 항목이 자기 엘보(위쪽 곡선)와, 다음 형제로
    // 이어지는 구간(!last일 때만)을 스스로 그린다. 잔여 높이를 계산해 마스킹할 필요가 없어
    // 줄 간격이 바뀌어도 항상 정확히 끊긴다.
    const elbowHeight = compact ? 'h-6' : 'h-7';
    return (
        <div className={`relative ${compact ? 'py-0.5' : 'py-1'}`}>
            <span
                className={`absolute -left-5 top-0 ${elbowHeight} w-5 rounded-bl-lg border-b border-l border-slate-200`}
            />
            {!last && (
                <span
                    className={`absolute -left-5 ${compact ? 'top-6' : 'top-7'} bottom-0 w-px bg-slate-200`}
                />
            )}
            {children}
        </div>
    );
}
