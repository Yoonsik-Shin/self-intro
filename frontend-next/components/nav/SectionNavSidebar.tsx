'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { scrollToSection } from '@/lib/scroll';

export type SectionNavItem = { id: string; label: string; icon: LucideIcon };

// intro 페이지(mainSections)와 architecture 페이지(architectureSections)가 공유하는
// "현재 위치 표시 + 클릭 시 스크롤 이동" 사이드바. 원본 App.tsx에서는 이 패턴이 여러
// 페이지에 인라인으로 복붙되어 있었는데(경험/블로그 상세 페이지의 "연관 콘텐츠" 사이드바는
// 내용 자체가 달라 이 컴포넌트로 흡수하지 않음), 여기서는 순수 섹션 점프 목적만 공용화한다.
type Props = {
    sections: SectionNavItem[];
    isCollapsed: boolean;
    onToggleCollapse: () => void;
};

export function SectionNavSidebar({ sections, isCollapsed, onToggleCollapse }: Props) {
    const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '');

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveSectionId(entry.target.id);
                });
            },
            { root: null, rootMargin: '-20% 0px -55% 0px', threshold: 0 }
        );

        sections.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => {
            sections.forEach(({ id }) => {
                const el = document.getElementById(id);
                if (el) observer.unobserve(el);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <aside className="block print:hidden w-full sticky top-24 self-start">
            <div
                className={`relative rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:flex min-[900px]:flex-col min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${
                    isCollapsed
                        ? 'min-[900px]:gap-3 min-[900px]:px-1.5 min-[900px]:py-3'
                        : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4'
                }`}
            >
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className={`z-20 hidden items-center justify-center border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[900px]:flex ${
                        isCollapsed
                            ? 'relative mx-auto h-8 w-8 shrink-0 rounded-full shadow-sm'
                            : 'absolute -right-[11px] top-7 !m-0 h-10 w-5 rounded-r-lg border-l-0 bg-white/95 shadow-[3px_1px_6px_-3px_rgba(15,23,42,0.35)]'
                    }`}
                    title={isCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
                    aria-label={isCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
                    aria-expanded={!isCollapsed}
                >
                    {isCollapsed ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </button>

                <div
                    className={`hidden relative pl-4 before:absolute before:top-2.5 before:bottom-2.5 before:left-[4px] before:w-[2px] before:bg-slate-200 ${isCollapsed ? '' : 'min-[900px]:block'}`}
                >
                    {sections.map((step) => (
                        <button
                            key={step.id}
                            onClick={() => scrollToSection(step.id)}
                            className="group flex items-start gap-3 w-full text-left py-2.5 relative transition-all duration-200"
                        >
                            <div
                                className={`absolute left-[-15px] top-[14px] w-2 h-2 rounded-full border border-white transition-all duration-300 z-10 ${
                                    activeSectionId === step.id
                                        ? 'bg-slate-900 scale-125 ring-4 ring-slate-200'
                                        : 'bg-slate-300 group-hover:bg-slate-500'
                                }`}
                            />
                            <span
                                className={`rounded-lg px-2 py-1 text-sm font-bold leading-tight transition-all duration-200 ${activeSectionId === step.id ? 'bg-slate-100 text-slate-900 font-extrabold' : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-950'}`}
                            >
                                {step.label}
                            </span>
                        </button>
                    ))}
                </div>

                <div
                    className={`relative flex flex-col items-center gap-2 py-1.5 before:absolute before:bottom-5 before:top-5 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-slate-200 ${isCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}
                >
                    {sections.map((step) => {
                        const Icon = step.icon;
                        return (
                            <button
                                key={step.id}
                                onClick={() => scrollToSection(step.id)}
                                title={step.label}
                                aria-label={step.label}
                                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border transition-all duration-200 ${
                                    activeSectionId === step.id
                                        ? 'border-slate-300 bg-slate-900 text-white shadow-sm shadow-slate-800/20 ring-4 ring-slate-200'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                            </button>
                        );
                    })}
                </div>

                <hr
                    className={`hidden border-slate-100 ${isCollapsed ? '' : 'min-[900px]:block'}`}
                />

                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="mt-2 grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:mt-0 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
                    title="위로 가기"
                    aria-label="위로 가기"
                >
                    <ArrowUp className="h-4 w-4 shrink-0" />
                    <span className={`hidden ${isCollapsed ? '' : 'min-[900px]:inline'}`}>
                        위로 가기
                    </span>
                </button>
            </div>
        </aside>
    );
}
