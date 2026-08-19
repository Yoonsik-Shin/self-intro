import type { Study, StudySection } from './api/types';

export const SECTION_ORDER: StudySection[] = ['FUNDAMENTAL', 'ADVANCED', 'RETROSPECT', 'ETC'];
export const SECTION_LABEL: Record<StudySection, string> = {
    FUNDAMENTAL: 'Fundamental',
    ADVANCED: 'Advanced',
    RETROSPECT: 'Retrospect',
    ETC: 'ETC',
};

export type StudyCategoryGroup = {
    key: string;
    label: string;
    taxonomyNodeId: number | null;
    items: Study[];
};

export type StudySectionGroup = {
    section: StudySection;
    count: number;
    groups: StudyCategoryGroup[];
};

/** study를 section별로 묶고, 그 안에서 첫 번째로 붙은 taxonomy 노드(주제)를 기준으로 다시 묶는다.
 * 트리/그래프 뷰, 사이드바 카테고리 필터가 전부 이 그룹핑을 공유한다 — 로직이 갈라지면
 * 화면마다 다른 카테고리가 보이는 문제가 생긴다. */
export function groupStudiesBySectionAndTaxonomy(studies: Study[]): StudySectionGroup[] {
    const bySection = new Map<StudySection, Map<string, StudyCategoryGroup>>();
    studies.forEach((study) => {
        const sectionMap = bySection.get(study.section) ?? new Map<string, StudyCategoryGroup>();
        const primary = study.taxonomyNodes[0];
        const key = primary ? String(primary.id) : 'uncategorized';
        const group = sectionMap.get(key) ?? {
            key,
            label: primary?.name ?? '미분류',
            taxonomyNodeId: primary?.id ?? null,
            items: [],
        };
        group.items.push(study);
        sectionMap.set(key, group);
        bySection.set(study.section, sectionMap);
    });
    return SECTION_ORDER.filter((section) => bySection.has(section)).map((section) => {
        const groups = [...bySection.get(section)!.values()];
        return {
            section,
            count: groups.reduce((sum, group) => sum + group.items.length, 0),
            groups,
        };
    });
}
