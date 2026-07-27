'use client';

import Link from 'next/link';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { studyApi } from '@/lib/api';

type Props = {
    skillId?: number;
    experienceId?: number;
    experienceDetailId?: number;
};

const VISIBLE_LIMIT = 5;

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

    const visibleStudies = relatedStudies.slice(0, VISIBLE_LIMIT);
    const remainingCount = relatedStudies.length - visibleStudies.length;
    const moreHref = skillId
        ? `/study?skillId=${skillId}`
        : experienceDetailId
          ? `/study?experienceDetailId=${experienceDetailId}`
          : `/study?experienceId=${experienceId}`;

    return (
        <div className="mt-3 border-t border-slate-100 pt-2.5 print:hidden">
            <p className="resume-label mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                관련 학습 · 기술노트
            </p>
            <div className="divide-y divide-slate-100/80">
                {visibleStudies.map((study) => (
                    <Link
                        key={study.id}
                        href={`/study/${encodeURIComponent(study.slug)}`}
                        onClick={(event) => event.stopPropagation()}
                        className="group flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-blue-600 transition-all hover:bg-blue-50/70 hover:text-blue-800"
                    >
                        <span className="text-sm font-semibold underline-offset-4 decoration-blue-300 group-hover:underline">
                            {study.title}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-500 transition-colors group-hover:text-blue-700" />
                    </Link>
                ))}
            </div>
            {remainingCount > 0 && (
                <Link
                    href={moreHref}
                    onClick={(event) => event.stopPropagation()}
                    className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600"
                >
                    더보기 +{remainingCount}
                    <ChevronDown className="h-3 w-3" />
                </Link>
            )}
        </div>
    );
}
