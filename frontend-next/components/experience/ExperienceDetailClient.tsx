'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ArrowUp, ChevronLeft, ChevronRight, ExternalLink, Github, Sparkles, Image as ImageIcon } from 'lucide-react';
import type { Experience, ExperienceDetail, Study } from '@/lib/api/types';
import { markdownComponents } from '@/lib/markdown';
import { experienceOrgName, experienceTypeLabel, formatCredentialPeriod } from '@/lib/format';

type Props = {
  experience: Experience;
  detail: ExperienceDetail;
  relatedStudies: Study[];
};

export function ExperienceDetailClient({ experience, detail, relatedStudies }: Props) {
  const router = useRouter();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const merged = detail.narrative || [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
  const skills = detail.skills.length > 0 ? detail.skills : experience.skills;
  const siblingDetails = experience.details.filter((d) => d.id !== detail.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> 이전 화면으로
        </button>
      </div>

      <div
        className={`grid grid-cols-[minmax(0,1fr)_52px] gap-4 items-start relative transition-[grid-template-columns] duration-300 pb-12 sm:gap-6 ${
          isNavCollapsed ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]' : 'min-[900px]:grid-cols-[minmax(0,1fr)_240px]'
        }`}
      >
        <div className="min-w-0 space-y-8">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8 border-b border-slate-100 pb-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{experienceTypeLabel(experience.type)}</span>
                  <span className="font-mono">{formatCredentialPeriod(experience)}</span>
                </div>
                {experience.repositoryUrl && (
                  <a
                    href={experience.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 shadow-sm"
                  >
                    <Github className="h-4 w-4" />
                    GitHub 저장소
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                )}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{detail.content}</h1>
              <p className="mt-2 text-sm font-bold text-slate-500 sm:text-base">
                {experience.title}
                {experienceOrgName(experience) ? ` · ${experienceOrgName(experience)}` : ''}
              </p>
            </div>

            {/* Main Narrative / STAR Section */}
            {merged && (
              <div className="text-sm leading-relaxed text-slate-600 sm:text-base space-y-4">
                <ReactMarkdown components={markdownComponents}>{merged}</ReactMarkdown>
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

            {/* Key Takeaways */}
            {experience.takeaway && (
              <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
                <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 mb-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  핵심 성과 & 배운 점 (Takeaway)
                </h3>
                <div className="text-xs sm:text-sm font-medium leading-relaxed text-emerald-950">
                  <ReactMarkdown components={markdownComponents}>{experience.takeaway}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Skills & Tags */}
            <div className="mt-8 flex flex-wrap gap-1.5 border-t border-slate-100 pt-6">
              {skills.map((skill) => (
                <span key={skill.id} className="resume-badge bg-slate-50 border border-slate-200/60 text-slate-700 font-bold px-2.5 py-1 rounded-md shadow-sm text-xs">
                  {skill.name}
                </span>
              ))}
            </div>
          </article>
        </div>

        {/* Right Navigation Sidebar */}
        <aside className="block w-full sticky top-24 self-start">
          <div
            className={`relative rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:flex min-[900px]:flex-col min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${
              isNavCollapsed ? 'min-[900px]:gap-3 min-[900px]:px-1.5 min-[900px]:py-3' : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsNavCollapsed((collapsed) => !collapsed)}
              className={`z-20 hidden items-center justify-center border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[900px]:flex ${
                isNavCollapsed ? 'relative mx-auto h-8 w-8 shrink-0 rounded-full shadow-sm' : 'absolute -right-[11px] top-7 !m-0 h-10 w-5 rounded-r-lg border-l-0 bg-white/95 shadow-[3px_1px_6px_-3px_rgba(15,23,42,0.35)]'
              }`}
              title={isNavCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
              aria-label={isNavCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
              aria-expanded={!isNavCollapsed}
            >
              {isNavCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {/* Related Studies */}
            <div className={`hidden ${isNavCollapsed ? '' : 'min-[900px]:block min-[900px]:pr-12'}`}>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">연결 항목</h3>
              <p className="mt-0.5 text-sm leading-none text-slate-500">이 경험과 연관된 학습 기록입니다.</p>
            </div>

            <div className={`hidden space-y-4 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}>
              {relatedStudies.length > 0 ? (
                <div>
                  <h4 className="mb-1 text-xs font-black uppercase text-slate-400">관련 학습 · 기술노트</h4>
                  <div className="space-y-1.5">
                    {relatedStudies.map((study) => (
                      <Link
                        key={study.id}
                        href={`/study/${encodeURIComponent(study.slug)}`}
                        className="flex w-full items-start gap-1 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-slate-950"
                      >
                        <span className="mt-0.5 shrink-0 font-bold text-slate-400">›</span>
                        <span>{study.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold italic text-slate-400">연결된 항목이 없습니다.</p>
              )}

              {siblingDetails.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="mb-1 text-xs font-black uppercase text-slate-400">이 이력의 다른 경험 불릿</h4>
                  <div className="space-y-1.5">
                    {siblingDetails.map((sibling) => (
                      <Link
                        key={sibling.id}
                        href={`/experience-detail/${sibling.id}`}
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

            <div className={`flex flex-col items-center gap-2 py-1 ${isNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}>
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

            <hr className={`hidden border-slate-100 ${isNavCollapsed ? '' : 'min-[900px]:block'}`} />

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-2 grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:mt-0 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
              title="위로 가기"
              aria-label="위로 가기"
            >
              <ArrowUp className="h-4 w-4 shrink-0" />
              <span className={`hidden ${isNavCollapsed ? '' : 'min-[900px]:inline'}`}>위로 가기</span>
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
              <img src={selectedImage} alt="Expanded preview" className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
