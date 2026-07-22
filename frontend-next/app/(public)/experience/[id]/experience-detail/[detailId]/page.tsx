import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { Experience, ExperienceDetail, Study, StudyPage } from '@/lib/api/types';
import { ExperienceDetailClient } from '@/components/experience/ExperienceDetailClient';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ id: string; detailId: string }>;
};

export async function findExperienceAndDetail(
    experienceIdParam: string,
    detailIdParam: string
): Promise<{ experience: Experience; detail: ExperienceDetail; subProjects: Experience[] } | null> {
    const detailId = Number(detailIdParam);
    const experiences = await serverGet<Experience[]>('/api/experiences');

    // 1. Find Experience by numeric ID or by slug
    let exp = experiences.find(
        (e) => String(e.id) === experienceIdParam || (e.slug && e.slug === experienceIdParam)
    );
    let detail: ExperienceDetail | undefined;

    if (exp && Number.isFinite(detailId)) {
        detail = exp.details.find((d) => d.id === detailId);
    }

    // 2. Fallback: Find ExperienceDetail across all experiences if exp didn't match directly
    if (!detail && Number.isFinite(detailId)) {
        for (const e of experiences) {
            const d = e.details.find((item) => item.id === detailId);
            if (d) {
                exp = e;
                detail = d;
                break;
            }
        }
    }

    if (!exp || !detail) return null;

    const subProjects =
        exp.type === 'CAREER'
            ? experiences.filter((e) => e.type === 'PROJECT' && e.careerId === exp.id)
            : [];
    return { experience: exp, detail, subProjects };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id, detailId } = await params;
    const found = await findExperienceAndDetail(id, detailId);
    if (!found) return { title: '경험 세부 성과를 찾을 수 없습니다' };

    const { experience, detail } = found;
    const title = detail.content ? `[${experience.title}] ${detail.content}` : experience.title;
    const description =
        detail.outcome || detail.actionDetail || detail.situation || experience.summary || '';

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

export default async function ExperienceDetailPage({ params }: Props) {
    const { id, detailId } = await params;
    const found = await findExperienceAndDetail(id, detailId);
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
