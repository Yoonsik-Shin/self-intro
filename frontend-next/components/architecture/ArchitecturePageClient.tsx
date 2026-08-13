'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Activity,
    ArrowRight,
    BookOpen,
    Box,
    Check,
    Copy,
    Database,
    ExternalLink,
    GitBranch,
    Globe,
    IdCard,
    Layers,
    LayoutGrid,
    LockKeyhole,
    Network,
    PlayCircle,
    Server,
    Sparkles,
    Terminal,
    UserPlus,
    Workflow,
} from 'lucide-react';
import type { ArchitectureLayer, ArchitectureOverview } from '@/lib/api/types';
import { SectionNavSidebar, type SectionNavItem } from '@/components/nav/SectionNavSidebar';
import { PreviewScrollListener } from '@/components/shared/PreviewScrollListener';
import { useAuthStore } from '@/store/useAuthStore';

const DEFAULT_HEADING = '시스템 아키텍처 (Self-Intro Enterprise Architecture)';
const DEFAULT_SUBHEADING =
    '최근 3-Tier Multi-Module Microservices(core, api, ai-worker)로 백엔드를 고도화하고, Kubernetes Pod 독립 배포, Oracle 26ai Native Vector Search + MySQL HeatWave 기반 Dual DB, gRPC / RabbitMQ CQRS 이벤트 기반 아키텍처, 그리고 Prometheus & Grafana 관측 환경과 ArgoCD GitOps 무중단 배포 시스템을 완성한 전체 설계 명세입니다.';

const architectureSections: SectionNavItem[] = [
    { id: 'product-overview', label: '제품 개요', icon: Sparkles },
    { id: 'product-workflow', label: '관리 흐름', icon: Workflow },
    { id: 'admin-demo', label: '워크스페이스 체험', icon: PlayCircle },
    { id: 'architecture-metrics', label: '기술 하이라이트', icon: Box },
    { id: 'architecture-diagram', label: '시스템 토폴로지', icon: Network },
    { id: 'architecture-components', label: '도메인 레이어 명세', icon: Layers },
];

const productWorkflow = [
    {
        step: '01',
        title: '경험과 근거 수집',
        description: '경력·프로젝트·학습 기록을 성과와 근거 단위로 구조화합니다.',
    },
    {
        step: '02',
        title: '역량으로 연결',
        description: '기술 이름이 아니라 실제로 해결한 문제를 중심으로 핵심 역량을 구성합니다.',
    },
    {
        step: '03',
        title: '지원 목적에 맞게 편집',
        description: '채용 공고와 지원 방향에 맞춰 노출할 경험과 강조 순서를 선택합니다.',
    },
    {
        step: '04',
        title: '웹과 문서로 발행',
        description: '같은 원본 데이터에서 공개 프로필과 목적별 이력서·PDF를 만들어 냅니다.',
    },
];

type Props = {
    overview: ArchitectureOverview | null;
    layers: ArchitectureLayer[];
};

// 노드 파이프라인 시각화를 위한 토폴로지 데이터
const topologyNodes = [
    {
        id: 'client',
        step: '01',
        title: 'Client & Edge Entry',
        subtitle: 'https://unbrdn.me',
        icon: Globe,
        color: 'from-blue-500/10 to-cyan-500/10 border-blue-200 text-blue-700',
        badgeColor: 'bg-blue-100 text-blue-800',
        tags: ['Cloudflare DNS', 'Origin CA TLS', 'Ingress Nginx Router', 'SSE Buffering Off'],
        desc: 'Web Browser 요청이 Cloudflare TLS 및 Ingress Nginx를 통해 OKE 클러스터로 유입됩니다.',
    },
    {
        id: 'k8s-pods',
        step: '02',
        title: 'OKE K8s Microservices',
        subtitle: 'Oracle Kubernetes Engine',
        icon: Server,
        color: 'from-indigo-500/10 to-violet-500/10 border-indigo-200 text-indigo-700',
        badgeColor: 'bg-indigo-100 text-indigo-800',
        tags: [
            'Next.js 16 (Port 3000)',
            'Spring Boot API (Port 8080)',
            'AI Worker Pod (Port 8081)',
            'gRPC (Port 9090)',
        ],
        desc: 'Dockerfile.api / Dockerfile.worker로 빌드된 ARM64 네이티브 Pod들이 독립적으로 기동 및 수평 확장됩니다.',
    },
    {
        id: 'dual-db',
        step: '03',
        title: 'Dual Database & Broker',
        subtitle: 'MSA Data Persistence Layer',
        icon: Database,
        color: 'from-amber-500/10 to-emerald-500/10 border-emerald-200 text-emerald-700',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        tags: [
            'MySQL 8.0 HeatWave',
            'Oracle 26ai Vector DB',
            'RabbitMQ Event Broker',
            'mTLS Wallet Mount',
        ],
        desc: 'Core OLTP 데이터를 처리하는 MySQL과 1536차원 HNSW 코사인 벡터 검색을 수행하는 Oracle 26ai ATP를 이원화 구성했습니다.',
    },
    {
        id: 'observability',
        step: '04',
        title: 'GitOps & Observability',
        subtitle: 'Continuous Deployment & Monitoring',
        icon: Activity,
        color: 'from-rose-500/10 to-orange-500/10 border-orange-200 text-orange-700',
        badgeColor: 'bg-orange-100 text-orange-800',
        tags: [
            'ArgoCD Auto-Sync',
            'Prometheus Metrics',
            'Grafana Dashboard',
            'Loki & Alloy Logging',
        ],
        desc: 'ArgoCD 무중단 GitOps 동기화 및 Prometheus/Grafana 통합 관측망으로 파드 상태와 로그를 실시간 모니터링합니다.',
    },
];

// 스마트 스터디 폴백 키워드 매핑 테이블
const studyFallbackRules: Array<{ keywords: string[]; title: string; url: string }> = [
    {
        keywords: ['multi-module', '3-tier', '모듈', 'k8s pod', '스케일링', 'recreate'],
        title: '백엔드 멀티모듈 & K8s 파드 분리',
        url: '/study/backend-architecture-modular-k8s-pod-separation',
    },
    {
        keywords: ['grpc', 'rabbitmq', 'cqrs', '이벤트'],
        title: 'gRPC, RabbitMQ & CQRS 패턴',
        url: '/study/msa-grpc-rabbitmq-cqrs-architecture',
    },
    {
        keywords: ['oracle', 'vector', 'hnsw', 'vector_distance', '26ai', '23ai', '임베딩', 'nim'],
        title: 'Oracle 26ai Vector Search & Dual DB',
        url: '/study/oracle-26ai-vector-search-msa-dual-db-architecture',
    },
    {
        keywords: ['prometheus', 'grafana', 'node exporter', 'actuator', 'loki', 'alloy', '관측'],
        title: 'Prometheus & Grafana 관측망 구축',
        url: '/study/kubernetes-node-exporter-grafana-dashboard-deep-dive',
    },
    {
        keywords: ['argocd', 'gitops', 'ingress', 'nginx', 'crio', 'logging', 'cloudflare'],
        title: 'K8s Ingress Nginx & Logging Refactoring',
        url: '/study/k8s-ingress-crio-logging-architecture-refactoring',
    },
    {
        keywords: ['flyway', 'heatwave', 'mysql', 'dual db', '이원화', '마이그레이션'],
        title: 'MySQL HeatWave + Oracle 26ai Dual DB 구축',
        url: '/study/oracle-26ai-vector-search-msa-dual-db-architecture',
    },
    {
        keywords: ['presigned', 'minio', 'object storage', 's3'],
        title: 'S3 호환 Object Storage & Presigned URL',
        url: '/study/headless-browser-spa-job-posting-scraping',
    },
];

// 레이어 아이템 태그 하이라이트 헬퍼
function extractTechBadges(text: string): string[] {
    const keywords = [
        'Java 21',
        'Spring Boot 3.5',
        'Multi-Module',
        'K8s Pod',
        'gRPC',
        'RabbitMQ',
        'CQRS',
        'QueryDSL',
        'Oracle 26ai',
        'Native VECTOR',
        'HNSW Index',
        'NVIDIA NIM',
        'Spring AI',
        'mTLS Wallet',
        'Next.js 16',
        'React 19',
        'Zustand',
        'TanStack Query',
        'OKE',
        'ArgoCD',
        'GitOps',
        'Prometheus',
        'Grafana',
        'Sealed Secrets',
        'MySQL HeatWave',
        'Dual DB',
        'Flyway',
        'Presigned URL',
    ];
    const badges: string[] = [];
    keywords.forEach((kw) => {
        if (text.toLowerCase().includes(kw.toLowerCase()) && !badges.includes(kw)) {
            badges.push(kw);
        }
    });
    return badges;
}

// 텍스트 내의 스터디 마크다운 링크 파싱 또는 스마트 키워드 매핑
function resolveStudyLink(fullText: string): {
    cleanText: string;
    studyUrl?: string;
    studyTitle?: string;
} {
    const studyLinkRegex = /\[(?:📖\s*)?관련\s*스터디\s*노트\]\(([^)]+)\)/i;
    const match = fullText.match(studyLinkRegex);

    if (match) {
        const studyUrl = match[1];
        const cleanText = fullText.replace(studyLinkRegex, '').trim();
        return { cleanText, studyUrl, studyTitle: 'Deep-Dive 스터디 노트' };
    }

    // DB에 마크다운 링크가 아직 안 들어간 구버전 데이터 상태라도 텍스트 키워드 기반 스마트 매핑
    const lower = fullText.toLowerCase();
    for (const rule of studyFallbackRules) {
        if (rule.keywords.some((kw) => lower.includes(kw))) {
            return { cleanText: fullText, studyUrl: rule.url, studyTitle: rule.title };
        }
    }

    return { cleanText: fullText };
}

export function ArchitecturePageClient({ overview, layers }: Props) {
    const [isSectionNavCollapsed, setIsSectionNavCollapsed] = useState(false);
    const [diagramViewMode, setDiagramViewMode] = useState<'visual' | 'terminal'>('visual');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [copied, setCopied] = useState(false);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isCheckingSession = useAuthStore((state) => state.isChecking);
    const me = useAuthStore((state) => state.me);
    const currentWorkspace = me?.workspaces[0];
    const workspaceActionHref = currentWorkspace
        ? `/workspace/${encodeURIComponent(currentWorkspace.slug)}/manage`
        : '/onboarding/workspace';
    const workspaceActionLabel = currentWorkspace ? '내 워크스페이스' : '워크스페이스 만들기';

    // 필터 카테고리 탭 목록 생성
    const categories = useMemo(() => {
        return [
            { id: 'all', label: '전체 보기', icon: LayoutGrid },
            ...layers.map((layer) => ({
                id: String(layer.id),
                label: layer.title,
                icon: Layers,
            })),
        ];
    }, [layers]);

    // 선택된 필터에 따른 레이어 필터링
    const filteredLayers = useMemo(() => {
        if (selectedCategory === 'all') return layers;
        return layers.filter((layer) => String(layer.id) === selectedCategory);
    }, [layers, selectedCategory]);

    const handleCopyDiagram = () => {
        if (!overview?.diagramText) return;
        navigator.clipboard.writeText(overview.diagramText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                    {/* Product showcase hero */}
                    <div
                        id="product-overview"
                        className="scroll-mt-24 relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-[0_24px_70px_-30px_rgba(15,23,42,0.8)] sm:p-10"
                    >
                        <div className="pointer-events-none absolute -right-20 -top-28 h-96 w-96 rounded-full bg-indigo-500/25 blur-[90px]" />
                        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-cyan-400/10 blur-[80px]" />
                        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/30 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Self-Intro Career Workspace
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        실제 운영 중인 개인 프로젝트
                                    </span>
                                </div>
                                <h1 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
                                    경력의 근거부터 지원별 이력서까지,
                                    <span className="block text-indigo-300">
                                        한곳에서 관리합니다.
                                    </span>
                                </h1>
                                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                                    Self-Intro는 완성된 이력서를 보관하는 웹사이트가 아니라, 흩어진
                                    경험을 근거와 역량으로 연결하고 목적별 결과물로 발행하는 경력
                                    관리 워크스페이스입니다.
                                </p>
                                <div className="mt-7 flex flex-wrap gap-3">
                                    <Link
                                        href="/architecture/demo"
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"
                                    >
                                        <PlayCircle className="h-4 w-4 text-indigo-600" />
                                        이력 관리 워크스페이스 체험
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    {!isCheckingSession &&
                                        (isAuthenticated ? (
                                            <Link
                                                href={workspaceActionHref}
                                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-indigo-300/60 hover:bg-white/10"
                                            >
                                                <IdCard className="h-4 w-4 text-indigo-300" />
                                                {workspaceActionLabel}
                                            </Link>
                                        ) : (
                                            <Link
                                                href="/signup"
                                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-indigo-300/60 hover:bg-white/10"
                                            >
                                                <UserPlus className="h-4 w-4 text-indigo-300" />
                                                초대받아 가입하기
                                            </Link>
                                        ))}
                                </div>
                                {!isCheckingSession && (
                                    <p className="mt-3 text-xs font-semibold text-slate-400">
                                        {isAuthenticated
                                            ? '가입한 계정의 Workspace에서 경력 관리를 계속할 수 있습니다.'
                                            : '현재 초대받은 사용자만 가입할 수 있습니다.'}
                                    </p>
                                )}
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                    One source, many outcomes
                                </p>
                                <div className="mt-4 space-y-3">
                                    {[
                                        ['Career Evidence', '경력·프로젝트·학습 근거'],
                                        ['Capability Map', '근거 기반 핵심 역량'],
                                        ['Resume Variants', '지원처별 이력서와 PDF'],
                                        ['Public Profile', '항상 최신인 공개 웹페이지'],
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
                                        >
                                            <span className="font-mono text-[11px] text-indigo-300">
                                                {label}
                                            </span>
                                            <span className="text-right text-xs font-bold text-slate-100">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        id="product-workflow"
                        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] sm:p-8"
                    >
                        <div className="max-w-3xl">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                                Product workflow
                            </span>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                한 번 기록한 경험이 여러 결과물이 되는 과정
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                공개 페이지와 이력서는 서로 다른 원본을 복사해 관리하지 않습니다.
                                검증된 경험 하나를 중심으로 노출 범위와 강조점만 다르게 조합합니다.
                            </p>
                        </div>
                        <ol className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {productWorkflow.map((item, index) => (
                                <li
                                    key={item.step}
                                    className="relative rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-sm"
                                >
                                    <span className="font-mono text-xs font-black text-indigo-600">
                                        {item.step}
                                    </span>
                                    <h3 className="mt-3 text-base font-black text-white">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-xs leading-5 text-slate-300">
                                        {item.description}
                                    </p>
                                    {index < productWorkflow.length - 1 && (
                                        <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-indigo-300 text-slate-950 xl:block" />
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div
                        id="admin-demo"
                        className="scroll-mt-24 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6 sm:p-8"
                    >
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                            <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-black text-indigo-700">
                                    <IdCard className="h-3.5 w-3.5" />
                                    Guided product demo
                                </span>
                                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                    설명만 읽지 말고, 관리 흐름을 직접 확인해 보세요.
                                </h2>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                    합성 경력 데이터를 편집하면 공개 프로필 미리보기가 즉시
                                    바뀝니다. 서비스 운영 콘솔과 사용자 워크스페이스는 분리되어
                                    있으며 실제 개인정보는 데모에 사용되지 않습니다.
                                </p>
                                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 shadow-sm">
                                        <LockKeyhole className="h-3.5 w-3.5 text-emerald-600" />
                                        서버 저장 없음
                                    </span>
                                    <span className="rounded-lg bg-white px-3 py-2 shadow-sm">
                                        합성 데이터 전용
                                    </span>
                                    <span className="rounded-lg bg-white px-3 py-2 shadow-sm">
                                        새로고침 시 초기화
                                    </span>
                                </div>
                            </div>
                            <Link
                                href="/architecture/demo"
                                className="group flex min-h-36 flex-col justify-between rounded-2xl bg-slate-950 p-5 text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
                            >
                                <div className="flex items-center justify-between">
                                    <PlayCircle className="h-8 w-8 text-indigo-300" />
                                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                                </div>
                                <div>
                                    <div className="text-lg font-black">데모 워크스페이스 열기</div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        약 1분 · 로그인 불필요
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div
                        id="architecture-metrics"
                        className="scroll-mt-24 relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] sm:p-8"
                    >
                        <div className="mb-6 max-w-4xl">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                                Engineering evidence
                            </span>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                                {overview?.heading ?? DEFAULT_HEADING}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                {overview?.subheading ?? DEFAULT_SUBHEADING}
                            </p>
                        </div>

                        {/* Key Highlights Metric Grid */}
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="group rounded-xl border border-slate-700 bg-slate-900 p-4 text-white transition-all duration-200 hover:border-indigo-400 hover:bg-slate-800 hover:shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Box className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-300">
                                            Architecture
                                        </div>
                                        <div className="text-sm font-black text-white">
                                            3-Tier Multi-Module
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-300 line-clamp-1">
                                    :core / :api / :ai-worker Pod 분리
                                </p>
                            </div>

                            <div className="group rounded-xl border border-slate-700 bg-slate-900 p-4 text-white transition-all duration-200 hover:border-emerald-400 hover:bg-slate-800 hover:shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <Database className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-300">
                                            Database
                                        </div>
                                        <div className="text-sm font-black text-white">
                                            Dual Vector DB
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-300 line-clamp-1">
                                    MySQL HeatWave + Oracle 26ai Vector
                                </p>
                            </div>

                            <div className="group rounded-xl border border-slate-700 bg-slate-900 p-4 text-white transition-all duration-200 hover:border-violet-400 hover:bg-slate-800 hover:shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-violet-50 p-2.5 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                        <GitBranch className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-300">
                                            Deployment
                                        </div>
                                        <div className="text-sm font-black text-white">
                                            ArgoCD GitOps
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-300 line-clamp-1">
                                    OKE Auto-Sync & Sealed Secrets
                                </p>
                            </div>

                            <div className="group rounded-xl border border-slate-700 bg-slate-900 p-4 text-white transition-all duration-200 hover:border-amber-400 hover:bg-slate-800 hover:shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-300">
                                            Observability
                                        </div>
                                        <div className="text-sm font-black text-white">
                                            Prometheus & Grafana
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-300 line-clamp-1">
                                    Node Exporter & Loki/Alloy Logs
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Interactive System Topology Diagram Section */}
                    <div
                        id="architecture-diagram"
                        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] sm:p-8"
                    >
                        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 sm:text-xl">
                                    <Network className="h-5 w-5 text-indigo-600" />
                                    <span>
                                        {overview?.diagramHeading ??
                                            '실제 운영(Production) 엔터프라이즈 아키텍처 및 배포 토폴로지 흐름도'}
                                    </span>
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    클라이언트 요청 유입부터 Ingress Nginx, OKE Pod, Dual DB 및 관측
                                    체계까지의 처리 흐름
                                </p>
                            </div>

                            {/* View Switcher Controls */}
                            <div className="flex items-center rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setDiagramViewMode('visual')}
                                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                        diagramViewMode === 'visual'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Workflow className="h-3.5 w-3.5" />
                                    Visual Flow
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDiagramViewMode('terminal')}
                                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                        diagramViewMode === 'terminal'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Terminal className="h-3.5 w-3.5" />
                                    ASCII Terminal
                                </button>
                            </div>
                        </div>

                        {diagramViewMode === 'visual' ? (
                            /* Visual Topology Nodes Pipeline */
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {topologyNodes.map((node) => {
                                        const IconComp = node.icon;
                                        return (
                                            <div
                                                key={node.id}
                                                className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 shadow-sm transition-all hover:shadow-md ${node.color}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                                                            <IconComp className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-black text-slate-400">
                                                                    {node.step}
                                                                </span>
                                                                <h3 className="text-base font-extrabold text-slate-900">
                                                                    {node.title}
                                                                </h3>
                                                            </div>
                                                            <p className="text-xs font-medium text-slate-500">
                                                                {node.subtitle}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                                                    {node.desc}
                                                </p>

                                                <div className="mt-4 flex flex-wrap gap-1.5">
                                                    {node.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${node.badgeColor}`}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-center text-xs font-semibold text-slate-500">
                                    💡 상세 ASCII 배치도 및 K8s Pod 포트/환경 통신 구조는 상단{' '}
                                    <span className="font-bold text-indigo-600">
                                        ASCII Terminal
                                    </span>{' '}
                                    탭에서 확인하실 수 있습니다.
                                </div>
                            </div>
                        ) : (
                            /* Terminal Window ASCII Diagram */
                            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
                                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                                        <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                                        <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                                        <span className="ml-2 font-mono text-xs text-slate-400">
                                            architecture-topology.spec
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyDiagram}
                                        className="flex items-center gap-1.5 rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                <span className="text-emerald-400">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5" />
                                                <span>Copy Spec</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <pre className="overflow-x-auto whitespace-pre p-4 font-mono text-[11px] leading-relaxed tracking-tight text-slate-300 sm:text-[12.5px]">
                                    {overview?.diagramText ??
                                        '배포 흐름도가 아직 등록되지 않았습니다.'}
                                </pre>
                            </div>
                        )}
                    </div>

                    {/* 3. Domain Architecture Components Section */}
                    <div
                        id="architecture-components"
                        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] sm:p-8"
                    >
                        <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="mb-1 flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                        <Layers className="h-3.5 w-3.5 text-indigo-600" />총{' '}
                                        {layers.length}개 도메인 레이어
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                                    도메인 레이어별 아키텍처 명세
                                </h2>
                            </div>

                            {/* Category Filter Tabs */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {categories.map((cat) => {
                                    const IconC = cat.icon;
                                    const isActive = selectedCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                                isActive
                                                    ? 'bg-slate-900 text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                            }`}
                                        >
                                            <IconC className="h-3.5 w-3.5" />
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Domain Layer Cards Grid */}
                        <div className="grid grid-cols-1 gap-6">
                            {filteredLayers.length === 0 ? (
                                <div className="py-12 text-center text-sm font-bold text-slate-400">
                                    등록되었거나 조건에 맞는 아키텍처 레이어가 없습니다.
                                </div>
                            ) : (
                                filteredLayers.map((layer) => (
                                    <div
                                        key={layer.id}
                                        className="group rounded-xl border border-slate-200 bg-slate-50/40 p-6 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-md"
                                    >
                                        <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3">
                                            <h3 className="flex items-center gap-2.5 text-base font-black text-slate-900 sm:text-lg">
                                                <span className="rounded-lg bg-indigo-50 p-2 text-base leading-none shadow-xs group-hover:bg-indigo-100 transition-colors">
                                                    {layer.icon}
                                                </span>
                                                {layer.title}
                                            </h3>
                                            <span className="rounded-full bg-slate-200/60 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                                                {layer.items.length} Key Points
                                            </span>
                                        </div>

                                        <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
                                            {layer.items.map((item) => {
                                                const rawBodyText = item.bodyText ?? '';
                                                const fullTextToAnalyze =
                                                    (item.strongText ?? '') + ' ' + rawBodyText;
                                                const { cleanText, studyUrl, studyTitle } =
                                                    resolveStudyLink(fullTextToAnalyze);
                                                const techBadges =
                                                    extractTechBadges(fullTextToAnalyze);

                                                return (
                                                    <li
                                                        key={item.id}
                                                        className="rounded-lg border border-slate-100 bg-white p-3.5 shadow-2xs transition-colors hover:border-slate-300"
                                                    >
                                                        <div className="flex items-start gap-2.5">
                                                            <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                                                            <div className="space-y-2 w-full">
                                                                <div className="[overflow-wrap:anywhere]">
                                                                    {item.strongText && (
                                                                        <strong className="font-extrabold text-slate-900 mr-1">
                                                                            {item.strongText}
                                                                        </strong>
                                                                    )}
                                                                    <span className="text-slate-600">
                                                                        {item.strongText &&
                                                                        cleanText.startsWith(
                                                                            item.strongText
                                                                        )
                                                                            ? cleanText
                                                                                  .substring(
                                                                                      item
                                                                                          .strongText
                                                                                          .length
                                                                                  )
                                                                                  .trim()
                                                                            : cleanText}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                                                                    {/* Tech Badges List */}
                                                                    {techBadges.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {techBadges.map(
                                                                                (badge) => (
                                                                                    <span
                                                                                        key={badge}
                                                                                        className="rounded bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700 border border-slate-200/60"
                                                                                    >
                                                                                        #{badge}
                                                                                    </span>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div />
                                                                    )}

                                                                    {/* Linked Deep Dive Study Note Badge Link */}
                                                                    {studyUrl && (
                                                                        <Link
                                                                            href={studyUrl}
                                                                            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/80 hover:bg-indigo-600 hover:text-white transition-all hover:shadow-xs group/btn ml-auto"
                                                                        >
                                                                            <BookOpen className="h-3.5 w-3.5 text-indigo-600 group-hover/btn:text-white transition-colors" />
                                                                            <span>
                                                                                📖{' '}
                                                                                {studyTitle ??
                                                                                    'Deep-Dive 스터디 노트'}
                                                                            </span>
                                                                            <ExternalLink className="h-3 w-3 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                                                                        </Link>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))
                            )}
                        </div>
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
