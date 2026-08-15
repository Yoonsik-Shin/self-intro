'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    BookOpen,
    Briefcase,
    Check,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Cpu,
    Eye,
    FileText,
    FolderGit2,
    Home,
    LayoutDashboard,
    LockKeyhole,
    Menu,
    Plus,
    Printer,
    RefreshCw,
    RotateCcw,
    Save,
    Sparkles,
    User,
    X,
} from 'lucide-react';

type DemoTab =
    | 'OVERVIEW'
    | 'STUDY'
    | 'SKILLS'
    | 'EXPERIENCE'
    | 'JOB_APPLICATIONS'
    | 'PROFILE'
    | 'COMPETENCIES'
    | 'PORTFOLIO'
    | 'PRINT_TEMPLATES';

type DemoState = {
    name: string;
    nameEn: string;
    jobTitle: string;
    bio: string;
    coreStack: string;
    projectTitle: string;
    projectSummary: string;
    metric: string;
    competency: string;
    competencyEvidence: string;
    includeProject: boolean;
};

const initialState: DemoState = {
    name: '김개발',
    nameEn: 'Gildong Kim',
    jobTitle: 'Backend Engineer · Performance & Architecture',
    bio: '운영 병목을 측정하고 데이터 접근과 처리 경계를 재설계하는 백엔드 엔지니어입니다.',
    coreStack: 'Java · Spring Boot · MongoDB · AWS',
    projectTitle: '학습 종료 처리 비동기 전환',
    projectSummary:
        '동기 처리되던 통계 연산과 후속 작업을 이벤트 fan-out 구조로 분리해 요청 경로를 단순화했습니다.',
    metric: '평균 응답 2.74초 → 413ms',
    competency: '성능 병목 분석과 비동기 아키텍처 설계',
    competencyEvidence: '운영 지표와 코드 경로를 함께 분석하고 개선 전후 응답 시간을 검증했습니다.',
    includeProject: true,
};

const demoTabs = new Set<DemoTab>([
    'OVERVIEW',
    'EXPERIENCE',
    'PROFILE',
    'COMPETENCIES',
    'PRINT_TEMPLATES',
]);

const menuGroups: Array<{
    label: string;
    items: Array<{ id: DemoTab; label: string; icon: typeof BookOpen }>;
}> = [
    {
        label: '워크스페이스',
        items: [{ id: 'OVERVIEW', label: '홈', icon: LayoutDashboard }],
    },
    {
        label: '내 경력 자산',
        items: [
            { id: 'EXPERIENCE', label: '경력 및 프로젝트', icon: Briefcase },
            { id: 'STUDY', label: '근거 및 학습 기록', icon: BookOpen },
            { id: 'SKILLS', label: '기술 스택', icon: Cpu },
            { id: 'COMPETENCIES', label: '핵심 역량', icon: Sparkles },
        ],
    },
    {
        label: '지원 준비',
        items: [
            { id: 'PRINT_TEMPLATES', label: '이력서 관리', icon: FileText },
            { id: 'JOB_APPLICATIONS', label: '지원 현황', icon: ClipboardList },
        ],
    },
    {
        label: '공개 프로필',
        items: [
            { id: 'PROFILE', label: '프로필 편집', icon: User },
            { id: 'PORTFOLIO', label: '프로젝트 쇼케이스', icon: FolderGit2 },
        ],
    },
];

export function ProductDemoClient() {
    const [activeTab, setActiveTab] = useState<DemoTab>('OVERVIEW');
    const [demo, setDemo] = useState<DemoState>(initialState);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(true);
    const [saved, setSaved] = useState(false);

    const activeLabel = useMemo(
        () =>
            menuGroups.flatMap((group) => group.items).find((item) => item.id === activeTab)
                ?.label ?? '워크스페이스',
        [activeTab]
    );

    const update = <K extends keyof DemoState>(key: K, value: DemoState[K]) => {
        setSaved(false);
        setDemo((current) => ({ ...current, [key]: value }));
    };

    const selectTab = (tab: DemoTab) => {
        setActiveTab(tab);
        setSaved(false);
        setIsMobileMenuOpen(false);
    };

    const handleSave = () => {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1600);
    };

    const reset = () => {
        setDemo(initialState);
        setActiveTab('OVERVIEW');
        setSaved(false);
    };

    return (
        <main className="min-h-screen bg-[#f8fafc] text-slate-800">
            <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-950 text-xs font-black text-white">
                        SI
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-sm font-black text-slate-900">
                            김개발의 워크스페이스
                        </h1>
                        <p className="hidden text-[11px] text-slate-400 sm:block">
                            Career profile workspace
                        </p>
                    </div>
                    <span className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black tracking-wide text-indigo-700 sm:inline-flex">
                        PUBLIC DEMO
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSidebarCollapsed(false);
                            setIsMobileMenuOpen(true);
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 lg:hidden"
                        aria-label="워크스페이스 메뉴 열기"
                        title="워크스페이스 메뉴 열기"
                    >
                        <Menu className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsPreviewOpen((open) => !open)}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-bold transition ${
                            isPreviewOpen
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        aria-label={isPreviewOpen ? '미리보기 닫기' : '미리보기 열기'}
                        title={isPreviewOpen ? '미리보기 닫기' : '미리보기 열기'}
                    >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">미리보기</span>
                    </button>
                    <button
                        type="button"
                        onClick={reset}
                        className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        aria-label="데모 초기화"
                        title="데모 초기화"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">초기화</span>
                    </button>
                    <Link
                        href="/#admin-demo"
                        className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        aria-label="데모 종료"
                        title="데모 종료"
                    >
                        <Home className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">데모 종료</span>
                    </Link>
                </div>
            </header>

            <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-center text-xs font-bold text-indigo-800">
                <LockKeyhole className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
                구직자가 사용하는 워크스페이스 데모입니다. 합성 데이터만 사용하며 변경 내용은 서버에
                저장되지 않습니다. 서비스 운영 도구는 이 화면과 분리됩니다.
            </div>

            <div className="flex items-start">
                {isMobileMenuOpen && (
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px] lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label="워크스페이스 메뉴 닫기"
                    />
                )}
                <div className="min-w-0 flex-1">
                    <div
                        className={`grid w-full grid-cols-1 gap-6 px-4 py-6 transition-[grid-template-columns] duration-300 sm:px-6 lg:px-8 ${
                            isSidebarCollapsed
                                ? 'lg:grid-cols-[64px_minmax(0,1fr)]'
                                : 'lg:grid-cols-[240px_minmax(0,1fr)]'
                        }`}
                    >
                        <aside
                            className={`fixed inset-y-0 left-0 z-50 w-[min(84vw,280px)] min-w-0 overflow-y-auto bg-white px-4 py-5 shadow-2xl transition-transform duration-300 lg:sticky lg:top-24 lg:z-auto lg:block lg:w-auto lg:translate-x-0 lg:self-start lg:overflow-visible lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none ${
                                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                            } ${
                                isSidebarCollapsed
                                    ? 'rounded-lg border border-slate-200 bg-white px-2 py-3 shadow-sm'
                                    : ''
                            }`}
                        >
                            <div className="mb-4 flex items-center justify-between lg:hidden">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                                    워크스페이스 메뉴
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500"
                                    aria-label="워크스페이스 메뉴 닫기"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                                title={isSidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
                                className={`z-20 hidden items-center justify-center text-slate-400 transition hover:text-slate-900 lg:flex ${
                                    isSidebarCollapsed
                                        ? 'relative mx-auto mb-3 h-8 w-8'
                                        : 'absolute -right-4 top-1 h-10 w-8'
                                }`}
                            >
                                {isSidebarCollapsed ? (
                                    <ChevronRight className="h-4 w-4" />
                                ) : (
                                    <ChevronLeft className="h-4 w-4" />
                                )}
                            </button>
                            <div
                                className={`mb-3 flex items-center overflow-hidden px-2 transition-all ${
                                    isSidebarCollapsed ? 'h-0 opacity-0' : 'h-8 opacity-100'
                                }`}
                            >
                                <p className="whitespace-nowrap text-xs font-bold uppercase tracking-widest text-slate-400">
                                    메뉴 목록
                                </p>
                            </div>
                            <nav aria-label="경력 관리 워크스페이스 메뉴" className="space-y-5">
                                {menuGroups.map((group, groupIndex) => (
                                    <section
                                        key={group.label}
                                        className={
                                            groupIndex > 0 && isSidebarCollapsed
                                                ? 'border-t border-slate-200 pt-3'
                                                : ''
                                        }
                                    >
                                        <h2
                                            className={`mb-1.5 overflow-hidden whitespace-nowrap px-3 text-[11px] font-black tracking-[0.12em] text-slate-400 transition-all ${
                                                isSidebarCollapsed
                                                    ? 'max-h-0 opacity-0'
                                                    : 'max-h-5 opacity-100'
                                            }`}
                                        >
                                            {group.label}
                                        </h2>
                                        <div className="space-y-1.5">
                                            {group.items.map((item) => {
                                                const Icon = item.icon;
                                                const active = activeTab === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => selectTab(item.id)}
                                                        title={item.label}
                                                        className={`flex items-center rounded-md text-sm font-bold transition-all ${
                                                            isSidebarCollapsed
                                                                ? 'mx-auto h-11 w-11 justify-center'
                                                                : 'w-full gap-2.5 px-3 py-2.5 text-left'
                                                        } ${
                                                            active
                                                                ? 'bg-slate-900 text-white shadow-sm'
                                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        <Icon className="h-4 w-4 shrink-0" />
                                                        <span
                                                            className={`overflow-hidden whitespace-nowrap transition-all ${
                                                                isSidebarCollapsed
                                                                    ? 'max-w-0 opacity-0'
                                                                    : 'max-w-[170px] opacity-100'
                                                            }`}
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

                        <section className="min-w-0 space-y-6">
                            {activeTab === 'OVERVIEW' && (
                                <WorkspaceOverview demo={demo} onSelect={selectTab} />
                            )}
                            {activeTab === 'EXPERIENCE' && (
                                <ExperienceDemo
                                    demo={demo}
                                    update={update}
                                    onSave={handleSave}
                                    saved={saved}
                                />
                            )}
                            {activeTab === 'PROFILE' && (
                                <ProfileDemo
                                    demo={demo}
                                    update={update}
                                    onSave={handleSave}
                                    saved={saved}
                                />
                            )}
                            {activeTab === 'COMPETENCIES' && (
                                <CompetencyDemo
                                    demo={demo}
                                    update={update}
                                    onSave={handleSave}
                                    saved={saved}
                                />
                            )}
                            {activeTab === 'PRINT_TEMPLATES' && (
                                <PrintTemplateDemo demo={demo} update={update} />
                            )}
                            {!demoTabs.has(activeTab) && <DemoScopeNotice title={activeLabel} />}
                        </section>
                    </div>
                </div>

                {isPreviewOpen && (
                    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[min(42vw,640px)] shrink-0 overflow-hidden border-l border-slate-200 bg-white lg:block">
                        <PreviewPanel demo={demo} onClose={() => setIsPreviewOpen(false)} />
                    </aside>
                )}
            </div>

            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 bg-white lg:hidden">
                    <PreviewPanel demo={demo} onClose={() => setIsPreviewOpen(false)} />
                </div>
            )}
        </main>
    );
}

type DemoEditorProps = {
    demo: DemoState;
    update: <K extends keyof DemoState>(key: K, value: DemoState[K]) => void;
    onSave: () => void;
    saved: boolean;
};

function WorkspaceOverview({
    demo,
    onSelect,
}: {
    demo: DemoState;
    onSelect: (tab: DemoTab) => void;
}) {
    const summaryCards = [
        { label: '경력·프로젝트', value: '6', detail: '공개 4개', icon: Briefcase },
        { label: '연결된 근거', value: '18', detail: '학습 기록 포함', icon: BookOpen },
        { label: '핵심 역량', value: '5', detail: '검토 필요 1개', icon: Sparkles },
        { label: '이력서', value: '3', detail: '최종본 1개', icon: FileText },
    ];
    const quickActions: Array<[string, DemoTab]> = [
        ['경력과 프로젝트 정리', 'EXPERIENCE'],
        ['핵심 역량 검토', 'COMPETENCIES'],
        ['지원용 이력서 편집', 'PRINT_TEMPLATES'],
        ['공개 프로필 확인', 'PROFILE'],
    ];

    return (
        <>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <p className="text-xs font-bold text-indigo-600">안녕하세요, {demo.name}님</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                        경력 자산을 다음 지원에 연결해 보세요.
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        기록한 경험과 근거를 점검하고 지원 목적에 맞는 이력서를 구성합니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onSelect('EXPERIENCE')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-black text-white"
                >
                    경력 추가 <ArrowRight className="h-4 w-4" />
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.label}
                            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <Icon className="h-4 w-4 text-indigo-600" />
                                <span className="text-2xl font-black text-slate-950">
                                    {card.value}
                                </span>
                            </div>
                            <p className="mt-4 text-sm font-black text-slate-800">{card.label}</p>
                            <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
                        </div>
                    );
                })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-black text-slate-950">이번 지원 준비</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                플랫폼 백엔드 포지션 · 4단계 중 3단계 완료
                            </p>
                        </div>
                        <span className="text-sm font-black text-indigo-600">75%</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-3/4 rounded-full bg-indigo-600" />
                    </div>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        {[
                            ['경력 근거 점검', true],
                            ['핵심 역량 선택', true],
                            ['맞춤 이력서 구성', true],
                            ['최종 문구 검토', false],
                        ].map(([label, complete]) => (
                            <div
                                key={String(label)}
                                className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700"
                            >
                                <span
                                    className={`grid h-5 w-5 place-items-center rounded-full ${
                                        complete
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}
                                >
                                    {complete ? <Check className="h-3 w-3" /> : '4'}
                                </span>
                                {label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-black text-slate-950">빠른 작업</h3>
                    <div className="mt-4 space-y-2">
                        {quickActions.map(([label, tab]) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => onSelect(tab)}
                                className="flex w-full items-center justify-between rounded-md border border-slate-100 px-3 py-3 text-left text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                            >
                                {label} <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function ExperienceDemo({ demo, update, onSave, saved }: DemoEditorProps) {
    return (
        <>
            <SectionHeading
                title="경력 및 프로젝트"
                description="직장 경력과 프로젝트를 성과·근거 단위로 정리합니다."
                action="경력 추가"
            />
            <div className="grid gap-5">
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500">프로젝트 1개</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                            공개
                        </span>
                    </div>
                    <button className="w-full rounded-md border-2 border-slate-900 bg-slate-50 p-4 text-left">
                        <span className="text-[11px] font-bold text-indigo-600">개인 프로젝트</span>
                        <strong className="mt-1 block text-sm text-slate-950">
                            {demo.projectTitle}
                        </strong>
                        <span className="mt-2 block text-xs text-slate-500">
                            2026. 07 — 진행 중
                        </span>
                    </button>
                    <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                        다른 경력과 프로젝트는 데모에서 제외했습니다.
                    </div>
                </div>
                <EditorCard onSave={onSave} saved={saved}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="유형">
                            <select className="demo-input" defaultValue="PROJECT">
                                <option value="PROJECT">프로젝트</option>
                                <option value="CAREER">직장 경력</option>
                                <option value="EDUCATION">교육</option>
                            </select>
                        </Field>
                        <Field label="역할">
                            <input className="demo-input" defaultValue="Backend Developer" />
                        </Field>
                    </div>
                    <Field label="제목">
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
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-black text-slate-900">상세 성과</span>
                            <button className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                                <Plus className="h-3.5 w-3.5" /> 상세 추가
                            </button>
                        </div>
                        <Field label="검증된 결과">
                            <input
                                className="demo-input bg-white"
                                value={demo.metric}
                                onChange={(event) => update('metric', event.target.value)}
                            />
                        </Field>
                    </div>
                </EditorCard>
            </div>
        </>
    );
}

function ProfileDemo({ demo, update, onSave, saved }: DemoEditorProps) {
    return (
        <>
            <SectionHeading
                title="공개 프로필 편집"
                description="공개 페이지와 이력서에 사용할 프로필 정보를 편집합니다."
            />
            <EditorCard onSave={onSave} saved={saved}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="이름 (한글)">
                        <input
                            className="demo-input"
                            value={demo.name}
                            onChange={(e) => update('name', e.target.value)}
                        />
                    </Field>
                    <Field label="이름 (영문)">
                        <input
                            className="demo-input"
                            value={demo.nameEn}
                            onChange={(e) => update('nameEn', e.target.value)}
                        />
                    </Field>
                    <Field label="희망 직무 타이틀">
                        <input
                            className="demo-input"
                            value={demo.jobTitle}
                            onChange={(e) => update('jobTitle', e.target.value)}
                        />
                    </Field>
                    <Field label="핵심 기술 요약 문구">
                        <input
                            className="demo-input"
                            value={demo.coreStack}
                            onChange={(e) => update('coreStack', e.target.value)}
                        />
                    </Field>
                </div>
                <Field label="BIO (대표 소개 문장)">
                    <textarea
                        className="demo-input min-h-32 resize-y"
                        value={demo.bio}
                        onChange={(e) => update('bio', e.target.value)}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="GITHUB 주소">
                        <input className="demo-input" value="https://github.com/demo" readOnly />
                    </Field>
                    <Field label="이메일">
                        <input className="demo-input" value="demo@example.com" readOnly />
                    </Field>
                    <Field label="연락처">
                        <input className="demo-input" value="010-0000-0000" readOnly />
                    </Field>
                </div>
            </EditorCard>
        </>
    );
}

function CompetencyDemo({ demo, update, onSave, saved }: DemoEditorProps) {
    return (
        <>
            <SectionHeading
                title="핵심 역량"
                description="경험과 학습 근거를 연결해 핵심 역량을 구성합니다."
                action="새 역량 추가"
            />
            <div className="grid gap-5">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex gap-2">
                        {['전체 1', '공개 1', '비공개 0'].map((item, index) => (
                            <span
                                key={item}
                                className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold ${index === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                    <button className="w-full rounded-md border-2 border-slate-900 bg-slate-50 p-4 text-left">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <strong className="mt-2 block text-sm text-slate-950">
                            {demo.competency}
                        </strong>
                        <span className="mt-2 block text-xs text-slate-500">연결된 근거 1개</span>
                    </button>
                </div>
                <EditorCard onSave={onSave} saved={saved}>
                    <Field label="역량명">
                        <input
                            className="demo-input"
                            value={demo.competency}
                            onChange={(e) => update('competency', e.target.value)}
                        />
                    </Field>
                    <Field label="역량 설명">
                        <textarea
                            className="demo-input min-h-28 resize-y"
                            value={demo.competencyEvidence}
                            onChange={(e) => update('competencyEvidence', e.target.value)}
                        />
                    </Field>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                            <Check className="h-4 w-4" /> 연결된 경험 근거
                        </div>
                        <p className="mt-2 text-sm font-bold text-emerald-950">
                            {demo.projectTitle}
                        </p>
                        <p className="mt-1 text-xs text-emerald-800">{demo.metric}</p>
                    </div>
                </EditorCard>
            </div>
        </>
    );
}

function PrintTemplateDemo({ demo, update }: Omit<DemoEditorProps, 'onSave' | 'saved'>) {
    return (
        <>
            <SectionHeading
                title="이력서 관리"
                description="기본 이력서와 지원처별 문서의 구성 및 노출 항목을 선택합니다."
                action="새 이력서"
            />
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border-2 border-indigo-500 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[11px] font-black text-indigo-600">FINAL</span>
                            <h3 className="mt-1 font-black text-slate-950">
                                플랫폼·아키텍처 지원용
                            </h3>
                        </div>
                        <Printer className="h-5 w-5 text-indigo-600" />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                        프로필, 핵심 역량, 선택 프로젝트를 A4 문서로 구성합니다.
                    </p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md bg-slate-50 p-3">
                        <input
                            type="checkbox"
                            checked={demo.includeProject}
                            onChange={(e) => update('includeProject', e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-indigo-600"
                        />
                        <span>
                            <strong className="block text-xs text-slate-900">
                                {demo.projectTitle}
                            </strong>
                            <span className="mt-1 block text-[11px] text-slate-500">
                                이 프로젝트를 문서에 노출
                            </span>
                        </span>
                    </label>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="text-[11px] font-black text-slate-400">BASE</span>
                    <h3 className="mt-1 font-black text-slate-950">기본 백엔드 이력서</h3>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                        지원처가 정해지지 않았을 때 사용하는 기본 구성입니다.
                    </p>
                </div>
            </div>
        </>
    );
}

function DemoScopeNotice({ title }: { title: string }) {
    return (
        <>
            <SectionHeading
                title={title}
                description="사용자 워크스페이스에 포함되는 기능입니다."
            />
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                <LockKeyhole className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-4 text-base font-black text-slate-900">
                    현재 공개 데모에서는 흐름만 제공하는 기능입니다.
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    외부 AI 호출, 파일 업로드, 실제 지원 정보처럼 비용 또는 민감한 상태를 다루는
                    기능은 안전한 데모 데이터가 준비된 뒤 체험 범위를 확장합니다.
                </p>
            </div>
        </>
    );
}

function PreviewPanel({ demo, onClose }: { demo: DemoState; onClose: () => void }) {
    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                    <h3 className="text-sm font-black text-slate-900">공개 페이지 미리보기</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                        공개 페이지에 구성할 내용을 방문자 화면으로 확인합니다.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        title="새로고침"
                        className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={onClose}
                        title="닫기"
                        className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
                <article className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <header className="border-b border-slate-200 pb-6">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-indigo-600">
                            {demo.jobTitle}
                        </p>
                        <div className="mt-3 flex items-baseline gap-3">
                            <h2 className="text-3xl font-black text-slate-950">{demo.name}</h2>
                            <span className="font-bold text-slate-400">{demo.nameEn}</span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">{demo.bio}</p>
                        <p className="mt-3 text-xs font-bold text-slate-500">{demo.coreStack}</p>
                    </header>
                    <section className="py-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-900">
                                핵심 역량
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400">근거 1</span>
                        </div>
                        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                            <h4 className="text-sm font-black text-slate-950">{demo.competency}</h4>
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                                {demo.competencyEvidence}
                            </p>
                        </div>
                    </section>
                    {demo.includeProject ? (
                        <section className="border-t border-slate-200 pt-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-900">
                                선택 프로젝트
                            </h3>
                            <h4 className="mt-4 text-lg font-black text-slate-950">
                                {demo.projectTitle}
                            </h4>
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                                {demo.projectSummary}
                            </p>
                            <div className="mt-4 rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
                                {demo.metric}
                            </div>
                        </section>
                    ) : (
                        <div className="border-t border-dashed border-slate-300 py-10 text-center text-xs font-bold text-slate-400">
                            현재 이력서에서 프로젝트를 숨겼습니다.
                        </div>
                    )}
                </article>
            </div>
        </div>
    );
}

function SectionHeading({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: string;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
                <h2 className="text-xl font-black text-slate-950">{title}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            </div>
            {action && (
                <button className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-black text-white">
                    <Plus className="h-3.5 w-3.5" />
                    {action}
                </button>
            )}
        </div>
    );
}

function EditorCard({
    children,
    onSave,
    saved,
}: {
    children: React.ReactNode;
    onSave: () => void;
    saved: boolean;
}) {
    return (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {children}
            <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                    type="button"
                    onClick={onSave}
                    className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-black transition ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                    {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saved ? '미리보기에 반영됨' : '변경사항 저장'}
                </button>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                {label}
            </span>
            {children}
        </label>
    );
}
