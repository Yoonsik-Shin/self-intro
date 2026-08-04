'use client';

import Link from 'next/link';
import { FolderGit2 } from 'lucide-react';
import type { PortfolioCaseStudyPublicSummary } from '@/lib/api/types';

type Props = {
    caseStudies: PortfolioCaseStudyPublicSummary[];
};

export function PortfolioListClient({ caseStudies }: Props) {
    if (caseStudies.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                아직 발행된 포트폴리오가 없습니다.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((caseStudy) => (
                <Link
                    key={caseStudy.id}
                    href={`/portfolio/${encodeURIComponent(caseStudy.slug)}`}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <FolderGit2 className="h-4.5 w-4.5" />
                    </div>
                    <h2 className="text-base font-black text-slate-900 group-hover:text-blue-700">
                        {caseStudy.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                        {caseStudy.summary}
                    </p>
                    <p className="mt-4 text-xs font-semibold text-slate-400">
                        {new Date(caseStudy.updatedAt).toLocaleDateString('ko-KR')}
                    </p>
                </Link>
            ))}
        </div>
    );
}
