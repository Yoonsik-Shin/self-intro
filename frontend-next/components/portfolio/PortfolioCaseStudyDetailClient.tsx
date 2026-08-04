'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { ArrowLeft } from 'lucide-react';
import type { PortfolioCaseStudyPublic } from '@/lib/api/types';
import {
    markdownComponents,
    remarkKoreanEmphasis,
    remarkDisableIndentedCode,
    remarkCalloutToggle,
    remarkGithubAlerts,
    remarkUnindentListLines,
    preprocessMarkdown,
} from '@/lib/markdown';

type Props = {
    caseStudy: PortfolioCaseStudyPublic;
};

export function PortfolioCaseStudyDetailClient({ caseStudy }: Props) {
    const router = useRouter();

    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
            >
                <ArrowLeft className="h-4 w-4" /> 이전 화면으로
            </button>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <header className="mb-6 space-y-2 border-b border-slate-100 pb-5">
                    <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
                        {caseStudy.title}
                    </h1>
                    {caseStudy.content.summary && (
                        <p className="text-sm text-slate-600 sm:text-base">
                            {caseStudy.content.summary}
                        </p>
                    )}
                    <Link
                        href={`/experience/${caseStudy.experienceId}`}
                        className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                        관련 프로젝트 보기 →
                    </Link>
                </header>

                <div className="markdown-body text-sm leading-relaxed text-slate-700 sm:text-base">
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
                        {preprocessMarkdown(caseStudy.renderedMarkdown)}
                    </ReactMarkdown>
                </div>
            </article>
        </div>
    );
}
