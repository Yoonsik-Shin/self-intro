'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, BookOpen, CalendarClock, ExternalLink, GitFork } from 'lucide-react';
import type { ExperienceTreeDetail, TradeoffCriterion } from '@/lib/api/types';
import { markdownComponents } from '@/lib/markdown';

const CRITERION_LABELS: Record<TradeoffCriterion, string> = {
    PERFORMANCE: '성능',
    CONSISTENCY: '일관성',
    AVAILABILITY: '가용성',
    SCALABILITY: '확장성',
    IMPLEMENTATION_COMPLEXITY: '구현 복잡도',
    OPERATIONAL_COMPLEXITY: '운영 복잡도',
    COST: '비용',
    SECURITY: '보안',
    MAINTAINABILITY: '유지보수성',
    FAILURE_ISOLATION: '장애 격리',
};

const LEVEL_STYLE = {
    LOW: 'bg-emerald-50 text-emerald-700',
    MEDIUM: 'bg-amber-50 text-amber-700',
    HIGH: 'bg-rose-50 text-rose-700',
    CONTEXT_DEPENDENT: 'bg-slate-100 text-slate-700',
};

export function ExperienceTreeCatalogDetail({ detail }: { detail: ExperienceTreeDetail }) {
    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase text-blue-600">
                            {detail.domain} · {detail.topic}
                        </p>
                        <h2 className="mt-2 text-xl font-black text-slate-950">{detail.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{detail.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                            {detail.verificationStatus}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            v{detail.contentVersion}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                            <CalendarClock className="h-3 w-3" /> 재검토{' '}
                            {detail.nextReviewAt ?? '미정'}
                        </span>
                    </div>
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-[11px] font-black uppercase text-slate-400">Problem</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{detail.problem}</p>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-black text-slate-950">선택지와 트레이드오프</h3>
                <div className="mt-4 grid gap-4 2xl:grid-cols-2">
                    {detail.options.map((option) => (
                        <article
                            key={option.stableKey}
                            className="rounded-xl border border-slate-200 p-4"
                        >
                            <p className="text-[10px] font-black uppercase text-blue-600">
                                {option.stableKey}
                            </p>
                            <h4 className="mt-1 font-black text-slate-950">{option.title}</h4>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                {option.summary}
                            </p>
                            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                                <TextBlock title="동작 원리" text={option.mechanism} />
                                <TextBlock title="운영 메모" text={option.operationalNotes} />
                                <TextBlock
                                    title="적합한 경우"
                                    text={option.applicableWhen}
                                    tone="text-emerald-700"
                                />
                                <TextBlock
                                    title="피해야 하는 경우"
                                    text={option.avoidWhen}
                                    tone="text-rose-700"
                                />
                                <TextBlock
                                    title="장점"
                                    text={option.advantages}
                                    tone="text-blue-700"
                                />
                                <TextBlock
                                    title="단점"
                                    text={option.disadvantages}
                                    tone="text-amber-700"
                                />
                            </dl>
                            <div className="mt-4 space-y-2">
                                {option.tradeoffs.map((tradeoff) => (
                                    <div
                                        key={`${option.stableKey}-${tradeoff.criterion}`}
                                        className="rounded-lg bg-slate-50 p-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <b className="text-xs text-slate-800">
                                                {CRITERION_LABELS[tradeoff.criterion]}
                                            </b>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${LEVEL_STYLE[tradeoff.level]}`}
                                            >
                                                {tradeoff.level}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs leading-5 text-slate-600">
                                            {tradeoff.explanation}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-rose-200 bg-rose-50/30 p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-black text-rose-900">
                    <AlertTriangle className="h-4 w-4" /> 잘못된 접근과 오답
                </h3>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {detail.warnings.map((warning) => (
                        <article
                            key={warning.stableKey}
                            className="rounded-xl border border-rose-200 bg-white p-4"
                        >
                            <p className="text-[10px] font-black text-rose-600">
                                {warning.classification} · {warning.reasonType} · {warning.severity}
                            </p>
                            <h4 className="mt-1 font-black text-rose-950">{warning.title}</h4>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {warning.description}
                            </p>
                            <dl className="mt-3 space-y-2 text-xs leading-5">
                                <TextBlock title="실패 조건" text={warning.failureCondition} />
                                <TextBlock title="결과" text={warning.consequence} />
                                <TextBlock
                                    title="교정"
                                    text={warning.correction}
                                    tone="text-emerald-700"
                                />
                            </dl>
                        </article>
                    ))}
                </div>
            </section>

            {(detail.contextMarkdown || detail.constraintsMarkdown) && (
                <section className="grid gap-4 xl:grid-cols-2">
                    <MarkdownPanel title="상황과 판단 맥락" markdown={detail.contextMarkdown} />
                    <MarkdownPanel title="제약 조건" markdown={detail.constraintsMarkdown} />
                </section>
            )}

            <section className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 font-black text-slate-950">
                        <GitFork className="h-4 w-4" /> 연결된 의사결정
                    </h3>
                    <div className="mt-3 space-y-2">
                        {detail.relations.length === 0 ? (
                            <Empty text="연결된 의사결정이 없습니다." />
                        ) : (
                            detail.relations.map((relation) => (
                                <div
                                    key={`${relation.sourceKey}-${relation.targetKey}-${relation.relationType}`}
                                    className="rounded-xl bg-slate-50 p-3 text-xs"
                                >
                                    <b className="text-blue-700">{relation.relationType}</b>
                                    <p className="mt-1 break-all text-slate-600">
                                        {relation.sourceKey} → {relation.targetKey}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 font-black text-slate-950">
                        <BookOpen className="h-4 w-4" /> 근거 자료
                    </h3>
                    <div className="mt-3 space-y-2">
                        {detail.sources.length === 0 ? (
                            <Empty text="등록된 근거가 없습니다." />
                        ) : (
                            detail.sources.map((source) => (
                                <a
                                    key={`${source.url}-${source.title}`}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <p className="flex items-center gap-1 text-sm font-bold text-slate-900">
                                        {source.title}
                                        <ExternalLink className="h-3 w-3" />
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        {source.publisher} · 확인 {source.accessedAt}
                                    </p>
                                    {source.note && (
                                        <p className="mt-1 text-xs text-slate-600">{source.note}</p>
                                    )}
                                </a>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <Link
                href={`/experience-tree/${encodeURIComponent(detail.stableKey)}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
            >
                공개 탐색기에서 이 상황 보기 <ExternalLink className="h-4 w-4" />
            </Link>
        </div>
    );
}

function TextBlock({
    title,
    text,
    tone = 'text-slate-900',
}: {
    title: string;
    text?: string | null;
    tone?: string;
}) {
    if (!text) return null;
    return (
        <div>
            <dt className={`font-bold ${tone}`}>{title}</dt>
            <dd className="mt-1 whitespace-pre-line text-slate-600">{text}</dd>
        </div>
    );
}

function MarkdownPanel({ title, markdown }: { title: string; markdown?: string | null }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-black text-slate-950">{title}</h3>
            {markdown ? (
                <div className="prose prose-slate mt-3 max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {markdown}
                    </ReactMarkdown>
                </div>
            ) : (
                <Empty text="등록된 내용이 없습니다." />
            )}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <p className="mt-3 text-sm text-slate-400">{text}</p>;
}
