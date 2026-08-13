import 'server-only';
import { serverGet } from '@/lib/api/server';
import type { Experience, ExperienceDetail, Study, StudyPage } from '@/lib/api/types';
import { getWorkspaceIntroduction } from '@/lib/workspace-public';

export type WorkspaceExperienceBundle = {
    experience: Experience;
    detail: ExperienceDetail;
    subProjects: Experience[];
    parentCareer?: Experience;
    relatedStudies: Study[];
};

export async function getWorkspaceExperienceBundle(
    workspaceSlug: string,
    idParam: string,
    detailId?: string
): Promise<WorkspaceExperienceBundle | null> {
    const intro = await getWorkspaceIntroduction(workspaceSlug);
    const experience = intro.experiences.find(
        (item) => String(item.id) === idParam || item.slug === idParam
    );
    if (!experience) return null;
    const requestedDetail = detailId
        ? experience.details.find((item) => String(item.id) === detailId)
        : experience.details[0];
    const detail: ExperienceDetail = requestedDetail ?? {
        id: experience.id * -100,
        content: experience.title,
        situation: '',
        actionDetail: '',
        outcome: '',
        narrative: experience.summary || '',
        displayOrder: 1,
        skills: experience.skills || [],
    };
    if (detailId && !requestedDetail) return null;
    const subProjects =
        experience.type === 'CAREER'
            ? intro.experiences.filter(
                  (item) => item.type === 'PROJECT' && item.careerId === experience.id
              )
            : [];
    const parentCareer =
        experience.type === 'PROJECT' && experience.careerId != null
            ? intro.experiences.find((item) => item.id === experience.careerId)
            : undefined;
    const detailIds = [...experience.details, ...subProjects.flatMap((project) => project.details)]
        .map((item) => item.id)
        .filter((id) => id > 0);
    let relatedStudies: Study[] = [];
    if (detailIds.length > 0) {
        const search = new URLSearchParams({ page: '0', size: '100' });
        detailIds.forEach((id) => search.append('experienceDetailIds', String(id)));
        const response = await serverGet<StudyPage>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies?${search}`
        );
        relatedStudies = response.content;
    }
    return { experience, detail, subProjects, parentCareer, relatedStudies };
}
