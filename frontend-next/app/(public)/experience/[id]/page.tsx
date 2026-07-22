import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { Experience, ExperienceDetail, Study, StudyPage } from '@/lib/api/types';
import { ExperienceDetailClient } from '@/components/experience/ExperienceDetailClient';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ id: string }>;
};

export async function findExperienceById(
    idParam: string
): Promise<{ experience: Experience; detail: ExperienceDetail; subProjects: Experience[] } | null> {
    const experiences = await serverGet<Experience[]>('/api/experiences');

    const exp = experiences.find((e) => String(e.id) === idParam || (e.slug && e.slug === idParam));
    if (!exp) return null;

    const detail: ExperienceDetail = exp.details[0] || {
        id: exp.id * -100,
        content: exp.title,
        situation: '',
        actionDetail: '',
        outcome: '',
        narrative: exp.summary || '',
        displayOrder: 1,
        skills: exp.skills || [],
    };
    const subProjects =
        exp.type === 'CAREER'
            ? experiences.filter((e) => e.type === 'PROJECT' && e.careerId === exp.id)
            : [];
    return { experience: exp, detail, subProjects };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const found = await findExperienceById(id);
    if (!found) return { title: '경험을 찾을 수 없습니다' };

    const { experience, detail } = found;
    const title = experience.title || detail.content;
    const description = experience.summary || detail.outcome || detail.actionDetail || '';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

async function findRelatedStudies(details: ExperienceDetail[]): Promise<Study[]> {
    if (!details || details.length === 0) return [];
    const ids = details.map((d) => d.id).filter((id) => id > 0);
    if (ids.length === 0) return [];
    const search = new URLSearchParams();
    ids.forEach((id) => search.append('experienceDetailIds', String(id)));
    search.set('page', '0');
    search.set('size', '100');
    const result = await serverGet<StudyPage>(`/api/studies?${search}`);
    return result.content;
}

export default async function ExperiencePage({ params }: Props) {
    const { id } = await params;
    const found = await findExperienceById(id);
    if (!found) notFound();

    const { experience, detail, subProjects } = found;
    const relatedStudies = await findRelatedStudies(experience.details);

    return (
        <div className="relative mx-auto max-w-[1500px] space-y-1 px-4 py-6 sm:px-6 lg:px-8">
            <ExperienceDetailClient
                experience={experience}
                detail={detail}
                subProjects={subProjects}
                relatedStudies={relatedStudies}
            />
        </div>
    );
}
