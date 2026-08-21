'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    BookOpenCheck,
    Building2,
    Check,
    CreditCard,
    EyeOff,
    FileStack,
    KeyRound,
    LockKeyhole,
    PlayCircle,
    ShieldCheck,
    Sparkles,
    Target,
    UserCheck,
    UserRound,
    Workflow,
} from 'lucide-react';
import { PricingPlanCards } from '@/components/pricing/PricingPlanCards';
import { AiPointUsageGuide } from '@/components/pricing/AiPointUsageGuide';
import { SectionNavSidebar, type SectionNavItem } from '@/components/nav/SectionNavSidebar';
import { PreviewScrollListener } from '@/components/shared/PreviewScrollListener';
import { ORGANIZATION_EXAMPLE_HREF, PLATFORM_EXAMPLE_WORKSPACE_HREF } from '@/lib/exampleWorkspace';
import { useAuthStore } from '@/store/useAuthStore';

const sections: SectionNavItem[] = [
    { id: 'product-value', label: '제품 가치', icon: Target },
    { id: 'outcomes', label: '제공하는 결과', icon: FileStack },
    { id: 'features', label: '제공 기능', icon: Check },
    { id: 'workflow', label: '사용 흐름', icon: Workflow },
    { id: 'ai-usage', label: 'AI point 사용처', icon: Sparkles },
    { id: 'privacy', label: '개인정보 보호', icon: ShieldCheck },
    { id: 'responsible-ai', label: 'AI 원칙', icon: Sparkles },
    { id: 'pricing', label: '요금제', icon: CreditCard },
    { id: 'get-started', label: '시작하기', icon: PlayCircle },
];

type WorkspaceAudience = 'PERSONAL' | 'ORGANIZATION';

const audienceContent = {
    PERSONAL: {
        label: '개인',
        icon: UserRound,
        eyebrow: 'Personal career workspace',
        headline: '지원할 때마다 경력을 처음부터 다시 쓰지 마세요.',
        description:
            '경험과 근거는 한 번 기록하고, 지원처에 맞는 이력서·포트폴리오와 공개 프로필은 그 원본에서 골라 만듭니다. 복사본이 늘어날수록 생기는 누락과 불일치를 줄여 드립니다.',
        sourceItems: [
            '경력·프로젝트·학습 근거',
            '지원처별 이력서·포트폴리오',
            '공개 프로필·PDF 발행',
        ],
        outcomesHeading: '이력서 파일이 아니라 경력 자산을 관리합니다.',
        outcomesDescription:
            '문서 하나를 완성하고 끝내는 대신, 다음 지원에서도 다시 사용할 수 있는 원본과 근거를 남깁니다.',
        outcomes: [
            {
                title: '경력 원본을 한곳에',
                description:
                    '경력, 프로젝트, 학습, 성과 근거를 흩어진 문서 대신 연결된 기록으로 관리합니다.',
                icon: BookOpenCheck,
            },
            {
                title: '지원할 때는 다시 쓰지 않고 조합',
                description:
                    '원본을 복사해 덮어쓰지 않고 지원 목적에 맞는 경험과 강조점만 선택해 결과물을 만듭니다.',
                icon: Target,
            },
            {
                title: '웹과 PDF를 같은 원본에서',
                description:
                    '공개 프로필, 포트폴리오와 지원별 PDF가 같은 경력 원본을 사용해 내용 불일치를 줄입니다.',
                icon: FileStack,
            },
        ],
        features: [
            ['경력·프로젝트 관리', '업무, 프로젝트, 성과와 상세 근거를 연결해 기록합니다.'],
            ['학습·기술 관리', '학습 기록과 기술 스택을 경험·프로젝트와 함께 관리합니다.'],
            ['역량 근거 정리', '여러 경험의 근거를 묶어 핵심 역량과 성과 설명으로 정리합니다.'],
            ['지원 현황·문서', '채용 공고와 지원 상태를 관리하고 지원별 문서를 구성합니다.'],
            ['포트폴리오 제작', '선택한 프로젝트 근거로 사례 중심 포트폴리오를 만듭니다.'],
            ['공개 프로필·PDF', '공개할 내용만 골라 웹 프로필과 PDF로 발행합니다.'],
        ],
        workflow: [
            ['01', '기록', '경력·프로젝트·학습과 이를 뒷받침하는 근거를 저장합니다.'],
            ['02', '연결', '경험을 기술·역량·성과와 연결해 내가 무엇을 해결했는지 구조화합니다.'],
            ['03', '선택', '지원처와 공개 목적에 필요한 내용만 골라 문서 구성을 만듭니다.'],
            ['04', '발행', '같은 원본에서 공개 페이지와 이력서·포트폴리오 PDF를 발행합니다.'],
        ],
        ctaHeading: '지금 가진 경력부터 연결해 보세요.',
    },
    ORGANIZATION: {
        label: '기업·팀',
        icon: Building2,
        eyebrow: 'Organization workspace',
        headline: '회사와 팀의 이야기를 흩어진 자료로 남겨두지 마세요.',
        description:
            '조직 소개와 프로젝트, 성과 근거를 하나의 Workspace에서 관리하고 역할을 나눠 함께 운영합니다. 공개할 내용만 골라 기업·팀 소개 페이지와 PDF로 발행할 수 있습니다.',
        sourceItems: [
            '회사·팀 소개와 프로젝트 근거',
            '역할에 따른 구성원 공동 관리',
            '공개 소개 페이지·PDF 발행',
        ],
        outcomesHeading: '소개 페이지가 아니라 조직의 콘텐츠 원본을 관리합니다.',
        outcomesDescription:
            '담당자가 바뀌거나 소개 자료가 늘어나도 같은 Workspace 원본에서 최신 내용을 이어서 관리합니다.',
        outcomes: [
            {
                title: '조직 자료를 한곳에',
                description:
                    '회사·팀 소개, 프로젝트와 성과 근거를 개인 파일 대신 Workspace의 연결된 기록으로 관리합니다.',
                icon: Building2,
            },
            {
                title: '역할을 나눠 함께 운영',
                description:
                    'OWNER, ADMIN, EDITOR, VIEWER 역할에 따라 필요한 구성원만 콘텐츠 관리에 참여합니다.',
                icon: UserCheck,
            },
            {
                title: '공개 범위를 골라 발행',
                description:
                    '내부 원본 전체를 노출하지 않고 소개 목적에 필요한 콘텐츠만 공개 페이지와 PDF로 발행합니다.',
                icon: FileStack,
            },
        ],
        features: [
            ['회사·팀 소개 관리', '조직 소개, 프로젝트와 성과 근거를 하나의 원본으로 관리합니다.'],
            ['멤버·역할 관리', 'OWNER, ADMIN, EDITOR, VIEWER 역할로 관리 범위를 나눕니다.'],
            ['프로젝트·기술 기록', '조직의 프로젝트와 사용 기술, 결과를 연결해 관리합니다.'],
            ['공개 범위 구성', '내부 원본 중 고객과 지원자에게 보여줄 항목만 선택합니다.'],
            ['기업·팀 사례 제작', '선택한 프로젝트 근거로 신뢰할 수 있는 소개 사례를 구성합니다.'],
            ['공개 페이지·PDF', '같은 원본에서 기업·팀 소개 페이지와 PDF를 발행합니다.'],
        ],
        workflow: [
            ['01', '기록', '조직 소개와 프로젝트, 학습·성과를 뒷받침하는 근거를 저장합니다.'],
            ['02', '협업', '구성원에게 역할을 부여하고 관리할 수 있는 범위를 나눕니다.'],
            ['03', '선택', '고객과 지원자에게 공개할 내용만 골라 소개 구성을 만듭니다.'],
            ['04', '발행', '같은 원본에서 기업·팀 공개 페이지와 소개 PDF를 발행합니다.'],
        ],
        ctaHeading: '조직이 이미 가진 소개 자료부터 연결해 보세요.',
    },
} satisfies Record<
    WorkspaceAudience,
    {
        label: string;
        icon: typeof UserRound;
        eyebrow: string;
        headline: string;
        description: string;
        sourceItems: string[];
        outcomesHeading: string;
        outcomesDescription: string;
        outcomes: { title: string; description: string; icon: typeof UserRound }[];
        features: [string, string][];
        workflow: string[][];
        ctaHeading: string;
    }
>;

const privacyProtections = [
    {
        title: 'Workspace마다 서버에서 권한 확인',
        description:
            '메뉴를 숨기는 데 그치지 않고 모든 Workspace API에서 멤버십과 역할을 다시 검증합니다.',
        icon: LockKeyhole,
    },
    {
        title: '고객지원 접근도 소유자 승인 후',
        description:
            '운영자는 이유와 범위, 시간을 지정해 요청해야 하며 OWNER가 승인한 최소 진단만 확인할 수 있습니다.',
        icon: UserCheck,
    },
    {
        title: '사용량·결제 로그에 원문을 남기지 않음',
        description:
            'AI prompt·응답, 이메일, Workspace 이름을 사용량·결제 원장과 운영 오류 로그에 저장하지 않습니다.',
        icon: EyeOff,
    },
    {
        title: 'BYOK 키 원문 재조회 금지',
        description:
            'Provider API key는 업무 데이터와 분리하고 등록 후 브라우저에서 다시 읽거나 다운로드하는 API를 제공하지 않습니다.',
        icon: KeyRound,
    },
];

const aiPrinciples = [
    {
        title: '사용자가 선택한 근거만 AI에 전달',
        description:
            'Workspace 전체를 무제한으로 읽게 하지 않고 작업 목적과 사용자가 선택한 자료를 기준으로 입력을 구성합니다.',
    },
    {
        title: '근거가 부족하면 생성을 멈춤',
        description:
            '포트폴리오 AI는 근거 준비 상태를 먼저 확인하고 부족하면 내용을 꾸며내는 대신 보완할 항목을 안내합니다.',
    },
    {
        title: '자동 전환·자동충전 없음',
        description:
            'BYOK 오류 시 플랫폼 키로 몰래 전환하지 않고, AI point가 부족해도 사용자의 승인 없이 자동 결제하지 않습니다.',
    },
];

export function PlatformLandingPage() {
    const [isSectionNavCollapsed, setIsSectionNavCollapsed] = useState(false);
    const [audience, setAudience] = useState<WorkspaceAudience>('PERSONAL');
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isCheckingSession = useAuthStore((state) => state.isChecking);
    const me = useAuthStore((state) => state.me);
    const currentWorkspace = me?.workspaces[0];
    const content = audienceContent[audience];

    const primaryHref = currentWorkspace
        ? `/workspace/${encodeURIComponent(currentWorkspace.slug)}/manage`
        : isAuthenticated
          ? '/onboarding/workspace'
          : '/signup';
    const primaryLabel = currentWorkspace
        ? '내 Workspace 열기'
        : isAuthenticated
          ? '첫 Workspace 만들기'
          : '초대받아 가입하기';

    return (
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
            <PreviewScrollListener />
            <div
                className={`grid grid-cols-[minmax(0,1fr)_52px] items-start gap-4 transition-[grid-template-columns] duration-300 sm:gap-6 ${
                    isSectionNavCollapsed
                        ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
                        : 'min-[900px]:grid-cols-[minmax(0,1fr)_220px] min-[1200px]:grid-cols-[minmax(0,1fr)_240px]'
                }`}
            >
                <div className="min-w-0 space-y-8">
                    <section
                        id="product-value"
                        className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white"
                    >
                        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                            <div className="p-6 sm:p-10 lg:p-12">
                                <div
                                    className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1"
                                    aria-label="소개 주체 선택"
                                >
                                    {(Object.keys(audienceContent) as WorkspaceAudience[]).map(
                                        (audienceKey) => {
                                            const option = audienceContent[audienceKey];
                                            const Icon = option.icon;
                                            const selected = audience === audienceKey;
                                            return (
                                                <button
                                                    key={audienceKey}
                                                    type="button"
                                                    aria-pressed={selected}
                                                    onClick={() => setAudience(audienceKey)}
                                                    className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-black transition ${
                                                        selected
                                                            ? 'bg-white text-slate-950'
                                                            : 'text-slate-300 hover:text-white'
                                                    }`}
                                                >
                                                    <Icon className="h-3.5 w-3.5" /> {option.label}
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                                <p className="mt-6 text-sm font-bold text-slate-300">
                                    {content.eyebrow}
                                </p>
                                <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.12] tracking-[-0.04em] sm:text-6xl">
                                    {content.headline}
                                </h1>
                                <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                                    {content.description}
                                </p>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    {!isCheckingSession && (
                                        <Link
                                            href={primaryHref}
                                            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-200"
                                        >
                                            {primaryLabel} <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    )}
                                    <Link
                                        href="/architecture/demo"
                                        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-600 px-4 text-sm font-black text-white hover:border-slate-400 hover:bg-slate-900"
                                    >
                                        <PlayCircle className="h-4 w-4" /> 관리 화면 체험
                                    </Link>
                                    <Link
                                        href={
                                            audience === 'PERSONAL'
                                                ? PLATFORM_EXAMPLE_WORKSPACE_HREF
                                                : ORGANIZATION_EXAMPLE_HREF
                                        }
                                        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-600 px-4 text-sm font-black text-white hover:border-slate-400 hover:bg-slate-900"
                                    >
                                        {audience === 'PERSONAL' ? (
                                            <UserRound className="h-4 w-4" />
                                        ) : (
                                            <Building2 className="h-4 w-4" />
                                        )}
                                        {audience === 'PERSONAL'
                                            ? '실제 프로필 보기'
                                            : '기업 공개 예시 보기'}
                                    </Link>
                                    <Link
                                        href="/pricing"
                                        className="inline-flex min-h-11 items-center px-2 text-sm font-black text-slate-300 hover:text-white"
                                    >
                                        요금제 보기
                                    </Link>
                                </div>
                            </div>

                            <div className="border-t border-slate-800 bg-slate-900/50 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                    One source, many outcomes
                                </p>
                                <div className="mt-5 divide-y divide-slate-700 border-y border-slate-700">
                                    {content.sourceItems.map((label, index) => (
                                        <div
                                            key={label}
                                            className="grid grid-cols-[40px_1fr] items-center gap-3 py-5"
                                        >
                                            <span className="font-mono text-xs text-slate-500">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <strong className="text-sm text-slate-100">
                                                {label}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-5 text-xs leading-5 text-slate-400">
                                    저장한 원본은 발행하기 전까지 공개 페이지에 노출되지 않습니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section
                        id="outcomes"
                        className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
                    >
                        <div className="max-w-3xl">
                            <p className="text-sm font-black text-slate-500">What you get</p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                {content.outcomesHeading}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                {content.outcomesDescription}
                            </p>
                        </div>
                        <div className="mt-7 grid border-y border-slate-200 md:grid-cols-3 md:divide-x md:divide-slate-200">
                            {content.outcomes.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article
                                        key={item.title}
                                        className="border-b border-slate-200 py-6 md:border-b-0 md:px-6 md:first:pl-0 md:last:pr-0"
                                    >
                                        <Icon className="h-6 w-6 text-slate-700" />
                                        <h3 className="mt-4 font-black text-slate-950">
                                            {item.title}
                                        </h3>
                                        <p className="mt-2 text-xs leading-5 text-slate-600">
                                            {item.description}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section
                        id="features"
                        className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
                    >
                        <div className="max-w-3xl">
                            <p className="text-sm font-black text-slate-500">제공 기능</p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                Workspace에서 실제로 할 수 있는 작업
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                원본 기록부터 지원·소개 문서와 공개 페이지 발행까지 한 흐름에서
                                관리합니다.
                            </p>
                        </div>
                        <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                            {content.features.map(([title, description]) => (
                                <article key={title} className="bg-white p-5">
                                    <Check className="h-5 w-5 text-slate-700" />
                                    <h3 className="mt-4 font-black text-slate-950">{title}</h3>
                                    <p className="mt-2 text-xs leading-5 text-slate-600">
                                        {description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section
                        id="workflow"
                        className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
                    >
                        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                            기록에서 발행까지 네 단계
                        </h2>
                        <ol className="mt-7 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                            {content.workflow.map(([step, title, description]) => (
                                <li key={step} className="bg-white p-5">
                                    <span className="font-mono text-xs font-black text-slate-400">
                                        {step}
                                    </span>
                                    <h3 className="mt-4 font-black text-slate-950">{title}</h3>
                                    <p className="mt-2 text-xs leading-5 text-slate-600">
                                        {description}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <AiPointUsageGuide id="ai-usage" />

                    <section
                        id="privacy"
                        className="scroll-mt-24 rounded-xl border border-slate-300 bg-white p-6 sm:p-8"
                    >
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                            <div>
                                <div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-white">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                    개인과 조직의 정보는 운영 편의보다 접근 통제를 먼저 봅니다.
                                </h2>
                                <p className="mt-4 text-sm leading-6 text-slate-600">
                                    플랫폼 운영자라는 이유만으로 다른 Workspace의 원문을 바로 열 수
                                    없도록 권한, 고객지원과 로그 경계를 분리합니다.
                                </p>
                                <Link
                                    href="/policies/privacy"
                                    className="mt-5 inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:text-slate-950"
                                >
                                    개인정보 처리방침 보기 <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {privacyProtections.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <article
                                            key={item.title}
                                            className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                                        >
                                            <Icon className="h-5 w-5 text-slate-700" />
                                            <h3 className="mt-4 text-sm font-black text-slate-950">
                                                {item.title}
                                            </h3>
                                            <p className="mt-2 text-xs leading-5 text-slate-600">
                                                {item.description}
                                            </p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section
                        id="responsible-ai"
                        className="scroll-mt-24 rounded-xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-8"
                    >
                        <div className="max-w-3xl">
                            <p className="text-sm font-black text-slate-400">Responsible AI</p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                                AI가 없는 사실을 대신 꾸며내지 않도록
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                                생성 속도보다 사용자가 선택한 근거, 처리 동의와 예측 가능한 결제
                                원칙을 우선합니다.
                            </p>
                        </div>
                        <div className="mt-7 grid gap-px overflow-hidden rounded-lg bg-slate-700 lg:grid-cols-3">
                            {aiPrinciples.map((item) => (
                                <article key={item.title} className="bg-slate-900 p-5">
                                    <Check className="h-5 w-5 text-emerald-400" />
                                    <h3 className="mt-4 font-black text-white">{item.title}</h3>
                                    <p className="mt-2 text-xs leading-5 text-slate-300">
                                        {item.description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section
                        id="pricing"
                        className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="max-w-3xl">
                                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                    필요한 만큼 시작하고 사용량에 맞춰 확장하세요.
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                    소개 주체는 개인 또는 기업·팀으로 별도 선택하고, 필요한
                                    Workspace 수와 멤버, AI 사용량에 따라 플랜을 결정합니다.
                                </p>
                            </div>
                            <Link
                                href="/pricing"
                                className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-slate-700 hover:text-slate-950"
                            >
                                요금제 상세 보기 <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="mt-7">
                            <PricingPlanCards dashboard />
                        </div>
                    </section>

                    <section
                        id="get-started"
                        className="scroll-mt-24 rounded-xl border border-slate-300 bg-white p-6 sm:p-8"
                    >
                        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                    {content.ctaHeading}
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                    합성 데이터로 관리 흐름을 먼저 체험하거나, 가입 후 개인 또는
                                    기업·팀을 소개하는 Workspace를 시작할 수 있습니다.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href={
                                        audience === 'PERSONAL'
                                            ? PLATFORM_EXAMPLE_WORKSPACE_HREF
                                            : ORGANIZATION_EXAMPLE_HREF
                                    }
                                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                                >
                                    {audience === 'PERSONAL' ? (
                                        <UserRound className="h-4 w-4" />
                                    ) : (
                                        <Building2 className="h-4 w-4" />
                                    )}
                                    {audience === 'PERSONAL'
                                        ? '실제 프로필 보기'
                                        : '기업 공개 예시 보기'}
                                </Link>
                                <Link
                                    href="/architecture/demo"
                                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                                >
                                    <PlayCircle className="h-4 w-4" /> 관리 화면 체험
                                </Link>
                                {!isCheckingSession && (
                                    <Link
                                        href={primaryHref}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
                                    >
                                        {primaryLabel} <ArrowRight className="h-4 w-4" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                <SectionNavSidebar
                    sections={sections}
                    isCollapsed={isSectionNavCollapsed}
                    onToggleCollapse={() => setIsSectionNavCollapsed((collapsed) => !collapsed)}
                />
            </div>
        </div>
    );
}
