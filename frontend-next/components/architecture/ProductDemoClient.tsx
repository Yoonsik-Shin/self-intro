'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Briefcase,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleHelp,
    ClipboardList,
    Cpu,
    CreditCard,
    Eye,
    FileText,
    FolderGit2,
    GitBranch,
    GraduationCap,
    Home,
    LayoutDashboard,
    LockKeyhole,
    Menu,
    Printer,
    Radio,
    RotateCcw,
    Save,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    User,
    Users,
    X,
} from 'lucide-react';
import { AiPointUsageGuide } from '@/components/pricing/AiPointUsageGuide';
import { PLATFORM_EXAMPLE_WORKSPACE_HREF } from '@/lib/exampleWorkspace';

type DemoTab =
    | 'WORKSPACE_HOME'
    | 'WORKSPACE_ANALYTICS'
    | 'JOB_APPLICATIONS'
    | 'PROFILE'
    | 'EXPERIENCE'
    | 'STUDY'
    | 'SKILLS'
    | 'COMPETENCIES'
    | 'PORTFOLIO'
    | 'EXPERIENCE_TREE'
    | 'LEARNING_RESOURCES'
    | 'PUBLIC_COMPOSITION'
    | 'PRINT_TEMPLATES'
    | 'WORKSPACE_SETTINGS'
    | 'MEMBERS'
    | 'BILLING'
    | 'WORKSPACE_SUPPORT_ACCESS';

type DemoState = {
    name: string;
    jobTitle: string;
    bio: string;
    projectTitle: string;
    projectSummary: string;
    metric: string;
    competency: string;
    competencyEvidence: string;
    includeProject: boolean;
};

const INITIAL_STATE: DemoState = {
    name: '김개발',
    jobTitle: 'Backend Engineer · Performance & Architecture',
    bio: '운영 병목을 측정하고 데이터 접근과 처리 경계를 재설계하는 백엔드 엔지니어입니다.',
    projectTitle: '학습 종료 처리 비동기 전환',
    projectSummary:
        '동기 처리되던 통계 연산과 후속 작업을 이벤트 fan-out 구조로 분리해 요청 경로를 단순화했습니다.',
    metric: '평균 응답 2.74초 → 413ms',
    competency: '성능 병목 분석과 비동기 아키텍처 설계',
    competencyEvidence: '운영 지표와 코드 경로를 함께 분석하고 개선 전후 응답 시간을 검증했습니다.',
    includeProject: true,
};

type MenuItem = {
    id: DemoTab;
    label: string;
    description: string;
    icon: typeof Home;
};

const MENU_GROUPS: Array<{ label: string; description: string; items: MenuItem[] }> = [
    {
        label: '대시보드',
        description: '현재 Workspace의 기록, 공개본, 지원 현황을 한눈에 확인합니다.',
        items: [
            ['WORKSPACE_HOME', '홈', '현재 Workspace 상태를 확인합니다.', LayoutDashboard],
            [
                'WORKSPACE_ANALYTICS',
                '공개 페이지 통계',
                '공개 페이지 방문 현황을 확인합니다.',
                BarChart3,
            ],
            [
                'JOB_APPLICATIONS',
                '지원 현황',
                '채용 공고별 지원 상태와 맞춤 자료를 관리합니다.',
                ClipboardList,
            ],
        ].map(([id, label, description, icon]) => ({ id, label, description, icon })) as MenuItem[],
    },
    {
        label: '내 기록',
        description: '저장만으로 공개되지 않는 Workspace 원본입니다.',
        items: [
            ['PROFILE', '프로필 원본', '이름, 소개, 연락처 등 사실 데이터를 기록합니다.', User],
            [
                'EXPERIENCE',
                '경력·프로젝트',
                '경력과 프로젝트의 검증 가능한 원본을 기록합니다.',
                Briefcase,
            ],
            ['STUDY', '학습 기록', '학습 내용과 기술적 판단 근거를 기록합니다.', BookOpen],
            ['SKILLS', '기술 스택', 'Workspace에서 사용하는 기술을 구성합니다.', Cpu],
            ['COMPETENCIES', '역량 원본', '경험에서 도출한 역량과 근거를 기록합니다.', Sparkles],
            ['PORTFOLIO', '포트폴리오 원본', '프로젝트 사례 문서의 원본을 작성합니다.', FolderGit2],
            [
                'EXPERIENCE_TREE',
                '경험 관계 원본',
                '학습과 경험 사이의 관계를 기록합니다.',
                GitBranch,
            ],
            [
                'LEARNING_RESOURCES',
                '학습 자료',
                '학습 자료와 활용 상태를 관리합니다.',
                GraduationCap,
            ],
        ].map(([id, label, description, icon]) => ({ id, label, description, icon })) as MenuItem[],
    },
    {
        label: '공개·출력',
        description: '원본을 선별해 웹 공개 페이지 또는 PDF로 내보냅니다.',
        items: [
            [
                'PUBLIC_COMPOSITION',
                '공개 페이지 구성·발행',
                '공개할 항목을 선택하고 발행본을 관리합니다.',
                SlidersHorizontal,
            ],
            [
                'PRINT_TEMPLATES',
                '이력서·PDF 템플릿',
                '지원 목적별 출력 구성을 관리합니다.',
                Printer,
            ],
        ].map(([id, label, description, icon]) => ({ id, label, description, icon })) as MenuItem[],
    },
    {
        label: 'Workspace 설정',
        description: '기본 정보, 멤버, 구독과 보안 동의를 관리합니다.',
        items: [
            ['WORKSPACE_SETTINGS', '설정', 'Workspace 이름과 공개 주소를 관리합니다.', Settings],
            ['MEMBERS', '멤버·권한', '참여 멤버와 역할을 관리합니다.', Users],
            [
                'BILLING',
                '요금제·AI 사용량',
                '구독, 좌석과 AI point 사용량을 확인합니다.',
                CreditCard,
            ],
            [
                'WORKSPACE_SUPPORT_ACCESS',
                '고객 지원 접근 동의',
                '최소 진단 접근 요청을 승인하거나 거절합니다.',
                ShieldCheck,
            ],
        ].map(([id, label, description, icon]) => ({ id, label, description, icon })) as MenuItem[],
    },
];

const IMPLEMENTED_TABS = new Set<DemoTab>([
    'WORKSPACE_HOME',
    'PROFILE',
    'EXPERIENCE',
    'COMPETENCIES',
    'PUBLIC_COMPOSITION',
    'PRINT_TEMPLATES',
    'BILLING',
]);

export function ProductDemoClient() {
    const [activeTab, setActiveTab] = useState<DemoTab>('WORKSPACE_HOME');
    const [demo, setDemo] = useState<DemoState>(INITIAL_STATE);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [saved, setSaved] = useState(false);

    const activeItem = useMemo(
        () => MENU_GROUPS.flatMap((group) => group.items).find((item) => item.id === activeTab),
        [activeTab]
    );
    const selectTab = (tab: DemoTab) => {
        setActiveTab(tab);
        setSaved(false);
        setIsMobileMenuOpen(false);
    };
    const update = <K extends keyof DemoState>(key: K, value: DemoState[K]) => {
        setSaved(false);
        setDemo((current) => ({ ...current, [key]: value }));
    };
    const save = () => {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1600);
    };
    const reset = () => {
        setDemo(INITIAL_STATE);
        setActiveTab('WORKSPACE_HOME');
        setSaved(false);
    };

    return (
        <main className="flex h-screen flex-col overflow-hidden bg-[#f8fafc] text-slate-800">
            <header className="z-50 flex h-12 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 shadow-sm backdrop-blur-xl">
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => selectTab('WORKSPACE_HOME')}
                        className="-mx-1 flex min-w-0 items-baseline gap-2 rounded-md px-1.5 py-1 text-left transition hover:bg-slate-100"
                    >
                        <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">
                            경력 관리 워크스페이스
                        </h1>
                        <span className="hidden text-[10px] font-medium text-slate-400 sm:block">
                            OWNER
                        </span>
                    </button>
                    <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-500 md:inline-flex">
                        합성 데이터 체험
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Link
                        href={PLATFORM_EXAMPLE_WORKSPACE_HREF}
                        className="hidden items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 sm:flex"
                    >
                        <Home className="h-3.5 w-3.5" />
                        <span className="hidden xl:inline">공개 페이지</span>
                    </Link>
                    <button
                        type="button"
                        onClick={reset}
                        className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        title="체험 데이터 초기화"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">초기화</span>
                    </button>
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                        서비스 소개
                    </Link>
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 lg:hidden"
                        aria-label="Workspace 관리 메뉴 열기"
                    >
                        <Menu className="h-4 w-4" />
                    </button>
                </div>
            </header>

            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900">
                <LockKeyhole className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
                실제 관리 화면과 같은 구조의 읽기 전용 체험입니다. 변경 내용과 AI 요청은 서버에
                저장되거나 과금되지 않습니다.
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
                {isMobileMenuOpen && (
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label="Workspace 관리 메뉴 닫기"
                    />
                )}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 w-[min(86vw,280px)] overflow-y-auto bg-white px-4 py-4 shadow-2xl transition-transform lg:static lg:z-auto lg:block lg:translate-x-0 lg:bg-transparent lg:shadow-none ${
                        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isSidebarCollapsed ? 'lg:w-16 lg:px-2' : 'lg:w-[232px] lg:pr-3'}`}
                >
                    <div className="mb-3 flex items-center justify-between lg:hidden">
                        <strong className="text-sm text-slate-900">Workspace 관리 메뉴</strong>
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200"
                            aria-label="메뉴 닫기"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                        className="mb-2 ml-auto hidden h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-900 lg:grid"
                        title={isSidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
                    >
                        {isSidebarCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </button>
                    <nav aria-label="Workspace 관리 메뉴" className="space-y-4">
                        {MENU_GROUPS.map((group, groupIndex) => (
                            <section
                                key={group.label}
                                className={groupIndex > 0 ? 'border-t border-slate-200 pt-4' : ''}
                            >
                                <div
                                    className={`mb-1.5 flex items-center gap-1 px-2 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}
                                >
                                    <h2 className="text-[13px] font-bold tracking-tight text-slate-600">
                                        {group.label}
                                    </h2>
                                    <span className="group/help relative">
                                        <CircleHelp className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="pointer-events-none absolute left-0 top-6 z-50 hidden w-52 rounded-lg bg-slate-900 px-3 py-2 text-[11px] leading-5 text-white group-hover/help:block">
                                            {group.description}
                                        </span>
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const active = activeTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => selectTab(item.id)}
                                                title={`${item.label} · ${item.description}`}
                                                className={`flex items-center rounded-xl text-[13px] font-semibold transition ${
                                                    isSidebarCollapsed
                                                        ? 'lg:mx-auto lg:h-10 lg:w-10 lg:justify-center'
                                                        : 'w-full gap-1.5 px-2 py-2 text-left'
                                                } ${
                                                    active
                                                        ? 'bg-slate-900 text-white shadow-sm'
                                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                }`}
                                            >
                                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                                <span
                                                    className={
                                                        isSidebarCollapsed ? 'lg:hidden' : undefined
                                                    }
                                                >
                                                    {item.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </nav>
                </aside>

                <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain py-4">
                    {activeTab === 'WORKSPACE_HOME' && (
                        <DemoHome demo={demo} onSelect={selectTab} />
                    )}
                    {activeTab === 'PROFILE' && (
                        <RecordEditor
                            kind="profile"
                            demo={demo}
                            update={update}
                            onSave={save}
                            saved={saved}
                        />
                    )}
                    {activeTab === 'EXPERIENCE' && (
                        <RecordEditor
                            kind="experience"
                            demo={demo}
                            update={update}
                            onSave={save}
                            saved={saved}
                        />
                    )}
                    {activeTab === 'COMPETENCIES' && (
                        <RecordEditor
                            kind="competency"
                            demo={demo}
                            update={update}
                            onSave={save}
                            saved={saved}
                        />
                    )}
                    {activeTab === 'PUBLIC_COMPOSITION' && (
                        <PublicationDemo demo={demo} update={update} />
                    )}
                    {activeTab === 'PRINT_TEMPLATES' && (
                        <PrintTemplateDemo demo={demo} update={update} />
                    )}
                    {activeTab === 'BILLING' && <BillingDemo />}
                    {!IMPLEMENTED_TABS.has(activeTab) && <DemoScopeNotice item={activeItem} />}
                </section>
            </div>
        </main>
    );
}

function DemoPageHeader({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <header className="sticky top-0 z-30 flex min-h-10 items-center justify-between gap-3 bg-[#f8fafc] px-5">
            <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-lg font-bold tracking-tight text-slate-950">
                    {title}
                </h2>
                <span className="group/help relative">
                    <CircleHelp className="h-3.5 w-3.5 text-slate-400" />
                    <span className="pointer-events-none absolute left-0 top-6 z-50 hidden w-72 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-5 text-white group-hover/help:block">
                        {description}
                    </span>
                </span>
            </div>
            {action}
        </header>
    );
}

function DemoHome({ demo, onSelect }: { demo: DemoState; onSelect: (tab: DemoTab) => void }) {
    const cards: Array<[string, string, string, typeof Briefcase, DemoTab]> = [
        ['원본 기록', '14개', '경력·프로젝트와 학습 기록', Briefcase, 'EXPERIENCE'],
        ['학습 기록', '8개', 'Workspace에 축적한 학습 문서', BookOpen, 'STUDY'],
        ['기술 스택', '24개', '공통 기술 카탈로그와 연결', Cpu, 'SKILLS'],
        ['역량 원본', '5개', '경험 근거와 연결한 대표 역량', Sparkles, 'COMPETENCIES'],
        ['지원 현황', '3건', '현재 관리 중인 지원 기록', ClipboardList, 'JOB_APPLICATIONS'],
        ['공개 페이지', '공개 중 · v4', '방문자에게 노출 중인 공개본', Radio, 'PUBLIC_COMPOSITION'],
    ];
    return (
        <div className="space-y-4">
            <DemoPageHeader
                title="경력 관리 워크스페이스"
                description="원본 기록부터 공개본과 지원 현황까지 현재 Workspace 상태를 확인합니다."
                action={
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                        OWNER
                    </span>
                }
            />
            <div className="grid gap-4 px-5 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map(([label, value, description, Icon, tab]) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => onSelect(tab)}
                        className="group flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                    >
                        <span className="flex items-center justify-between">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700">
                                <Icon className="h-5 w-5" />
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-300" />
                        </span>
                        <span className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            {label}
                        </span>
                        <strong className="mt-1 text-2xl font-black text-slate-950">{value}</strong>
                        <span className="mt-2 text-sm leading-5 text-slate-500">{description}</span>
                    </button>
                ))}
            </div>
            <div className="mx-5 rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-black text-slate-950">현재 공개본</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    {demo.name} · {demo.jobTitle}
                </p>
                <button
                    type="button"
                    onClick={() => onSelect('PUBLIC_COMPOSITION')}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-black text-slate-800"
                >
                    공개 항목 확인 <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

type EditorProps = {
    demo: DemoState;
    update: <K extends keyof DemoState>(key: K, value: DemoState[K]) => void;
    onSave: () => void;
    saved: boolean;
};

function RecordEditor({
    kind,
    demo,
    update,
    onSave,
    saved,
}: EditorProps & { kind: 'profile' | 'experience' | 'competency' }) {
    const config = {
        profile: ['프로필 원본', '이름, 소개와 연락처에 사용하는 사실 데이터를 기록합니다.'],
        experience: ['경력·프로젝트', '경력과 프로젝트를 성과·근거 단위로 기록합니다.'],
        competency: ['역량 원본', '경험에서 도출한 역량과 연결 근거를 기록합니다.'],
    }[kind];
    return (
        <div className="space-y-4">
            <DemoPageHeader title={config[0]} description={config[1]} />
            <div className="mx-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                {kind === 'profile' && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="프로필 이름">
                                <input
                                    className="demo-input"
                                    value={demo.name}
                                    onChange={(event) => update('name', event.target.value)}
                                />
                            </Field>
                            <Field label="직무 타이틀">
                                <input
                                    className="demo-input"
                                    value={demo.jobTitle}
                                    onChange={(event) => update('jobTitle', event.target.value)}
                                />
                            </Field>
                        </div>
                        <Field label="소개">
                            <textarea
                                className="demo-input min-h-32 resize-y"
                                value={demo.bio}
                                onChange={(event) => update('bio', event.target.value)}
                            />
                        </Field>
                    </>
                )}
                {kind === 'experience' && (
                    <>
                        <Field label="프로젝트 제목">
                            <input
                                className="demo-input"
                                value={demo.projectTitle}
                                onChange={(event) => update('projectTitle', event.target.value)}
                            />
                        </Field>
                        <Field label="프로젝트 요약">
                            <textarea
                                className="demo-input min-h-28 resize-y"
                                value={demo.projectSummary}
                                onChange={(event) => update('projectSummary', event.target.value)}
                            />
                        </Field>
                        <Field label="검증된 결과">
                            <input
                                className="demo-input"
                                value={demo.metric}
                                onChange={(event) => update('metric', event.target.value)}
                            />
                        </Field>
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div>
                                <strong className="text-sm text-slate-900">AI 초안·보정</strong>
                                <p className="mt-1 text-xs text-slate-500">
                                    실제 화면에서는 실행 전 예상 AI point를 확인합니다.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    update(
                                        'projectSummary',
                                        `${demo.projectSummary} 처리 경로와 검증 지표를 함께 기록했습니다.`
                                    )
                                }
                                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700"
                            >
                                <Sparkles className="h-3.5 w-3.5" /> 합성 AI 보정 체험
                            </button>
                        </div>
                    </>
                )}
                {kind === 'competency' && (
                    <>
                        <Field label="역량명">
                            <input
                                className="demo-input"
                                value={demo.competency}
                                onChange={(event) => update('competency', event.target.value)}
                            />
                        </Field>
                        <Field label="역량 설명">
                            <textarea
                                className="demo-input min-h-28 resize-y"
                                value={demo.competencyEvidence}
                                onChange={(event) =>
                                    update('competencyEvidence', event.target.value)
                                }
                            />
                        </Field>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <strong className="text-xs text-emerald-900">연결된 경험 근거</strong>
                            <p className="mt-2 text-sm font-bold text-emerald-950">
                                {demo.projectTitle}
                            </p>
                            <p className="mt-1 text-xs text-emerald-800">{demo.metric}</p>
                        </div>
                    </>
                )}
                <div className="flex justify-end border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={onSave}
                        className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-black ${saved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-900 text-white'}`}
                    >
                        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {saved ? '체험 화면에 반영됨' : '변경사항 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PublicationDemo({
    demo,
    update,
}: {
    demo: DemoState;
    update: <K extends keyof DemoState>(key: K, value: DemoState[K]) => void;
}) {
    return (
        <div className="space-y-4">
            <DemoPageHeader
                title="공개 페이지 구성·발행"
                description="공개할 원본을 선택하고 방문자 화면을 미리 본 뒤 발행합니다."
                action={
                    <button className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-black text-white">
                        <Radio className="h-3.5 w-3.5" /> 변경사항 발행
                    </button>
                }
            />
            <div className="mx-5 grid min-h-[620px] overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
                <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                    <h3 className="font-black text-slate-950">공개할 원본 선택</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        저장한 원본은 선택하고 발행하기 전까지 방문자에게 보이지 않습니다.
                    </p>
                    <div className="mt-5 space-y-3">
                        {[
                            ['프로필', `${demo.name} · ${demo.jobTitle}`, true],
                            ['핵심 역량', demo.competency, true],
                            ['프로젝트', demo.projectTitle, demo.includeProject],
                        ].map(([label, title, checked]) => (
                            <label
                                key={String(label)}
                                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4"
                            >
                                <input
                                    type="checkbox"
                                    checked={Boolean(checked)}
                                    onChange={(event) => {
                                        if (label === '프로젝트') {
                                            update('includeProject', event.target.checked);
                                        }
                                    }}
                                    disabled={label !== '프로젝트'}
                                    className="mt-0.5 h-4 w-4 accent-slate-900"
                                />
                                <span>
                                    <strong className="block text-xs text-slate-500">
                                        {label}
                                    </strong>
                                    <span className="mt-1 block text-sm font-bold text-slate-900">
                                        {title}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
                <PublicPreview demo={demo} />
            </div>
        </div>
    );
}

function PublicPreview({ demo }: { demo: DemoState }) {
    return (
        <div className="bg-slate-100 p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
                <strong className="text-sm text-slate-900">방문자 화면 미리보기</strong>
                <Eye className="h-4 w-4 text-slate-500" />
            </div>
            <article className="mx-auto rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    {demo.jobTitle}
                </p>
                <h3 className="mt-3 text-3xl font-black text-slate-950">{demo.name}</h3>
                <p className="mt-4 text-sm leading-6 text-slate-600">{demo.bio}</p>
                <section className="mt-6 border-t border-slate-200 pt-5">
                    <h4 className="text-sm font-black text-slate-950">핵심 역량</h4>
                    <p className="mt-2 text-sm font-bold text-slate-800">{demo.competency}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        {demo.competencyEvidence}
                    </p>
                </section>
                {demo.includeProject && (
                    <section className="mt-6 border-t border-slate-200 pt-5">
                        <h4 className="text-sm font-black text-slate-950">선택 프로젝트</h4>
                        <p className="mt-2 font-bold text-slate-900">{demo.projectTitle}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                            {demo.projectSummary}
                        </p>
                        <p className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                            {demo.metric}
                        </p>
                    </section>
                )}
            </article>
        </div>
    );
}

function PrintTemplateDemo({
    demo,
    update,
}: {
    demo: DemoState;
    update: <K extends keyof DemoState>(key: K, value: DemoState[K]) => void;
}) {
    return (
        <div className="space-y-4">
            <DemoPageHeader
                title="이력서·PDF 템플릿"
                description="지원 목적별 이력서와 PDF 출력 구성을 관리합니다."
            />
            <div className="mx-5 grid gap-4 lg:grid-cols-2">
                <article className="rounded-xl border-2 border-slate-900 bg-white p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[11px] font-black text-slate-500">FINAL</span>
                            <h3 className="mt-1 font-black text-slate-950">
                                플랫폼·아키텍처 지원용
                            </h3>
                        </div>
                        <Printer className="h-5 w-5" />
                    </div>
                    <label className="mt-5 flex items-start gap-3 rounded-md bg-slate-50 p-3">
                        <input
                            type="checkbox"
                            checked={demo.includeProject}
                            onChange={(event) => update('includeProject', event.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-slate-900"
                        />
                        <span>
                            <strong className="block text-xs text-slate-900">
                                {demo.projectTitle}
                            </strong>
                            <span className="mt-1 block text-[11px] text-slate-500">
                                이 프로젝트를 문서에 포함
                            </span>
                        </span>
                    </label>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white p-5">
                    <span className="text-[11px] font-black text-slate-400">BASE</span>
                    <h3 className="mt-1 font-black text-slate-950">기본 백엔드 이력서</h3>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                        직접 작성한 내용으로 PDF를 출력할 때는 AI point를 사용하지 않습니다.
                    </p>
                </article>
            </div>
        </div>
    );
}

function BillingDemo() {
    return (
        <div className="space-y-4">
            <DemoPageHeader
                title="요금제·AI 사용량"
                description="Workspace 구독, 좌석, AI point와 처리 경로를 확인합니다."
            />
            <div className="mx-5 grid gap-3 md:grid-cols-3">
                {[
                    ['현재 플랜', 'Pro'],
                    ['사용 가능한 AI point', '4,620 point'],
                    ['멤버', '3 / 5명'],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
                        <p className="text-xs font-bold text-slate-500">{label}</p>
                        <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
                    </div>
                ))}
            </div>
            <div className="mx-5">
                <AiPointUsageGuide compact />
            </div>
        </div>
    );
}

function DemoScopeNotice({ item }: { item?: MenuItem }) {
    return (
        <div className="space-y-4">
            <DemoPageHeader
                title={item?.label ?? '기능 안내'}
                description={item?.description ?? 'Workspace 관리 기능입니다.'}
            />
            <div className="mx-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-4 font-black text-slate-950">실제 메뉴 위치를 확인했습니다.</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                    이 체험은 실제 관리 화면과 동일한 메뉴 구조를 사용합니다. 외부 파일, 실제 지원
                    정보나 보안 설정이 필요한 조작은 합성 데이터 체험에서 실행하지 않습니다.
                </p>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>
            {children}
        </label>
    );
}
