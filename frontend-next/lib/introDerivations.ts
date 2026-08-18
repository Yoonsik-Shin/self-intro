import type { Experience, ExperienceDetail, IntroductionResponse, Skill } from './api/types';
import { credentialKindLabel, formatShortPeriod } from './format';

export type SkillGroup = {
    value: 'CORE' | 'PROJECT_LEARNING';
    label: string;
    skills: Skill[];
};

export type SkillOutputGroup = SkillGroup['value'];

/** 과거 데이터의 WORK 값까지 현재 출력 그룹으로 안전하게 정규화한다. */
export function getSkillOutputGroup(skill: Skill): SkillOutputGroup {
    if (skill.usageType === 'WORK' || skill.usageType === 'WORK_EXPERIENCE') return 'CORE';
    return 'PROJECT_LEARNING';
}

export function groupSkillsByUsage(skills: Skill[]): SkillGroup[] {
    return [
        {
            value: 'CORE',
            label: '핵심 기술 스택',
            skills: skills
                .filter((skill) => getSkillOutputGroup(skill) === 'CORE')
                .sort((a, b) => a.displayOrder - b.displayOrder),
        },
        {
            value: 'PROJECT_LEARNING',
            label: '프로젝트/학습',
            skills: skills
                .filter((skill) => getSkillOutputGroup(skill) === 'PROJECT_LEARNING')
                .sort((a, b) => a.displayOrder - b.displayOrder),
        },
    ];
}

export function groupCoreSkills(skills: Skill[]): SkillGroup[] {
    return groupSkillsByUsage(skills.filter((skill) => skill.isCore));
}

export type CareerCard = {
    id: number;
    period: string;
    companyName: string;
    employmentType: string;
    department: string;
    role: string;
    summary: string;
    details: ExperienceDetail[];
    projects: Experience[];
};

export function buildCareerCards(experiences: Experience[]): CareerCard[] {
    const workProjects = experiences
        .filter((experience) => experience.type === 'PROJECT' && experience.careerId != null)
        .sort((a, b) => a.displayOrder - b.displayOrder);

    return experiences
        .filter((exp) => exp.type === 'CAREER')
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((exp) => ({
            id: exp.id,
            period: formatShortPeriod(exp.periodStart, exp.periodEnd),
            companyName: exp.companyName ?? '',
            employmentType: exp.employmentType ?? '',
            department: exp.department ?? '',
            role: exp.role ?? '',
            summary: exp.summary ?? '',
            details: exp.details ?? [],
            projects: workProjects.filter((project) => project.careerId === exp.id),
        }));
}

export type Milestone = {
    id: string;
    label: string;
    period: string;
    title: string;
    body: string;
    skills: string[];
    tags: string[];
    role: string;
    description: string;
    takeaway: string;
    contributionRate?: number;
    details: ExperienceDetail[];
    repositoryUrl?: string;
    experienceId: number;
};

export function buildMilestones(introData: IntroductionResponse): Milestone[] {
    // careerId로 특정 경력에 연결된 프로젝트는 이미 그 경력 카드 아래
    // "career.projects"로 노출된다(buildCareerCards) — 여기서 또 노출하면 같은
    // 프로젝트가 "경력"과 "핵심 프로젝트" 두 섹션에 중복으로 보인다.
    const isUnderCareer = (exp: Experience): boolean =>
        exp.careerId !== undefined &&
        introData.experiences.some((item) => item.id === exp.careerId && item.type === 'CAREER');

    return (introData.coreProjects ?? [])
        .filter((exp) => !isUnderCareer(exp))
        .map((exp) => {
            const label = exp.title.split(' (')[0];

            // 공개 페이지와 출력 관리 API가 각자 선택을 마친 projection을 반환한다.
            // 원본의 legacy visible 값으로 출력 항목을 다시 거르지 않는다.
            const visibleDetails = exp.details ?? [];

            return {
                id: exp.slug ?? exp.id.toString(),
                label,
                period: formatShortPeriod(exp.periodStart, exp.periodEnd),
                title: exp.title,
                body: visibleDetails.map((d) => d.content).join(', '),
                skills: exp.skills.map((s) => s.name),
                tags: exp.tags?.map((t) => t.name) ?? [],
                role: exp.role ?? '',
                description: exp.summary ?? '',
                takeaway: exp.takeaway ?? '',
                contributionRate: exp.contributionRate,
                details: [...visibleDetails].sort((a, b) => a.displayOrder - b.displayOrder),
                repositoryUrl: exp.repositoryUrl,
                experienceId: exp.id,
            };
        });
}

export function credentialSortRank(exp: Experience): number {
    const kind = credentialKindLabel(exp);
    if (kind === '교육') return 1;
    if (kind === '자격증') return 2;
    return 3;
}

export function buildOrderedCredentials(experiences: Experience[]): Experience[] {
    const creds = experiences.filter(
        (exp) => exp.type === 'EDUCATION' || exp.type === 'CERTIFICATE'
    );
    return [...creds].sort((a, b) => {
        const rankDiff = credentialSortRank(a) - credentialSortRank(b);
        if (rankDiff !== 0) return rankDiff;
        return b.periodStart.localeCompare(a.periodStart);
    });
}
