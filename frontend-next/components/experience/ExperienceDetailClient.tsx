'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
    ArrowLeft,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Github,
    Sparkles,
    Image as ImageIcon,
} from 'lucide-react';
import type { Experience, ExperienceDetail, Skill, Study } from '@/lib/api/types';
import { markdownComponents, remarkKoreanEmphasis } from '@/lib/markdown';
import { experienceOrgName, experienceTypeLabel, formatCredentialPeriod } from '@/lib/format';

type Props = {
    experience: Experience;
    detail: ExperienceDetail;
    subProjects?: Experience[];
    relatedStudies: Study[];
};

export function ExperienceDetailClient({
    experience,
    detail,
    subProjects = [],
    relatedStudies,
}: Props) {
    const router = useRouter();
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const skills = useMemo(() => {
        const map = new Map<number, Skill>();
        (experience.skills || []).forEach((s) => map.set(s.id, s));
        (experience.details || []).forEach((d) => {
            (d.skills || []).forEach((s) => map.set(s.id, s));
        });
        return Array.from(map.values()).sort(
            (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        );
    }, [experience]);
    const siblingDetails = experience.details.filter((d) => d.id !== detail.id);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" /> 이전 화면으로
                </button>
            </div>

            <div
                className={`grid grid-cols-[minmax(0,1fr)_52px] gap-4 items-start relative transition-[grid-template-columns] duration-300 pb-12 sm:gap-6 ${
                    isNavCollapsed
                        ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
                        : 'min-[900px]:grid-cols-[minmax(0,1fr)_240px]'
                }`}
            >
                <div className="min-w-0 space-y-8">
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                        {/* Header Section */}
                        <div className="mb-6 border-b border-slate-100 pb-6">
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">
                                    {experienceTypeLabel(experience.type)}
                                </span>
                                <span className="font-mono">
                                    {formatCredentialPeriod(experience)}
                                </span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                {experience.title}
                            </h1>
                            <p className="mt-2 text-sm font-bold text-slate-500 sm:text-base">
                                {experienceOrgName(experience)
                                    ? `${experienceOrgName(experience)} · `
                                    : ''}
                                {experience.role ||
                                    (experience.type === 'PROJECT' ? '프로젝트' : experience.title)}
                            </p>

                            {/* Main Overview / Summary */}
                            {experience.summary && (
                                <p className="mt-4 text-sm font-medium text-slate-700 leading-relaxed sm:text-base">
                                    {experience.summary}
                                </p>
                            )}

                            {/* Project Tech Stack, Tags, Repository (Top Section) */}
                            {((skills && skills.length > 0) ||
                                (experience.tags && experience.tags.length > 0) ||
                                experience.repositoryUrl) && (
                                <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
                                    {skills && skills.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                                                기술스택:
                                            </span>
                                            {skills.map((skill: Skill) => (
                                                <span
                                                    key={skill.id}
                                                    className="inline-flex items-center rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700"
                                                >
                                                    {skill.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {experience.tags && experience.tags.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                                                태그:
                                            </span>
                                            {experience.tags.map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="inline-flex items-center text-xs font-extrabold text-indigo-600"
                                                >
                                                    #{tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {experience.repositoryUrl && (
                                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                                                저장소:
                                            </span>
                                            <a
                                                href={experience.repositoryUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 shadow-2xs"
                                            >
                                                <Github className="h-4 w-4" />
                                                GitHub 저장소
                                                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Key Achievements & Learnings (Top Section) */}
                            {experience.takeaway && (
                                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                                    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-900">
                                        <Sparkles className="h-4 w-4 text-indigo-600" />
                                        핵심 성과 & 배운 점
                                    </h3>
                                    <div className="markdown-body text-xs sm:text-sm font-normal leading-relaxed text-slate-800">
                                        <ReactMarkdown
                                            remarkPlugins={[
                                                remarkGfm,
                                                remarkBreaks,
                                                remarkKoreanEmphasis,
                                            ]}
                                            components={markdownComponents}
                                        >
                                            {experience.takeaway}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top-Level Experience Details List */}
                        {experience.details && experience.details.length > 0 && (
                            <div className="space-y-6 pt-2">
                                <h3 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                                    <span>📌</span> 주요 세부 성과 및 구현 경험 (
                                    {experience.details.length}개)
                                </h3>
                                <div className="divide-y divide-slate-100 space-y-6">
                                    {experience.details.map((d, index) => {
                                        const detailText =
                                            d.narrative ||
                                            [d.situation, d.actionDetail, d.outcome]
                                                .filter(Boolean)
                                                .join('\n\n');
                                        return (
                                            <div
                                                key={d.id}
                                                className={`${index > 0 ? 'pt-6' : ''} space-y-3`}
                                            >
                                                <div className="flex items-start gap-2.5">
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white mt-0.5">
                                                        {index + 1}
                                                    </span>
                                                    <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                                                        {d.content}
                                                    </h4>
                                                </div>

                                                {detailText && (
                                                    <div className="markdown-body pl-7 text-xs sm:text-sm leading-relaxed text-slate-700 space-y-2 mt-1">
                                                        <ReactMarkdown
                                                            remarkPlugins={[
                                                                remarkGfm,
                                                                remarkBreaks,
                                                                remarkKoreanEmphasis,
                                                            ]}
                                                            components={markdownComponents}
                                                        >
                                                            {detailText}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}

                                                {d.skills && d.skills.length > 0 && (
                                                    <div className="pl-7 flex flex-wrap gap-1 pt-1">
                                                        {d.skills.map((s) => (
                                                            <span
                                                                key={s.id}
                                                                className="rounded-md border border-slate-200/60 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600"
                                                            >
                                                                {s.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Linked Study Notes for this specific Detail (Single Group Header + Bulleted Links) */}
                                                {relatedStudies.length > 0 &&
                                                    (() => {
                                                        const linkedStudies = relatedStudies.filter(
                                                            (study) =>
                                                                study.experienceDetails?.some(
                                                                    (ed) => ed.id === d.id
                                                                )
                                                        );
                                                        if (linkedStudies.length === 0) return null;
                                                        return (
                                                            <div className="pl-7 pt-2 space-y-1.5">
                                                                <div className="text-xs font-extrabold text-indigo-700 flex items-center gap-1.5">
                                                                    <span>📖</span> 연관 학습 아티클
                                                                    ({linkedStudies.length}개)
                                                                </div>
                                                                <ul className="space-y-1 pl-1 text-xs">
                                                                    {linkedStudies.map((s) => (
                                                                        <li
                                                                            key={s.id}
                                                                            className="flex items-center gap-1.5"
                                                                        >
                                                                            <span className="text-indigo-400 font-bold">
                                                                                •
                                                                            </span>
                                                                            <Link
                                                                                href={`/study/${encodeURIComponent(s.slug)}`}
                                                                                className="font-semibold text-slate-700 hover:text-indigo-600 hover:underline inline-flex items-center gap-1 transition"
                                                                            >
                                                                                <span>
                                                                                    {s.title}
                                                                                </span>
                                                                                <ChevronRight className="h-3 w-3 text-indigo-500" />
                                                                            </Link>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        );
                                                    })()}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Sub-Projects Section (For CAREER items) */}
                        {subProjects.length > 0 && (
                            <div className="mt-10 border-t border-slate-100 pt-8 space-y-6">
                                <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                                    <span>🚀</span> 소속 실무 프로젝트 ({subProjects.length}개)
                                </h3>

                                <div className="space-y-6">
                                    {subProjects.map((proj) => (
                                        <div
                                            key={proj.id}
                                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 space-y-4"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                                                <div>
                                                    <span className="font-mono text-xs font-bold text-slate-400">
                                                        {formatCredentialPeriod(proj)}
                                                    </span>
                                                    <h4 className="text-lg font-black text-slate-900 mt-0.5">
                                                        {proj.title}
                                                    </h4>
                                                </div>
                                                {proj.repositoryUrl && (
                                                    <a
                                                        href={proj.repositoryUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-950"
                                                    >
                                                        <Github className="h-3.5 w-3.5" /> Code
                                                    </a>
                                                )}
                                            </div>

                                            {proj.summary && (
                                                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                                                    {proj.summary}
                                                </p>
                                            )}

                                            {proj.details && proj.details.length > 0 && (
                                                <div className="space-y-2 border-t border-slate-200/40 pt-3">
                                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                        주요 구현 및 성과
                                                    </h5>
                                                    <ul className="space-y-2">
                                                        {proj.details.map((d) => (
                                                            <li
                                                                key={d.id}
                                                                className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-2xs"
                                                            >
                                                                <strong className="font-extrabold text-slate-900 block mb-1">
                                                                    • {d.content}
                                                                </strong>
                                                                {d.narrative ||
                                                                d.outcome ||
                                                                d.situation ? (
                                                                    <div className="markdown-body text-slate-600 pl-3 mt-1">
                                                                        <ReactMarkdown
                                                                            remarkPlugins={[
                                                                                remarkGfm,
                                                                                remarkBreaks,
                                                                                remarkKoreanEmphasis,
                                                                            ]}
                                                                            components={
                                                                                markdownComponents
                                                                            }
                                                                        >
                                                                            {d.narrative ||
                                                                                [
                                                                                    d.situation,
                                                                                    d.actionDetail,
                                                                                    d.outcome,
                                                                                ]
                                                                                    .filter(Boolean)
                                                                                    .join('\n\n')}
                                                                        </ReactMarkdown>
                                                                    </div>
                                                                ) : null}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {proj.skills && proj.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-2">
                                                    {proj.skills.map((s) => (
                                                        <span
                                                            key={s.id}
                                                            className="rounded bg-slate-200/60 px-2 py-0.5 text-[11px] font-bold text-slate-700"
                                                        >
                                                            {s.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* System / Architecture Images Gallery */}
                        {experience.images && experience.images.length > 0 && (
                            <div className="mt-8 border-t border-slate-100 pt-6">
                                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                                    <ImageIcon className="h-4 w-4 text-slate-600" />
                                    아키텍처 다이어그램 & 시스템 캡처
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {experience.images.map((img) => (
                                        <div
                                            key={img.id || img.objectKey}
                                            onClick={() => setSelectedImage(img.url)}
                                            className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-slate-400 hover:shadow-md"
                                        >
                                            <img
                                                src={img.url}
                                                alt="Architecture diagram or screenshot"
                                                className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </article>
                </div>

                {/* Right Navigation Sidebar */}
                <aside className="block w-full sticky top-24 self-start">
                    <div
                        className={`relative rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:flex min-[900px]:flex-col min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${
                            isNavCollapsed
                                ? 'min-[900px]:gap-3 min-[900px]:px-1.5 min-[900px]:py-3'
                                : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => setIsNavCollapsed((collapsed) => !collapsed)}
                            className={`z-20 hidden items-center justify-center border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[900px]:flex ${
                                isNavCollapsed
                                    ? 'relative mx-auto h-8 w-8 shrink-0 rounded-full shadow-sm'
                                    : 'absolute -right-[11px] top-7 !m-0 h-10 w-5 rounded-r-lg border-l-0 bg-white/95 shadow-[3px_1px_6px_-3px_rgba(15,23,42,0.35)]'
                            }`}
                            title={isNavCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
                            aria-label={isNavCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
                            aria-expanded={!isNavCollapsed}
                        >
                            {isNavCollapsed ? (
                                <ChevronLeft className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </button>

                        {/* Related Studies */}
                        <div
                            className={`hidden ${isNavCollapsed ? '' : 'min-[900px]:block min-[900px]:pr-12'}`}
                        >
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">
                                연결 항목
                            </h3>
                            <p className="mt-0.5 text-sm leading-none text-slate-500">
                                이 경험과 연관된 학습 기록입니다.
                            </p>
                        </div>

                        <div
                            className={`hidden space-y-4 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}
                        >
                            {relatedStudies.length > 0 ? (
                                <div>
                                    <h4 className="mb-1 text-xs font-black uppercase text-slate-400">
                                        관련 학습 · 기술노트
                                    </h4>
                                    <div className="space-y-1.5">
                                        {relatedStudies.map((study) => (
                                            <Link
                                                key={study.id}
                                                href={`/study/${encodeURIComponent(study.slug)}`}
                                                className="flex w-full items-start gap-1 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-slate-950"
                                            >
                                                <span className="mt-0.5 shrink-0 font-bold text-slate-400">
                                                    ›
                                                </span>
                                                <span>{study.title}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs font-bold italic text-slate-400">
                                    연결된 항목이 없습니다.
                                </p>
                            )}

                            {siblingDetails.length > 0 && (
                                <div className="border-t border-slate-100 pt-3">
                                    <h4 className="mb-1 text-xs font-black uppercase text-slate-400">
                                        이 이력의 다른 경험 불릿
                                    </h4>
                                    <div className="space-y-1.5">
                                        {siblingDetails.map((sibling) => (
                                            <Link
                                                key={sibling.id}
                                                href={`/experience/${experience.id}/experience-detail/${sibling.id}`}
                                                className="block w-full truncate text-left text-xs font-semibold leading-normal text-slate-600 hover:text-slate-950"
                                                title={sibling.content}
                                            >
                                                • {sibling.content}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div
                            className={`flex flex-col items-center gap-2 py-1 ${isNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}
                        >
                            <button
                                type="button"
                                onClick={() => router.back()}
                                title="이전 화면으로"
                                aria-label="이전 화면으로"
                                className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-900"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        </div>

                        <hr
                            className={`hidden border-slate-100 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}
                        />

                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="mt-2 grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:mt-0 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
                            title="위로 가기"
                            aria-label="위로 가기"
                        >
                            <ArrowUp className="h-4 w-4 shrink-0" />
                            <span
                                className={`hidden ${isNavCollapsed ? '' : 'min-[900px]:inline'}`}
                            >
                                위로 가기
                            </span>
                        </button>
                    </div>
                </aside>

                {/* Modal preview for full size image */}
                {selectedImage && (
                    <div
                        onClick={() => setSelectedImage(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
                    >
                        <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white p-2">
                            <img
                                src={selectedImage}
                                alt="Expanded preview"
                                className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
