import { redirect, notFound } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { Experience } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ detailId?: string }>;
};

export default async function LegacyExperienceDetailPage({ params, searchParams }: Props) {
    const { id } = await params;
    const sp = searchParams ? await searchParams : {};
    const idNum = Number(id);

    if (!Number.isFinite(idNum)) notFound();

    const experiences = await serverGet<Experience[]>('/api/experiences');

    // 1. Check if sp.detailId was passed
    if (sp.detailId && Number.isFinite(Number(sp.detailId))) {
        const dId = Number(sp.detailId);
        const exp = experiences.find((e) => e.id === idNum);
        if (exp) {
            redirect(`/experience/${exp.id}/experience-detail/${dId}`);
        }
    }

    // 2. Check if idNum is an Experience ID
    const exp = experiences.find((e) => e.id === idNum);
    if (exp) {
        if (exp.details.length > 0) {
            redirect(`/experience/${exp.id}/experience-detail/${exp.details[0].id}`);
        } else {
            redirect(`/experience/${exp.id}`);
        }
    }

    // 3. Check if idNum is a Detail ID
    for (const e of experiences) {
        const d = e.details.find((det) => det.id === idNum);
        if (d) {
            redirect(`/experience/${e.id}/experience-detail/${d.id}`);
        }
    }

    notFound();
}
