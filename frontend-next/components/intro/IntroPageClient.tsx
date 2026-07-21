'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Cpu, GraduationCap, Github, Mail, Phone, Sparkles, User } from 'lucide-react';
import type { IntroductionResponse } from '@/lib/api/types';
import { scrollToSection } from '@/lib/scroll';
import { SectionNavSidebar, type SectionNavItem } from '@/components/nav/SectionNavSidebar';
import { ResumeSections } from './ResumeSections';

type Props = {
    introData: IntroductionResponse;
};

const mainSections: SectionNavItem[] = [
    { id: 'intro-profile', label: '프로필', icon: User },
    { id: 'skills', label: '기술 스택', icon: Cpu },
    { id: 'competencies', label: '핵심 역량', icon: Sparkles },
    { id: 'career', label: '직장 경력', icon: Briefcase },
    { id: 'projects', label: '핵심 프로젝트', icon: Briefcase },
    { id: 'credentials', label: '학력·교육 및 자격증', icon: GraduationCap },
];

// 관리자 대시보드의 라이브 프리뷰 패널은 이 페이지를 `/?preview=1`로 iframe에 띄우고,
// sessionStorage(admin-preview-intro-override / admin-preview-nav)를 통해 저장 전 초안과
// 이동할 섹션을 전달한다. 일반 방문자에게는 이 override가 전혀 동작하지 않으므로 서버에서
// 렌더링된 SEO용 HTML(initial introData)에는 영향이 없다.
export function IntroPageClient({ introData: initialIntroData }: Props) {
    const [introData, setIntroData] = useState(initialIntroData);
    const [isSectionNavCollapsed, setIsSectionNavCollapsed] = useState(false);

    useEffect(() => {
        const previewMode = new URLSearchParams(window.location.search).get('preview') === '1';
        if (!previewMode) return;

        const applyOverride = () => {
            try {
                const raw = sessionStorage.getItem('admin-preview-intro-override');
                setIntroData(raw ? (JSON.parse(raw) as IntroductionResponse) : initialIntroData);
            } catch {
                setIntroData(initialIntroData);
            }
        };
        applyOverride();

        const goToSection = () => {
            try {
                const raw = sessionStorage.getItem('admin-preview-nav');
                const nav = raw ? (JSON.parse(raw) as { section?: string }) : null;
                if (nav?.section)
                    requestAnimationFrame(() =>
                        requestAnimationFrame(() => scrollToSection(nav.section!))
                    );
            } catch {
                // 잘못된 payload는 무시
            }
        };
        goToSection();

        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'admin-preview-intro-override') applyOverride();
            else if (event.key === 'admin-preview-nav') goToSection();
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { profile } = introData;

    if (!profile) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
                <p className="text-sm font-bold text-slate-400">
                    프로필 정보를 불러올 수 없습니다.
                </p>
            </div>
        );
    }

    return (
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            <div
                className={`grid grid-cols-[minmax(0,1fr)_52px] items-start gap-4 transition-[grid-template-columns] duration-300 sm:gap-6 ${
                    isSectionNavCollapsed
                        ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
                        : 'min-[900px]:grid-cols-[minmax(0,1fr)_240px]'
                }`}
            >
                <div className="min-w-0 space-y-8">
                    <div
                        id="intro-profile"
                        className="scroll-mt-24 relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md sm:p-8"
                    >
                        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 -translate-y-20 translate-x-20 rounded-full bg-slate-800/5 blur-[60px]" />
                        <div className="relative z-10 space-y-6">
                            <div className="resume-profile-toprow flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
                                <div className="shrink-0 space-y-2">
                                    <h2 className="resume-profile-role whitespace-nowrap bg-gradient-to-r from-slate-900 to-slate-950 bg-clip-text font-black tracking-tight text-transparent">
                                        {profile.jobTitle}
                                    </h2>
                                    <div className="flex items-baseline gap-2.5 whitespace-nowrap">
                                        <h1 className="resume-profile-name whitespace-nowrap font-black text-slate-900">
                                            {profile.name}
                                        </h1>
                                        <span className="resume-profile-name-en whitespace-nowrap font-mono font-bold text-slate-400">
                                            {profile.nameEn}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-3.5 md:mt-0">
                                    <span className="resume-meta inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700 shadow-sm animate-pulse print:hidden">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        {profile.statusBadgeText} (v
                                        {process.env.NEXT_PUBLIC_APP_VERSION} -{' '}
                                        {process.env.NEXT_PUBLIC_BUILD_DATE} 배포)
                                    </span>
                                    <div className="flex items-center gap-2 print:hidden">
                                        <a
                                            href={profile.githubUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-lg border border-slate-200/60 bg-slate-50 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                            title="GitHub"
                                        >
                                            <Github className="h-4 w-4" />
                                        </a>
                                        <a
                                            href={`mailto:${profile.email}`}
                                            className="rounded-lg border border-slate-200/60 bg-slate-50 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                            title="이메일 보내기"
                                        >
                                            <Mail className="h-4 w-4" />
                                        </a>
                                        <a
                                            href={`tel:${profile.phone}`}
                                            className="rounded-lg border border-slate-200/60 bg-slate-50 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                            title="전화 걸기"
                                        >
                                            <Phone className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="resume-body mt-2 max-w-4xl whitespace-pre-line break-words text-slate-600">
                                    {profile.bio}
                                </p>
                            </div>
                        </div>
                    </div>

                    <ResumeSections introData={introData} />
                </div>

                <SectionNavSidebar
                    sections={mainSections}
                    isCollapsed={isSectionNavCollapsed}
                    onToggleCollapse={() => setIsSectionNavCollapsed((collapsed) => !collapsed)}
                />
            </div>
        </div>
    );
}
