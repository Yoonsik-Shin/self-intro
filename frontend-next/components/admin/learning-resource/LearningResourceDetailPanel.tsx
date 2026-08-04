'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
    ArrowLeft,
    Clock,
    ExternalLink,
    Link2,
    Pencil,
    Tags,
    Trash2,
    User,
    Wrench,
} from 'lucide-react';
import type { LearningResource } from '@/lib/api/types';
import { formatDuration } from '@/lib/format';

type LearningResourceDetailPanelProps = {
    resource: LearningResource;
    onBack: () => void;
    backLabel: string;
    onEdit: (resource: LearningResource) => void;
    onDelete: (id: number) => void;
    onSelectResource: (id: number) => void;
};

const resourceTypeLabels: Record<string, string> = {
    ONLINE_COURSE: '온라인 강의',
    BOOK: '책',
    OFFLINE: '오프라인',
};

const statusLabels: Record<string, string> = {
    WISHLIST: '위시리스트',
    OWNED: '보유',
    IN_PROGRESS: '진행중',
    COMPLETED: '완료',
};

const statusStyles: Record<string, string> = {
    WISHLIST: 'bg-slate-100 text-slate-600',
    OWNED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
};

const priorityStyles: Record<string, string> = {
    P0: 'bg-red-100 text-red-700',
    P1: 'bg-orange-100 text-orange-700',
    P2: 'bg-yellow-100 text-yellow-700',
    P3: 'bg-slate-100 text-slate-500',
};

const relationTypeLabels: Record<string, string> = {
    PREREQUISITE: '선수 학습',
    RELATED: '관련 자료',
    FOLLOW_UP: '후속 학습',
    OVERLAPS: '내용 중복',
};

export function LearningResourceDetailPanel({
    resource,
    onBack,
    backLabel,
    onEdit,
    onDelete,
    onSelectResource,
}: LearningResourceDetailPanelProps) {
    const duration = formatDuration(resource.durationMinutes);

    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-fadeIn">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-slate-950"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {backLabel}
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onEdit(resource)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            수정
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(resource.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-500 transition hover:border-red-200 hover:bg-red-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            삭제
                        </button>
                    </div>
                </div>

                <div className="mt-6 max-w-5xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">
                            {resource.category.name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {resourceTypeLabels[resource.resourceType] ?? resource.resourceType}
                        </span>
                        <span
                            className={`rounded-full px-2.5 py-1 ${statusStyles[resource.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                            {statusLabels[resource.status] ?? resource.status}
                        </span>
                        {resource.priorityTier && (
                            <span
                                className={`rounded-full px-2.5 py-1 ${priorityStyles[resource.priorityTier] ?? 'bg-slate-100 text-slate-600'}`}
                            >
                                {resource.priorityTier}
                            </span>
                        )}
                        {duration && (
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {duration}
                            </span>
                        )}
                        {resource.instructorOrAuthor && (
                            <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {resource.instructorOrAuthor}
                            </span>
                        )}
                    </div>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                        {resource.title}
                    </h3>
                    {resource.provider && (
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {resource.provider}
                        </p>
                    )}
                    {resource.summary && (
                        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                            {resource.summary}
                        </p>
                    )}
                    {resource.url && (
                        <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            원본 링크 열기
                        </a>
                    )}
                </div>
            </div>

            <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:py-8">
                <div className="min-w-0">
                    {resource.detailMarkdown ? (
                        <div className="markdown-body min-w-0 break-words text-sm leading-relaxed text-slate-700 sm:text-base">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                {resource.detailMarkdown}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">등록된 상세 내용이 없습니다.</p>
                    )}
                </div>

                <aside className="space-y-5 lg:border-l lg:border-slate-100 lg:pl-6">
                    {resource.tags.length > 0 && (
                        <section>
                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                                <Tags className="h-3.5 w-3.5" /> 태그
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {resource.tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"
                                    >
                                        #{tag.name}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {resource.skills.length > 0 && (
                        <section>
                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                                <Wrench className="h-3.5 w-3.5" /> 기술 스택
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {resource.skills.map((skill) => (
                                    <span
                                        key={skill.id}
                                        className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700"
                                    >
                                        {skill.name}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {resource.relatedResources.length > 0 && (
                        <section>
                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                                <Link2 className="h-3.5 w-3.5" /> 관련 학습 자료
                            </h4>
                            <div className="space-y-2">
                                {resource.relatedResources.map((related) => (
                                    <button
                                        type="button"
                                        key={`${related.id}-${related.type}`}
                                        onClick={() => onSelectResource(related.id)}
                                        className="group flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[10px] font-black text-blue-600">
                                                {relationTypeLabels[related.type] ?? related.type}
                                            </span>
                                            <span className="mt-0.5 block text-xs font-bold leading-snug text-slate-700 group-hover:text-slate-950">
                                                {related.title}
                                            </span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>
            </div>
        </article>
    );
}
