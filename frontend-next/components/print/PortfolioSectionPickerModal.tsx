'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, FileStack, Loader2, Plus, X } from 'lucide-react';
import { portfolioApi } from '@/lib/api/portfolio';
import type { PortfolioCaseStudy, PortfolioCaseStudyRevision } from '@/lib/api/types';

export function PortfolioSectionPickerModal({
    workspaceSlug,
    selectedRevisionIds,
    onAdd,
    onClose,
}: {
    workspaceSlug: string;
    selectedRevisionIds: number[];
    onAdd: (caseStudy: PortfolioCaseStudy, revision: PortfolioCaseStudyRevision) => void;
    onClose: () => void;
}) {
    const { data: caseStudies = [], isLoading: isCaseStudiesLoading } = useQuery({
        queryKey: ['portfolio-case-studies', workspaceSlug, 'print-composer'],
        queryFn: () => portfolioApi.workspaceList(workspaceSlug),
    });
    const [selectedCaseStudyId, setSelectedCaseStudyId] = useState<number | null>(null);
    const effectiveCaseStudyId = selectedCaseStudyId ?? caseStudies[0]?.id ?? null;

    const { data: detail, isLoading: isDetailLoading } = useQuery({
        queryKey: ['portfolio-case-study', workspaceSlug, effectiveCaseStudyId, 'print-composer'],
        queryFn: () => portfolioApi.workspaceDetail(workspaceSlug, effectiveCaseStudyId as number),
        enabled: effectiveCaseStudyId !== null,
    });
    const selectedIds = useMemo(() => new Set(selectedRevisionIds), [selectedRevisionIds]);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 print:hidden">
            <div className="flex h-[min(760px,90vh)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
                            <FileStack className="h-4 w-4 text-blue-600" /> 포트폴리오 항목 추가
                        </h2>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                            저장된 content revision을 현재 지원출력 문서에 고정하여 추가합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="포트폴리오 항목 선택 닫기"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
                        {isCaseStudiesLoading ? (
                            <div className="flex items-center gap-2 p-3 text-xs font-bold text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {caseStudies.map((caseStudy) => (
                                    <button
                                        key={caseStudy.id}
                                        type="button"
                                        onClick={() => setSelectedCaseStudyId(caseStudy.id)}
                                        className={`w-full rounded-xl border p-3 text-left transition ${
                                            effectiveCaseStudyId === caseStudy.id
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <span className="line-clamp-2 text-xs font-black text-slate-900">
                                            {caseStudy.title}
                                        </span>
                                        <span className="mt-1 block text-[10px] font-bold text-slate-400">
                                            revision 선택
                                        </span>
                                    </button>
                                ))}
                                {caseStudies.length === 0 && (
                                    <p className="p-4 text-center text-xs font-bold text-slate-400">
                                        먼저 포트폴리오 원본을 만들어 주세요.
                                    </p>
                                )}
                            </div>
                        )}
                    </aside>

                    <main className="overflow-y-auto p-5">
                        {isDetailLoading ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" /> revision을 불러오는 중
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {detail?.revisions.map((revision) => {
                                    const added = selectedIds.has(revision.id);
                                    return (
                                        <article
                                            key={revision.id}
                                            className="rounded-xl border border-slate-200 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-slate-900">
                                                            v{revision.version}
                                                        </span>
                                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">
                                                            {revision.source === 'AI'
                                                                ? 'AI revision'
                                                                : '직접 편집'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-xs font-bold leading-5 text-slate-700">
                                                        {revision.content.summary || '요약 없음'}
                                                    </p>
                                                    <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-slate-500">
                                                        {revision.content.problem}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={added || !detail}
                                                    onClick={() =>
                                                        detail && onAdd(detail.caseStudy, revision)
                                                    }
                                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black ${
                                                        added
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                                >
                                                    {added ? (
                                                        <Check className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Plus className="h-3.5 w-3.5" />
                                                    )}
                                                    {added ? '추가됨' : '문서에 추가'}
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
