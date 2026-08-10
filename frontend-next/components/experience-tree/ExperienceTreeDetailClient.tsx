'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import {
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    BookOpen,
    ExternalLink,
    GitFork,
    ListOrdered,
} from 'lucide-react';
import type { ExperienceTreeDetail, ExperienceTreeIndex, TradeoffCriterion } from '@/lib/api/types';
import { categoryBreadcrumb } from '@/lib/experienceTreeTaxonomy';
import {
    markdownComponents,
    preprocessMarkdown,
    remarkCalloutToggle,
    remarkDisableIndentedCode,
    remarkGithubAlerts,
    remarkKoreanEmphasis,
    remarkUnindentListLines,
} from '@/lib/markdown';

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

export function ExperienceTreeDetailClient({
    detail,
    index,
}: {
    detail: ExperienceTreeDetail;
    index: ExperienceTreeIndex;
}) {
    const router = useRouter();
    const breadcrumb = categoryBreadcrumb(detail);
    const situationByKey = new Map(index.situations.map((item) => [item.stableKey, item]));
    const toc = [
        ['overview', '문제와 판단 맥락'],
        ['options', '선택지'],
        ['matrix', '트레이드오프 비교'],
        ['warnings', '오답과 안티패턴'],
        ['relations', '온톨로지 관계'],
        ['evidence', '근거와 경험'],
    ];

    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
            >
                <ArrowLeft className="h-4 w-4" /> 경험 트리로 돌아가기
            </button>
            <div className="grid items-start gap-6 min-[1000px]:grid-cols-[minmax(0,1fr)_250px]">
                <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                    <header className="border-b border-slate-100 pb-7">
                        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
                            {breadcrumb.map((item, index) => (
                                <span
                                    key={item}
                                    className={
                                        index === 0
                                            ? 'rounded-full bg-blue-600 px-3 py-1 text-white'
                                            : 'rounded-full bg-slate-100 px-3 py-1 text-slate-700'
                                    }
                                >
                                    {item}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                            {detail.title}
                        </h1>
                        <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
                            {detail.summary}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                            <span className="rounded-md border border-slate-200 px-2 py-1">
                                {detail.verificationStatus}
                            </span>
                            <span className="rounded-md border border-slate-200 px-2 py-1">
                                content v{detail.contentVersion}
                            </span>
                        </div>
                    </header>

                    <section id="overview" className="scroll-mt-24 border-b border-slate-100 py-8">
                        <h2 className="text-2xl font-black text-slate-950">문제와 판단 맥락</h2>
                        <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                            {detail.problem}
                        </div>
                        <MarkdownContent markdown={detail.contextMarkdown} />
                        {detail.constraintsMarkdown && (
                            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                                <h3 className="font-black text-amber-900">결정 전 확인할 제약</h3>
                                <MarkdownContent markdown={detail.constraintsMarkdown} compact />
                            </div>
                        )}
                        <DecisionFlow detail={detail} />
                    </section>

                    <section id="options" className="scroll-mt-24 border-b border-slate-100 py-8">
                        <h2 className="text-2xl font-black text-slate-950">선택지</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            선택지는 정답 순위가 아니라 적용 조건이 다른 전략입니다.
                        </p>
                        <div className="mt-6 space-y-6">
                            {detail.options.map((option, optionIndex) => (
                                <section
                                    key={option.stableKey}
                                    className="rounded-2xl border border-slate-200 p-5 sm:p-7"
                                >
                                    <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                                        Option {optionIndex + 1}
                                    </p>
                                    <h3 className="mt-1 text-xl font-black text-slate-950">
                                        {option.title}
                                    </h3>
                                    <MarkdownContent markdown={option.summary} compact />
                                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                                        <OptionBlock
                                            title="동작 원리"
                                            markdown={option.mechanism}
                                        />
                                        <OptionBlock
                                            title="운영 메모"
                                            markdown={option.operationalNotes}
                                        />
                                        <OptionBlock
                                            title="적합한 경우"
                                            markdown={option.applicableWhen}
                                            tone="text-emerald-700"
                                        />
                                        <OptionBlock
                                            title="피해야 하는 경우"
                                            markdown={option.avoidWhen}
                                            tone="text-rose-700"
                                        />
                                        <OptionBlock
                                            title="장점"
                                            markdown={option.advantages}
                                            tone="text-blue-700"
                                        />
                                        <OptionBlock
                                            title="단점"
                                            markdown={option.disadvantages}
                                            tone="text-amber-700"
                                        />
                                    </div>
                                </section>
                            ))}
                        </div>
                    </section>

                    <section id="matrix" className="scroll-mt-24 border-b border-slate-100 py-8">
                        <h2 className="text-2xl font-black text-slate-950">트레이드오프 비교</h2>
                        <TradeoffMatrix detail={detail} />
                    </section>

                    <section id="warnings" className="scroll-mt-24 border-b border-slate-100 py-8">
                        <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
                            <AlertTriangle className="h-6 w-6 text-rose-600" /> 오답과 안티패턴
                        </h2>
                        <div className="mt-5 space-y-4">
                            {detail.warnings.map((warning) => (
                                <article
                                    key={warning.stableKey}
                                    className="rounded-xl border border-rose-200 bg-rose-50/40 p-5"
                                >
                                    <p className="text-xs font-black text-rose-600">
                                        {warning.classification} · {warning.reasonType} ·{' '}
                                        {warning.severity}
                                    </p>
                                    <h3 className="mt-1 text-lg font-black text-rose-950">
                                        {warning.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-700">
                                        {warning.description}
                                    </p>
                                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                                        <Fact title="실패 조건" text={warning.failureCondition} />
                                        <Fact title="발생 결과" text={warning.consequence} />
                                        <Fact
                                            title="교정 방법"
                                            text={warning.correction}
                                            tone="text-emerald-700"
                                        />
                                    </dl>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section id="relations" className="scroll-mt-24 border-b border-slate-100 py-8">
                        <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
                            <GitFork className="h-6 w-6 text-blue-600" /> 온톨로지 관계
                        </h2>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {detail.relations.map((relation) => {
                                const key =
                                    relation.sourceKey === detail.stableKey
                                        ? relation.targetKey
                                        : relation.sourceKey;
                                const item = situationByKey.get(key);
                                return (
                                    <Link
                                        key={`${relation.sourceKey}-${relation.targetKey}-${relation.relationType}`}
                                        href={`/experience-tree/${encodeURIComponent(key)}`}
                                        className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50"
                                    >
                                        <p className="text-xs font-black text-blue-600">
                                            {relation.relationType}
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-slate-900">
                                            {item?.title ?? key}
                                        </p>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>

                    <section id="evidence" className="scroll-mt-24 pt-8">
                        <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
                            <BookOpen className="h-6 w-6 text-blue-600" /> 근거와 연결된 경험
                        </h2>
                        <div className="mt-5 grid gap-6 lg:grid-cols-2">
                            <div className="space-y-2">
                                {detail.sources.map((source) => (
                                    <a
                                        key={source.url}
                                        href={source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block rounded-xl border border-slate-200 p-4 hover:border-blue-300"
                                    >
                                        <p className="flex items-center gap-1 text-sm font-bold text-slate-900">
                                            {source.title}
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {source.publisher} · {source.accessedAt}
                                        </p>
                                        <p className="mt-2 text-xs leading-5 text-slate-600">
                                            {source.note}
                                        </p>
                                    </a>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {detail.studies.length === 0 ? (
                                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
                                        아직 연결된 공개 Study가 없습니다.
                                    </p>
                                ) : (
                                    detail.studies.map((study) => (
                                        <Link
                                            key={study.linkId}
                                            href={`/study/${study.slug}`}
                                            className="block rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50"
                                        >
                                            <p className="text-xs font-black text-blue-600">
                                                {study.section} · {study.relationType}
                                            </p>
                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                {study.title}
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                {study.note || study.summary}
                                            </p>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    </section>
                </article>

                <aside className="sticky top-[89px] hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm min-[1000px]:block">
                    <h2 className="flex items-center gap-2 text-sm font-black text-slate-800">
                        <ListOrdered className="h-4 w-4 text-blue-600" /> 문서 목차
                    </h2>
                    <nav className="mt-3 space-y-1">
                        {toc.map(([id, label]) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                className="block rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            >
                                {label}
                            </a>
                        ))}
                    </nav>
                    <Link
                        href="/experience-tree"
                        className="mt-4 block rounded-xl bg-slate-900 px-3 py-2.5 text-center text-xs font-bold text-white"
                    >
                        전체 온톨로지 보기
                    </Link>
                </aside>
            </div>
        </div>
    );
}

function MarkdownContent({
    markdown,
    compact = false,
}: {
    markdown?: string | null;
    compact?: boolean;
}) {
    if (!markdown) return null;
    return (
        <div
            className={`${compact ? 'mt-2' : 'mt-6'} markdown-body text-sm leading-relaxed text-slate-700 sm:text-base`}
        >
            <ReactMarkdown
                remarkPlugins={[
                    remarkGfm,
                    remarkBreaks,
                    remarkMath,
                    remarkKoreanEmphasis,
                    remarkDisableIndentedCode,
                    remarkCalloutToggle,
                    remarkGithubAlerts,
                    remarkUnindentListLines,
                ]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={markdownComponents}
            >
                {preprocessMarkdown(markdown)}
            </ReactMarkdown>
        </div>
    );
}

function OptionBlock({
    title,
    markdown,
    tone = 'text-slate-900',
}: {
    title: string;
    markdown?: string | null;
    tone?: string;
}) {
    if (!markdown) return null;
    return (
        <div>
            <h4 className={`text-sm font-black ${tone}`}>{title}</h4>
            <MarkdownContent markdown={markdown} compact />
        </div>
    );
}

function Fact({
    title,
    text,
    tone = 'text-slate-900',
}: {
    title: string;
    text: string;
    tone?: string;
}) {
    return (
        <div>
            <dt className={`font-black ${tone}`}>{title}</dt>
            <dd className="mt-1 leading-6 text-slate-600">{text}</dd>
        </div>
    );
}

function TradeoffMatrix({ detail }: { detail: ExperienceTreeDetail }) {
    const criteria = [
        ...new Set(
            detail.options.flatMap((option) => option.tradeoffs.map((item) => item.criterion))
        ),
    ];
    return (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left">판단 기준</th>
                        {detail.options.map((option) => (
                            <th key={option.stableKey} className="min-w-56 px-4 py-3 text-left">
                                {option.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {criteria.map((criterion) => (
                        <tr key={criterion} className="border-t border-slate-100">
                            <th className="px-4 py-4 text-left align-top font-bold text-slate-700">
                                {CRITERION_LABELS[criterion]}
                            </th>
                            {detail.options.map((option) => {
                                const item = option.tradeoffs.find(
                                    (value) => value.criterion === criterion
                                );
                                return (
                                    <td key={option.stableKey} className="px-4 py-4 align-top">
                                        {item ? (
                                            <>
                                                <span
                                                    className={`rounded-full px-2 py-1 text-[11px] font-black ${LEVEL_STYLE[item.level]}`}
                                                >
                                                    {item.level}
                                                </span>
                                                <p className="mt-2 leading-5 text-slate-600">
                                                    {item.explanation}
                                                </p>
                                            </>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function DecisionFlow({ detail }: { detail: ExperienceTreeDetail }) {
    return (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h3 className="text-lg font-black text-slate-950">결정 구조</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
                문제에서 선택지로 곧장 이동하지 않고 제약을 통과시킨 뒤, 선택의 이득과 비용을 함께
                검증합니다.
            </p>
            <div className="mt-5 flex flex-col items-center">
                <div className="w-full max-w-xl rounded-xl border border-slate-300 bg-white p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Problem
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{detail.problem}</p>
                </div>
                <ArrowDown className="my-2 h-5 w-5 text-slate-300" />
                <div className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                        Constraints
                    </p>
                    <p className="mt-1 text-xs text-amber-900">
                        일관성 · 성능 · 운영 역량 · 비용 · 실패 허용 범위
                    </p>
                </div>
                <ArrowDown className="my-2 h-5 w-5 text-slate-300" />
                <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {detail.options.map((option) => (
                        <div
                            key={option.stableKey}
                            className="rounded-xl border border-blue-200 bg-white p-4"
                        >
                            <p className="text-[10px] font-black uppercase text-blue-600">
                                Candidate
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-900">{option.title}</p>
                            <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                                {option.applicableWhen}
                            </p>
                        </div>
                    ))}
                </div>
                <ArrowDown className="my-2 h-5 w-5 text-slate-300" />
                <div className="grid w-full gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
                        적합 조건 충족
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3 text-center text-xs font-bold text-blue-700">
                        트레이드오프 수용
                    </div>
                    <div className="rounded-xl bg-rose-50 p-3 text-center text-xs font-bold text-rose-700">
                        안티패턴 회피
                    </div>
                </div>
            </div>
        </div>
    );
}
