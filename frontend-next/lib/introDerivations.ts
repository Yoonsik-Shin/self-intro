import type { Experience, ExperienceDetail, IntroductionResponse, Skill } from './api/types';
import { credentialKindLabel, formatShortPeriod } from './format';

export type SkillGroup = {
    value: 'CORE' | 'PROJECT_LEARNING';
    label: string;
    skills: Skill[];
};

export function groupCoreSkills(skills: Skill[]): SkillGroup[] {
    const coreSkills = skills.filter((skill) => skill.isCore);
    return [
        {
            value: 'CORE',
            label: '핵심 기술 스택',
            skills: coreSkills
                .filter((skill) => skill.usageType === 'WORK_EXPERIENCE')
                .sort((a, b) => a.displayOrder - b.displayOrder),
        },
        {
            value: 'PROJECT_LEARNING',
            label: '프로젝트/학습',
            skills: coreSkills
                .filter(
                    (skill) => skill.usageType === 'PROJECT_USE' || skill.usageType === 'LEARNING'
                )
                .sort((a, b) => a.displayOrder - b.displayOrder),
        },
    ];
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
            details: exp.details,
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
    return (introData.coreProjects ?? []).map((exp) => {
        const label = exp.title.split(' (')[0];
        const career = exp.careerId
            ? introData.experiences.find(
                  (item) => item.id === exp.careerId && item.type === 'CAREER'
              )
            : undefined;

        return {
            id: exp.slug ?? exp.id.toString(),
            label,
            period: formatShortPeriod(exp.periodStart, exp.periodEnd),
            title: exp.title,
            body: exp.details.map((d) => d.content).join(', '),
            skills: exp.skills.map((s) => s.name),
            tags: exp.tags?.map((t) => t.name) ?? [],
            role: career
                ? `${career.companyName || career.title} · ${exp.role || career.role || ''}`
                : (exp.role ?? ''),
            description: exp.summary ?? '',
            takeaway: exp.takeaway ?? '',
            contributionRate: exp.contributionRate,
            details: [...exp.details].sort((a, b) => a.displayOrder - b.displayOrder),
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
