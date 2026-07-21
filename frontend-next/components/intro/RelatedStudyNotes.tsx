'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { studyApi } from '@/lib/api';

type Props = {
    skillId?: number;
    experienceId?: number;
    experienceDetailId?: number;
};

export function RelatedStudyNotes({ skillId, experienceId, experienceDetailId }: Props) {
    const relationKey = skillId
        ? `skill-${skillId}`
        : experienceDetailId
          ? `detail-${experienceDetailId}`
          : `experience-${experienceId}`;

    const { data: relatedPage } = useQuery({
        queryKey: ['studies', 'byExperience', relationKey],
        queryFn: () =>
            studyApi.list({
                skillIds: skillId ? [skillId] : undefined,
                experienceIds: experienceId ? [experienceId] : undefined,
                experienceDetailIds: experienceDetailId ? [experienceDetailId] : undefined,
                size: 100,
            }),
        enabled: Boolean(skillId || experienceId || experienceDetailId),
    });
    const relatedStudies = relatedPage?.content ?? [];

    if (relatedStudies.length === 0) return null;

    return (
        <div className="mt-2 border-t border-slate-100 pt-2.5 print:hidden">
            <p className="resume-label mb-2 flex items-center gap-1.5 font-bold uppercase tracking-wider text-blue-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                관련 학습 · 기술노트
            </p>
            <div className="space-y-2">
                {relatedStudies.map((study) => (
                    <Link
                        key={study.id}
                        href={`/study/${encodeURIComponent(study.slug)}`}
                        onClick={(event) => event.stopPropagation()}
                        className="resume-meta flex w-full items-center justify-between gap-2.5 rounded-xl border border-blue-100/50 bg-blue-50/40 px-4 py-2.5 text-left font-semibold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/80 hover:text-blue-800"
                    >
                        <span>{study.title}</span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-blue-500" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
