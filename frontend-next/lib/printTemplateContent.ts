import type {
    Experience,
    IntroductionResponse,
    PrintTemplate,
    PrintTemplateContentOverrides,
} from '@/lib/api/types';

function applyExperienceOverrides(
    experience: Experience,
    overrides: PrintTemplateContentOverrides
): Experience {
    const experienceOverride = overrides.experiences?.[String(experience.id)] ?? {};
    return {
        ...experience,
        ...experienceOverride,
        details: experience.details.map((detail) => ({
            ...detail,
            ...(overrides.details?.[String(detail.id)] ?? {}),
        })),
    };
}

export function applyPrintTemplateContent(
    source: IntroductionResponse,
    overrides: PrintTemplateContentOverrides = {}
): IntroductionResponse {
    const selectedSkillIds = overrides.selectedSkillIds;
    const skills = Array.isArray(selectedSkillIds)
        ? source.skills.filter((skill) => selectedSkillIds.includes(skill.id))
        : source.skills;

    return {
        ...source,
        profile: source.profile
            ? {
                  ...source.profile,
                  ...(overrides.profile ?? {}),
              }
            : source.profile,
        skills,
        competencies: source.competencies.map((comp) => ({
            ...comp,
            ...(overrides.competencies?.[String(comp.id)] ?? {}),
        })),
        experiences: source.experiences.map((experience) =>
            applyExperienceOverrides(experience, overrides)
        ),
        coreProjects: source.coreProjects.map((experience) =>
            applyExperienceOverrides(experience, overrides)
        ),
    };
}

function canonicalContent(source: IntroductionResponse) {
    return {
        profile: source.profile
            ? {
                  jobTitle: source.profile.jobTitle,
                  bio: source.profile.bio,
                  coreStackSummary: source.profile.coreStackSummary,
              }
            : null,
        experiences: [...source.experiences]
            .sort((a, b) => a.id - b.id)
            .map((experience) => ({
                id: experience.id,
                title: experience.title,
                summary: experience.summary ?? '',
                takeaway: experience.takeaway ?? '',
                role: experience.role ?? '',
                details: [...experience.details]
                    .sort((a, b) => a.id - b.id)
                    .map((detail) => ({
                        id: detail.id,
                        content: detail.content,
                        situation: detail.situation ?? '',
                        task: detail.task ?? '',
                        actionDetail: detail.actionDetail ?? '',
                        outcome: detail.outcome ?? '',
                        narrative: detail.narrative ?? '',
                    })),
            })),
        skills: [...source.skills]
            .sort((a, b) => a.id - b.id)
            .map((skill) => ({
                id: skill.id,
                name: skill.name,
                isCore: skill.isCore,
                usageType: skill.usageType,
                displayOrder: skill.displayOrder,
            })),
    };
}

/** 브라우저와 서버 환경에서 동일하게 동작하는 가벼운 콘텐츠 변경 감지용 지문. */
export function getPrintContentFingerprint(source: IntroductionResponse): string {
    const value = JSON.stringify(canonicalContent(source));
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return `v2-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function countContentOverrides(overrides: PrintTemplateContentOverrides): number {
    const profileCount = Object.keys(overrides.profile ?? {}).length;
    const experienceCount = Object.values(overrides.experiences ?? {}).reduce(
        (count, fields) => count + Object.keys(fields).length,
        0
    );
    const detailCount = Object.values(overrides.details ?? {}).reduce(
        (count, fields) => count + Object.keys(fields).length,
        0
    );
    const skillCount = Array.isArray(overrides.selectedSkillIds) ? 1 : 0;
    return profileCount + experienceCount + detailCount + skillCount;
}

/**
 * DB에서 삭제된 경력/상세/기술 ID 등의 유령 데이터를 템플릿 맞춤 문구 및 제외 목록에서 자동 제거합니다.
 */
export function sanitizePrintTemplateOverrides(
    overrides: PrintTemplateContentOverrides = {},
    source: IntroductionResponse
): PrintTemplateContentOverrides {
    const validExpIds = new Set(source.experiences.map((exp) => String(exp.id)));
    const validDetailIds = new Set(
        source.experiences.flatMap((exp) => exp.details.map((detail) => String(detail.id)))
    );
    const validSkillIds = new Set(source.skills.map((skill) => skill.id));

    const cleanedExperiences = Object.fromEntries(
        Object.entries(overrides.experiences ?? {}).filter(([expId]) => validExpIds.has(expId))
    );

    const cleanedDetails = Object.fromEntries(
        Object.entries(overrides.details ?? {}).filter(([detailId]) => validDetailIds.has(detailId))
    );

    const cleanedSelectedSkillIds = Array.isArray(overrides.selectedSkillIds)
        ? overrides.selectedSkillIds.filter((skillId) => validSkillIds.has(skillId))
        : undefined;

    return {
        ...overrides,
        experiences: Object.keys(cleanedExperiences).length > 0 ? cleanedExperiences : undefined,
        details: Object.keys(cleanedDetails).length > 0 ? cleanedDetails : undefined,
        selectedSkillIds: cleanedSelectedSkillIds,
    };
}

/**
 * 템플릿 객체 전반의 유령 데이터를 정화하여 안전하게 반안합니다.
 */
export function sanitizePrintTemplate(
    template: PrintTemplate,
    source: IntroductionResponse
): PrintTemplate {
    const sanitizedOverrides = sanitizePrintTemplateOverrides(
        template.contentOverrides || {},
        source
    );

    return {
        ...template,
        contentOverrides: sanitizedOverrides,
    };
}

export type ContentDiffItem = {
    category: 'PROFILE' | 'EXPERIENCE' | 'DETAIL' | 'SKILLS';
    id: string;
    title: string;
    fieldLabel: string;
    fieldKey: string;
    overrideValue: string;
    liveValue: string;
};

/**
 * 저장된 템플릿의 맞춤 문구와 최신 live DB 내용 간의 차이점을 추출합니다.
 */
export function getTemplateDiffSummary(
    overrides: PrintTemplateContentOverrides = {},
    source: IntroductionResponse
): ContentDiffItem[] {
    const diffs: ContentDiffItem[] = [];

    // Profile diffs
    if (overrides.profile && source.profile) {
        if (
            overrides.profile.jobTitle !== undefined &&
            overrides.profile.jobTitle !== source.profile.jobTitle
        ) {
            diffs.push({
                category: 'PROFILE',
                id: 'profile-jobTitle',
                title: '프로필',
                fieldLabel: '직무명',
                fieldKey: 'jobTitle',
                overrideValue: overrides.profile.jobTitle,
                liveValue: source.profile.jobTitle || '',
            });
        }
        if (overrides.profile.bio !== undefined && overrides.profile.bio !== source.profile.bio) {
            diffs.push({
                category: 'PROFILE',
                id: 'profile-bio',
                title: '프로필',
                fieldLabel: '소개글',
                fieldKey: 'bio',
                overrideValue: overrides.profile.bio,
                liveValue: source.profile.bio || '',
            });
        }
        if (
            overrides.profile.coreStackSummary !== undefined &&
            overrides.profile.coreStackSummary !== source.profile.coreStackSummary
        ) {
            diffs.push({
                category: 'PROFILE',
                id: 'profile-coreStackSummary',
                title: '프로필',
                fieldLabel: '핵심 기술 요약',
                fieldKey: 'coreStackSummary',
                overrideValue: overrides.profile.coreStackSummary,
                liveValue: source.profile.coreStackSummary || '',
            });
        }
    }

    // Experience diffs
    source.experiences.forEach((exp) => {
        const expOverride = overrides.experiences?.[String(exp.id)];
        if (expOverride) {
            if (expOverride.title !== undefined && expOverride.title !== exp.title) {
                diffs.push({
                    category: 'EXPERIENCE',
                    id: `exp-${exp.id}-title`,
                    title: exp.title,
                    fieldLabel: '경력 제목',
                    fieldKey: 'title',
                    overrideValue: expOverride.title,
                    liveValue: exp.title,
                });
            }
            if (expOverride.summary !== undefined && expOverride.summary !== (exp.summary ?? '')) {
                diffs.push({
                    category: 'EXPERIENCE',
                    id: `exp-${exp.id}-summary`,
                    title: exp.title,
                    fieldLabel: '경력 요약',
                    fieldKey: 'summary',
                    overrideValue: expOverride.summary,
                    liveValue: exp.summary ?? '',
                });
            }
            if (expOverride.role !== undefined && expOverride.role !== (exp.role ?? '')) {
                diffs.push({
                    category: 'EXPERIENCE',
                    id: `exp-${exp.id}-role`,
                    title: exp.title,
                    fieldLabel: '역할',
                    fieldKey: 'role',
                    overrideValue: expOverride.role,
                    liveValue: exp.role ?? '',
                });
            }
            if (
                expOverride.takeaway !== undefined &&
                expOverride.takeaway !== (exp.takeaway ?? '')
            ) {
                diffs.push({
                    category: 'EXPERIENCE',
                    id: `exp-${exp.id}-takeaway`,
                    title: exp.title,
                    fieldLabel: '핵심 성과',
                    fieldKey: 'takeaway',
                    overrideValue: expOverride.takeaway,
                    liveValue: exp.takeaway ?? '',
                });
            }
        }

        // Details diffs
        exp.details.forEach((detail) => {
            const detailOverride = overrides.details?.[String(detail.id)];
            if (detailOverride) {
                if (
                    detailOverride.content !== undefined &&
                    detailOverride.content !== detail.content
                ) {
                    diffs.push({
                        category: 'DETAIL',
                        id: `detail-${detail.id}-content`,
                        title: `${exp.title} > ${detail.content}`,
                        fieldLabel: '상세 제목',
                        fieldKey: 'content',
                        overrideValue: detailOverride.content,
                        liveValue: detail.content,
                    });
                }
                if (
                    detailOverride.narrative !== undefined &&
                    detailOverride.narrative !== (detail.narrative ?? '')
                ) {
                    diffs.push({
                        category: 'DETAIL',
                        id: `detail-${detail.id}-narrative`,
                        title: `${exp.title} > ${detail.content}`,
                        fieldLabel: '상세 설명',
                        fieldKey: 'narrative',
                        overrideValue: detailOverride.narrative,
                        liveValue: detail.narrative ?? '',
                    });
                }
            }
        });
    });

    return diffs;
}
