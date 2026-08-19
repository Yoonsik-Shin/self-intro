'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studyApi } from '@/lib/api';
import type { Study, StudySection } from '@/lib/api/types';
import { SECTION_LABEL, groupStudiesBySectionAndTaxonomy } from '@/lib/studyCategoryGroups';

type Props = {
    workspaceSlug?: string;
    previewMode?: boolean;
    initialStudies: Study[];
    activeSection: StudySection | null;
    activeTaxonomyNodeId: number | null;
    onSelect: (section: StudySection | null, taxonomyNodeId: number | null) => void;
};

export function StudyCategorySidebar({
    workspaceSlug,
    previewMode = false,
    initialStudies,
    activeSection,
    activeTaxonomyNodeId,
    onSelect,
}: Props) {
    // 그래프/트리 뷰와 같은 캐시 키를 써서 react-query가 자동으로 공유한다 —
    // 트리·그래프가 먼저 불러왔다면 여기서 또 네트워크를 타지 않는다.
    const { data: allStudies } = useQuery<Study[]>({
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
    const sections = useMemo(() => groupStudiesBySectionAndTaxonomy(studies), [studies]);
    const total = studies.length;

    return (
        <nav className="space-y-3 text-xs">
            <button
                type="button"
                onClick={() => onSelect(null, null)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-bold transition ${
                    activeSection === null && activeTaxonomyNodeId === null
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
                <span>전체</span>
                <span
                    className={
                        activeSection === null && activeTaxonomyNodeId === null
                            ? 'text-white/70'
                            : 'text-slate-400'
                    }
                >
                    {total}
                </span>
            </button>

            {sections.map(({ section, count, groups }) => {
                const sectionActive = activeSection === section && activeTaxonomyNodeId === null;
                return (
                    <div key={section}>
                        <button
                            type="button"
                            onClick={() => onSelect(section, null)}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-black transition ${
                                sectionActive
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            <span>{SECTION_LABEL[section]}</span>
                            <span className={sectionActive ? 'text-white/70' : 'text-slate-400'}>
                                {count}
                            </span>
                        </button>
                        <div className="mt-0.5 space-y-0.5 pl-3">
                            {groups.map((group) => {
                                const groupActive =
                                    activeSection === section &&
                                    activeTaxonomyNodeId === group.taxonomyNodeId;
                                return (
                                    <button
                                        key={group.key}
                                        type="button"
                                        onClick={() => onSelect(section, group.taxonomyNodeId)}
                                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left font-semibold transition ${
                                            groupActive
                                                ? 'bg-slate-900 text-white'
                                                : 'text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="truncate">{group.label}</span>
                                        <span
                                            className={`shrink-0 ${groupActive ? 'text-white/70' : 'text-slate-400'}`}
                                        >
                                            {group.items.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </nav>
    );
}
