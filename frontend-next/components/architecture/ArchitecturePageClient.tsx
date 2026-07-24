'use client';

import { useState } from 'react';
import { Cpu, Layers, Terminal } from 'lucide-react';
import type { ArchitectureLayer, ArchitectureOverview } from '@/lib/api/types';
import { SectionNavSidebar, type SectionNavItem } from '@/components/nav/SectionNavSidebar';
import { PreviewScrollListener } from '@/components/shared/PreviewScrollListener';

const DEFAULT_HEADING = '시스템 아키텍처 (Self-Intro Architecture)';
const DEFAULT_SUBHEADING =
    '이 포트폴리오 웹앱의 도메인 모듈 구조, DB 데이터 관리 방식, 그리고 Cloudflare·오라클 Free Tier 기반 배포 인프라까지 담은 설계 명세입니다.';

const architectureSections: SectionNavItem[] = [
    { id: 'architecture-components', label: '구성 요소', icon: Cpu },
    { id: 'architecture-diagram', label: '배포 흐름도', icon: Terminal },
];

type Props = {
    overview: ArchitectureOverview | null;
    layers: ArchitectureLayer[];
};

export function ArchitecturePageClient({ overview, layers }: Props) {
    const [isSectionNavCollapsed, setIsSectionNavCollapsed] = useState(false);

    return (
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            <PreviewScrollListener />
            <div
                className={`grid grid-cols-[minmax(0,1fr)_52px] items-start gap-4 transition-[grid-template-columns] duration-300 sm:gap-6 ${
                    isSectionNavCollapsed
                        ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
                        : 'min-[900px]:grid-cols-[minmax(0,1fr)_240px]'
                }`}
            >
                <div className="min-w-0 space-y-8">
                    <div
                        id="architecture-components"
                        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                    >
                        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 -translate-y-16 translate-x-16 rounded-full bg-slate-800/5 blur-[50px]" />
                        <div className="relative z-10 border-b border-slate-100 pb-5">
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-800">
                                    <Layers className="h-3 w-3" />
                                    구성 요소 {layers.length}개
                                </span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">
                                {overview?.heading ?? DEFAULT_HEADING}
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
                                {overview?.subheading ?? DEFAULT_SUBHEADING}
                            </p>
                        </div>

                        <div className="relative z-10 mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                            {layers.length === 0 ? (
                                <p className="py-10 text-center text-sm font-bold text-slate-400 md:col-span-3">
                                    등록된 아키텍처 구성 요소가 없습니다.
                                </p>
                            ) : (
                                layers.map((layer) => (
                                    <div
                                        key={layer.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm"
                                    >
                                        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                                            <span className="rounded-lg bg-indigo-50 p-1.5 leading-none">
                                                {layer.icon}
                                            </span>
                                            {layer.title}
                                        </h2>
                                        <ul className="space-y-2 text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere]">
                                            {layer.items.map((item) => (
                                                <li key={item.id}>
                                                    {item.strongText && (
                                                        <strong className="font-bold text-slate-800">
                                                            {item.strongText}
                                                        </strong>
                                                    )}
                                                    {item.bodyText}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div
                        id="architecture-diagram"
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                    >
                        <h2 className="mb-4 flex items-center gap-1.5 text-base font-black text-slate-900 sm:text-lg">
                            <Terminal className="h-4 w-4 text-indigo-600" />
                            <span>
                                {overview?.diagramHeading ??
                                    '실제 운영(Production) 시스템 아키텍처 및 배포 흐름도'}
                            </span>
                        </h2>
                        <pre className="overflow-x-auto whitespace-pre rounded-lg border border-slate-800 bg-slate-900 p-4 font-mono text-[11px] leading-normal tracking-tight text-slate-300 sm:text-[12.5px]">
                            {overview?.diagramText ?? '배포 흐름도가 아직 등록되지 않았습니다.'}
                        </pre>
                    </div>
                </div>

                <SectionNavSidebar
                    sections={architectureSections}
                    isCollapsed={isSectionNavCollapsed}
                    onToggleCollapse={() => setIsSectionNavCollapsed((collapsed) => !collapsed)}
                />
            </div>
        </div>
    );
}
