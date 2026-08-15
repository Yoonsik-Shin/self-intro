'use client';

import { useMemo, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import {
    jobCatalogPermissionApi,
    type JobCatalogPermissionPosting,
    type JobCatalogPermissionReviewStatus,
} from '@/lib/api/jobCatalogPermission';
import { JobPostingPermissionReviewPanel } from './JobPostingPermissionReviewPanel';

type ReviewFilter = 'ALL' | JobCatalogPermissionReviewStatus;

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
    { value: 'ALL', label: '전체' },
    { value: 'REVIEW_REQUIRED', label: '검토 대기' },
    { value: 'APPROVED', label: '공유 승인' },
    { value: 'REJECTED', label: '공유 불가' },
];

export function JobCatalogPermissionOperations() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<ReviewFilter>('REVIEW_REQUIRED');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const { data: postings = [], isLoading } = useQuery({
        queryKey: ['jobPostings'],
        queryFn: jobCatalogPermissionApi.list,
    });

    const counts = useMemo(() => {
        const result: Record<ReviewFilter, number> = {
            ALL: postings.length,
            REVIEW_REQUIRED: 0,
            APPROVED: 0,
            REJECTED: 0,
        };
        postings.forEach((posting) => result[posting.permissionReviewStatus]++);
        return result;
    }, [postings]);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return postings.filter((posting) => {
            if (filter !== 'ALL' && posting.permissionReviewStatus !== filter) return false;
            if (!keyword) return true;
            return `${posting.companyName} ${posting.positionTitle} ${posting.source}`
                .toLowerCase()
                .includes(keyword);
        });
    }, [filter, postings, search]);

    const selected = postings.find((posting) => posting.id === selectedId) ?? null;

    return (
        <div className="space-y-5">
            <AdminPageHeader
                eyebrow="Platform Catalog Governance"
                title="공고 공유 심사"
                description="운영자 판단이 아니라 권리자 직접 제공, 서면 이용 허락, 재배포를 허용한 공식 API 약관 중 하나를 증빙한 공고만 공통 카탈로그에 공개합니다. 개인 지원 상태와 문서는 이 화면에서 다루지 않습니다."
            />

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {FILTERS.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => setFilter(item.value)}
                        className={`rounded-2xl border p-4 text-left transition ${
                            filter === item.value
                                ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                        }`}
                    >
                        <span className="text-xs font-bold opacity-70">{item.label}</span>
                        <strong className="mt-2 block text-2xl font-black">
                            {counts[item.value]}
                        </strong>
                    </button>
                ))}
            </section>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="회사·직무·출처 검색"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
            </label>

            {isLoading ? (
                <EmptyState label="심사 대상을 불러오는 중입니다." />
            ) : filtered.length === 0 ? (
                <EmptyState label="조건에 맞는 심사 대상이 없습니다." />
            ) : (
                <section className="grid gap-3 xl:grid-cols-2">
                    {filtered.map((posting) => (
                        <PostingReviewCard
                            key={posting.id}
                            posting={posting}
                            selected={selectedId === posting.id}
                            onSelect={() =>
                                setSelectedId((current) =>
                                    current === posting.id ? null : posting.id
                                )
                            }
                        />
                    ))}
                </section>
            )}

            {selected && (
                <aside className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
                    <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-indigo-500">
                                    Permission evidence review
                                </p>
                                <h3 className="mt-1 text-xl font-black text-slate-950">
                                    {selected.companyName} · {selected.positionTitle}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                            >
                                닫기
                            </button>
                        </div>
                        {selected.postingUrl && (
                            <a
                                href={selected.postingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                <ExternalLink className="h-4 w-4" /> 원본 공고 확인
                            </a>
                        )}
                        <JobPostingPermissionReviewPanel posting={selected} />
                    </div>
                </aside>
            )}
        </div>
    );
}

function PostingReviewCard({
    posting,
    selected,
    onSelect,
}: {
    posting: JobCatalogPermissionPosting;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <article
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
                selected ? 'border-indigo-400' : 'border-slate-200'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-400">
                        {posting.source || '출처 미기록'}
                    </p>
                    <h3 className="mt-2 truncate text-base font-black text-slate-950">
                        {posting.companyName}
                    </h3>
                    <p className="mt-1 truncate text-sm font-bold text-slate-600">
                        {posting.positionTitle}
                    </p>
                </div>
                {posting.sharedCatalogEligible ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                    <ShieldCheck className="h-5 w-5 shrink-0 text-amber-500" />
                )}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
                {posting.sharedCatalogEligible
                    ? '공통 카탈로그 공개 가능'
                    : posting.permissionReviewStatus === 'REJECTED'
                      ? '공유 불가로 판정됨'
                      : '권한 증빙 검토 전 · Workspace 공개 금지'}
            </p>
            <button
                type="button"
                onClick={onSelect}
                className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
            >
                권한 근거 검토
            </button>
        </article>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center text-sm font-bold text-slate-500">
            {label}
        </div>
    );
}
