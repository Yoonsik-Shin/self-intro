'use client';

import { useQuery } from '@tanstack/react-query';
import { connectionApi } from '@/lib/api';
import type { RelatedExperience } from '@/lib/api/types';

type Props = {
    experienceId: number;
    onNavigate: (experience: RelatedExperience) => void;
};

export function RelatedExperienceLinks({ experienceId, onNavigate }: Props) {
    const { data = [] } = useQuery({
        queryKey: ['experiences', 'related', experienceId],
        queryFn: () => connectionApi.relatedExperiences(experienceId),
        enabled: experienceId > 0,
    });

    if (data.length === 0) return null;

    return (
        <div className="mt-2 border-t border-slate-100 pt-2.5 print:hidden">
            <p className="resume-label mb-2 font-bold uppercase tracking-wider text-violet-600">
                관련 프로젝트 · 이력
            </p>
            <div className="flex flex-wrap gap-1.5">
                {data.map((experience) => (
                    <button
                        key={experience.id}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onNavigate(experience);
                        }}
                        className="resume-meta rounded-lg border border-violet-100 bg-violet-50/50 px-2.5 py-1.5 font-semibold text-violet-700 transition hover:border-violet-200 hover:bg-violet-50"
                    >
                        {experience.title}
                    </button>
                ))}
            </div>
        </div>
    );
}
