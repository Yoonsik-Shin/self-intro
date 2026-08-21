import Link from 'next/link';
import {
    ArrowLeft,
    ArrowRight,
    Boxes,
    Building2,
    Check,
    Cloud,
    Code2,
    Database,
    Mail,
    Network,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { PlatformFooter } from '@/components/nav/PlatformFooter';

const projects = [
    {
        label: '운영 자동화',
        title: '운영 이벤트 통합 허브',
        problem: '여러 채널로 흩어진 운영 이벤트 때문에 담당자가 상황을 다시 조합해야 했습니다.',
        solution:
            '수집, 분류, 담당자 연결과 처리 기록을 하나의 흐름으로 묶고 반복 작업을 자동화했습니다.',
        outcome: '운영 판단에 필요한 맥락과 처리 이력을 같은 화면에서 확인합니다.',
        icon: Network,
    },
    {
        label: '파트너 경험',
        title: '권한 기반 파트너 포털',
        problem: '파트너별로 제공해야 하는 문서와 운영 범위가 달라 전달 과정이 복잡했습니다.',
        solution: '조직과 역할에 따라 필요한 기능과 자료만 노출하는 권한 기반 포털을 구성했습니다.',
        outcome: '내부 원본과 외부 공개 범위를 분리하면서 협업 흐름을 단순화합니다.',
        icon: ShieldCheck,
    },
    {
        label: '데이터 신뢰성',
        title: '데이터 품질 관제',
        problem: '데이터 오류가 최종 화면에서 발견돼 원인 추적과 복구에 시간이 걸렸습니다.',
        solution:
            '처리 단계별 검증과 이력, 재처리 기준을 연결해 이상 징후를 조기에 확인하도록 했습니다.',
        outcome: '문제가 발생한 지점과 영향 범위를 빠르게 좁힐 수 있습니다.',
        icon: Database,
    },
];

const capabilities = [
    ['제품 설계', '운영자의 실제 의사결정 흐름에서 요구사항을 정의합니다.', Boxes],
    ['백엔드 플랫폼', '권한, 데이터 경계와 비동기 처리를 제품 기반으로 설계합니다.', Code2],
    ['클라우드 운영', '배포, 관측과 장애 복구를 개발 흐름 안에서 함께 관리합니다.', Cloud],
] as const;

export function OrganizationExamplePage() {
    return (
        <main className="min-h-screen bg-[#f8fafc] text-slate-800">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <Link href="#top" className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-950 text-white">
                            <Building2 className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                            <strong className="block truncate text-sm font-black text-slate-950">
                                Northstar Labs
                            </strong>
                            <span className="block text-[10px] font-bold text-slate-400">
                                기업·팀 Workspace 예시
                            </span>
                        </span>
                    </Link>
                    <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
                        <Link href="#about" className="hover:text-slate-950">
                            회사 소개
                        </Link>
                        <Link href="#projects" className="hover:text-slate-950">
                            프로젝트
                        </Link>
                        <Link href="#technology" className="hover:text-slate-950">
                            기술
                        </Link>
                        <Link href="#culture" className="hover:text-slate-950">
                            일하는 방식
                        </Link>
                    </nav>
                    <Link
                        href="/"
                        className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">서비스 소개로 돌아가기</span>
                        <span className="sm:hidden">돌아가기</span>
                    </Link>
                </div>
            </header>

            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900">
                이 페이지의 회사명과 모든 내용은 기업용 공개 Workspace를 설명하기 위한 합성
                데이터입니다.
            </div>

            <section id="top" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
                <div className="mx-auto grid max-w-[1500px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white lg:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
                    <div className="p-7 sm:p-10 lg:p-14">
                        <p className="text-sm font-black text-slate-400">B2B operations platform</p>
                        <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.12] tracking-[-0.04em] sm:text-6xl">
                            복잡한 운영 데이터를,
                            <br />
                            팀이 바로 행동할 수 있는 흐름으로.
                        </h1>
                        <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                            Northstar Labs는 제품, 데이터와 운영 흐름을 연결해 반복 업무를 줄이고
                            중요한 판단이 필요한 지점을 더 분명하게 만드는 가상의 B2B 제품
                            조직입니다.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="#projects"
                                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950"
                            >
                                프로젝트 보기 <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="#contact"
                                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-600 px-4 text-sm font-black text-white"
                            >
                                협업 문의
                            </Link>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 bg-slate-900/60 p-7 sm:p-10 lg:border-l lg:border-t-0">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            What we connect
                        </p>
                        <div className="mt-5 divide-y divide-slate-700 border-y border-slate-700">
                            {[
                                '제품 의사결정과 운영 근거',
                                '서비스와 데이터 처리 경계',
                                '배포 이후의 관측과 개선',
                            ].map((item, index) => (
                                <div key={item} className="grid grid-cols-[36px_1fr] gap-3 py-5">
                                    <span className="font-mono text-xs text-slate-500">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <strong className="text-sm text-slate-100">{item}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="about" className="scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-[1500px] gap-8 border-y border-slate-300 py-10 lg:grid-cols-[0.7fr_1.3fr]">
                    <div>
                        <p className="text-sm font-black text-slate-500">회사 소개</p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                            기능보다 운영의 변화로 제품을 설명합니다.
                        </h2>
                    </div>
                    <div className="grid gap-5 text-sm leading-7 text-slate-600 sm:grid-cols-2">
                        <p>
                            사용자가 어떤 정보를 다시 찾고, 어디에서 기다리며, 어떤 판단을
                            반복하는지 먼저 확인합니다. 기능 목록은 그 흐름을 바꾸기 위한 수단으로
                            정의합니다.
                        </p>
                        <p>
                            프로젝트 원본과 성과 근거는 내부에 유지하고, 고객과 지원자에게 필요한
                            내용만 공개 페이지에 선택해 전달합니다.
                        </p>
                    </div>
                </div>
            </section>

            <section id="projects" className="scroll-mt-24 px-4 py-10 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-[1500px]">
                    <p className="text-sm font-black text-slate-500">선택 프로젝트</p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        문제, 해결 방식과 결과를 같은 맥락에서
                    </h2>
                    <div className="mt-7 grid gap-px overflow-hidden rounded-xl border border-slate-300 bg-slate-300 lg:grid-cols-3">
                        {projects.map((project) => {
                            const Icon = project.icon;
                            return (
                                <article key={project.title} className="bg-white p-6 sm:p-7">
                                    <Icon className="h-6 w-6 text-slate-800" />
                                    <p className="mt-6 text-xs font-black text-slate-500">
                                        {project.label}
                                    </p>
                                    <h3 className="mt-2 text-xl font-black text-slate-950">
                                        {project.title}
                                    </h3>
                                    <dl className="mt-6 space-y-4 text-sm leading-6">
                                        <div>
                                            <dt className="text-xs font-black text-slate-400">
                                                문제
                                            </dt>
                                            <dd className="mt-1 text-slate-600">
                                                {project.problem}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-black text-slate-400">
                                                해결
                                            </dt>
                                            <dd className="mt-1 text-slate-600">
                                                {project.solution}
                                            </dd>
                                        </div>
                                        <div className="border-t border-slate-200 pt-4">
                                            <dt className="text-xs font-black text-slate-900">
                                                결과
                                            </dt>
                                            <dd className="mt-1 font-bold text-slate-800">
                                                {project.outcome}
                                            </dd>
                                        </div>
                                    </dl>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section id="technology" className="scroll-mt-24 bg-white px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-[1500px]">
                    <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
                        <div>
                            <p className="text-sm font-black text-slate-500">기술과 역량</p>
                            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                                제품 경계와 운영 가능성을 함께 설계합니다.
                            </h2>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-3">
                            {capabilities.map(([title, description, Icon]) => (
                                <article key={title} className="border-t border-slate-300 pt-5">
                                    <Icon className="h-5 w-5 text-slate-700" />
                                    <h3 className="mt-4 font-black text-slate-950">{title}</h3>
                                    <p className="mt-2 text-xs leading-5 text-slate-600">
                                        {description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                    <div className="mt-10 flex flex-wrap gap-2 border-t border-slate-200 pt-6">
                        {[
                            'Java',
                            'Spring Boot',
                            'TypeScript',
                            'PostgreSQL',
                            'Redis',
                            'Kafka',
                            'Kubernetes',
                            'OpenTelemetry',
                        ].map((technology) => (
                            <span
                                key={technology}
                                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                            >
                                {technology}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section id="culture" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-[1500px] gap-8 lg:grid-cols-[0.7fr_1.3fr]">
                    <div>
                        <Users className="h-7 w-7 text-slate-800" />
                        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                            일하는 방식
                        </h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            '의견보다 확인 가능한 근거를 먼저 공유합니다.',
                            '작은 단위로 배포하고 실제 운영 흐름에서 검증합니다.',
                            '담당자가 바뀌어도 판단 근거가 남도록 기록합니다.',
                            '권한과 공개 범위를 제품 설계의 일부로 다룹니다.',
                        ].map((item) => (
                            <p
                                key={item}
                                className="flex items-start gap-3 border-t border-slate-300 pt-4 text-sm font-bold leading-6 text-slate-700"
                            >
                                <Check className="mt-1 h-4 w-4 shrink-0" /> {item}
                            </p>
                        ))}
                    </div>
                </div>
            </section>

            <section id="contact" className="px-4 pb-8 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-5 rounded-xl bg-slate-950 p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
                    <div>
                        <h2 className="text-2xl font-black">함께 해결할 운영 문제가 있나요?</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            기업 소개 페이지에서 문의 목적과 담당 연결까지 함께 안내할 수 있습니다.
                        </p>
                    </div>
                    <a
                        href="mailto:hello@example.com"
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950"
                    >
                        <Mail className="h-4 w-4" /> hello@example.com
                    </a>
                </div>
            </section>

            <PlatformFooter />
        </main>
    );
}
