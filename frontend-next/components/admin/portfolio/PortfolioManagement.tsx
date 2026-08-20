'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    CheckCircle2,
    FileText,
    FolderGit2,
    History,
    Loader2,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { portfolioApi } from '@/lib/api/portfolio';
import { experienceApi } from '@/lib/api/experience';
import { studyApi } from '@/lib/api/study';
import { skillApi } from '@/lib/api/skill';
import { competencyApi } from '@/lib/api/competency';
import { imageApi } from '@/lib/api/image';
import type { PortfolioCaseStudy, PortfolioCaseStudyContent } from '@/lib/api/types';
import { experienceOrgName, experienceTypeLabel } from '@/lib/format';
import { AiRevisionChat, type AiRevisionChatMessage } from '@/components/shared/AiRevisionChat';
import { AiStageBubble, useAiSuggestionStream } from '../ai/AiDraftAssistant';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

const EMPTY_CONTENT: PortfolioCaseStudyContent = {
    summary: '',
    problem: '',
    thoughtProcess: '',
    tradeoffs: [],
    solution: '',
    outcome: { summary: '', metrics: [] },
    architecture: { mermaidSource: null, imageObjectKeys: [], imageUrls: [] },
    sourceStudyIds: [],
    sourceExperienceDetailIds: [],
};

const AI_FIELD_LABELS: Record<string, string> = {
    summary: '요약',
    problem: '문제 인식',
    thoughtProcess: '고민한 것',
    solution: '해결',
};

const STATUS_LABELS = {
    DRAFT: '기준본 없음',
    PUBLISHED: '기준본 준비됨',
    ARCHIVED: '보관됨',
} as const;

function revisionChatContent(content: PortfolioCaseStudyContent): string {
    return [
        `한줄 요약\n${content.summary}`,
        `문제 인식\n${content.problem}`,
        `고민한 것\n${content.thoughtProcess}`,
        `해결\n${content.solution}`,
        `성과\n${content.outcome.summary}`,
    ]
        .filter((section) => section.trim().split('\n')[1])
        .join('\n\n');
}

export function PortfolioManagement({
    workspaceSlug,
    enablePlatformAi,
}: {
    workspaceSlug: string;
    enablePlatformAi: boolean;
}) {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
    const [detailView, setDetailView] = useState<'EDITOR' | 'REVISIONS'>('EDITOR');
    const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ experienceId: '', slug: '', title: '' });
    const [createSourceQuery, setCreateSourceQuery] = useState('');
    const [content, setContent] = useState<PortfolioCaseStudyContent>(EMPTY_CONTENT);
    const [instruction, setInstruction] = useState('');
    const [studyIds, setStudyIds] = useState<number[]>([]);
    const [skillIds, setSkillIds] = useState<number[]>([]);
    const [competencyIds, setCompetencyIds] = useState<number[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const {
        aiStages,
        aiError,
        setAiError,
        isGenerating,
        setIsGenerating,
        abortRef,
        chatRef,
        reset: resetAiStream,
        pushStage,
        appendToken,
        finishStages,
    } = useAiSuggestionStream();

    const { data: caseStudies = [] } = useQuery({
        queryKey: ['portfolio-case-studies', workspaceSlug],
        queryFn: () => portfolioApi.workspaceList(workspaceSlug),
    });
    const { data: experiences = [] } = useQuery({
        queryKey: ['experiences', workspaceSlug],
        queryFn: () => experienceApi.workspaceList(workspaceSlug),
    });
    const { data: studyPage } = useQuery({
        queryKey: ['studies-admin-all', workspaceSlug],
        queryFn: () => studyApi.workspaceAdminList(workspaceSlug, {}),
    });
    const { data: skills = [] } = useQuery({
        queryKey: ['skills', workspaceSlug],
        queryFn: () => skillApi.workspaceList(workspaceSlug),
    });
    const { data: competencies = [] } = useQuery({
        queryKey: ['competencies', workspaceSlug],
        queryFn: () => competencyApi.workspaceList(workspaceSlug),
    });
    const { data: detail } = useQuery({
        queryKey: ['portfolio-case-study', workspaceSlug, selectedId],
        queryFn: () => portfolioApi.workspaceDetail(workspaceSlug, selectedId as number),
        enabled: selectedId !== null,
    });

    const selectedCaseStudy = detail?.caseStudy ?? null;
    const experienceById = useMemo(
        () => new Map(experiences.map((experience) => [experience.id, experience])),
        [experiences]
    );
    const projectOptions = useMemo(
        () => experiences.filter((e) => e.type === 'PROJECT' || e.type === 'CAREER'),
        [experiences]
    );
    const normalizedCreateSourceQuery = createSourceQuery.trim().toLocaleLowerCase();
    const filteredProjectOptions = useMemo(
        () =>
            projectOptions.filter((experience) => {
                if (!normalizedCreateSourceQuery) return true;
                return [
                    experience.title,
                    experienceOrgName(experience),
                    experienceTypeLabel(experience.type),
                ].some((value) => value.toLocaleLowerCase().includes(normalizedCreateSourceQuery));
            }),
        [normalizedCreateSourceQuery, projectOptions]
    );
    const selectedCreateExperience = createForm.experienceId
        ? experienceById.get(Number(createForm.experienceId))
        : null;
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
    const filteredCaseStudies = useMemo(
        () =>
            caseStudies.filter((caseStudy) => {
                if (statusFilter !== 'ALL' && caseStudy.status !== statusFilter) return false;
                if (!normalizedSearchQuery) return true;
                const experience = experienceById.get(caseStudy.experienceId);
                return [
                    caseStudy.title,
                    caseStudy.slug,
                    experience?.title,
                    experience ? experienceOrgName(experience) : null,
                ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearchQuery));
            }),
        [caseStudies, experienceById, normalizedSearchQuery, statusFilter]
    );
    const publishedCount = caseStudies.filter((item) => item.status === 'PUBLISHED').length;
    const draftCount = caseStudies.filter((item) => item.status === 'DRAFT').length;
    const selectedSourceExperience = selectedCaseStudy
        ? experienceById.get(selectedCaseStudy.experienceId)
        : null;
    const selectedRevision =
        detail?.revisions.find((revision) => revision.id === selectedRevisionId) ??
        detail?.revisions[0] ??
        null;
    const aiRevisionMessages = useMemo<AiRevisionChatMessage[]>(
        () =>
            [...(detail?.revisions ?? [])].reverse().flatMap((revision) => {
                const messages: AiRevisionChatMessage[] = [];
                if (revision.feedbackInstruction) {
                    messages.push({
                        id: -revision.id,
                        senderType: 'USER',
                        content: revision.feedbackInstruction,
                        createdAt: revision.createdAt,
                    });
                }
                if (revision.source === 'AI') {
                    messages.push({
                        id: revision.id,
                        senderType: 'AI',
                        content: revisionChatContent(revision.content),
                        aiModel: revision.aiModel,
                        createdAt: revision.createdAt,
                    });
                }
                return messages;
            }),
        [detail?.revisions]
    );
    const hasUnsavedChanges = selectedRevision
        ? JSON.stringify(content) !== JSON.stringify(selectedRevision.content)
        : JSON.stringify(content) !== JSON.stringify(EMPTY_CONTENT);

    // detail이 바뀔 때(케이스스터디 전환/리비전 재조회) 편집 폼 로컬 상태를 다시 초기화한다.
    // 렌더 중 setState로 처리해 리렌더가 한 번 더 도는 effect 패턴을 피한다.
    const [syncedDetail, setSyncedDetail] = useState(detail);
    if (detail !== syncedDetail) {
        setSyncedDetail(detail);
        const latest = detail?.revisions[0];
        setContent(latest ? latest.content : EMPTY_CONTENT);
        setStudyIds(latest ? latest.content.sourceStudyIds : []);
        setSelectedRevisionId(latest?.id ?? null);
    }

    const createMutation = useMutation({
        mutationFn: () =>
            portfolioApi.workspaceCreate(workspaceSlug, {
                experienceId: Number(createForm.experienceId),
                slug: createForm.slug.trim(),
                title: createForm.title.trim(),
            }),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ['portfolio-case-studies', workspaceSlug] });
            setCreateOpen(false);
            setCreateForm({ experienceId: '', slug: '', title: '' });
            setSelectedId(created.id);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => portfolioApi.workspaceRemove(workspaceSlug, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio-case-studies', workspaceSlug] });
            setSelectedId(null);
        },
    });

    const saveRevisionMutation = useMutation({
        mutationFn: (source: 'AI' | 'MANUAL') =>
            portfolioApi.workspaceSaveRevision(
                workspaceSlug,
                selectedId as number,
                content,
                source
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['portfolio-case-study', workspaceSlug, selectedId],
            });
        },
    });

    const publishMutation = useMutation({
        mutationFn: (revisionId: number) =>
            portfolioApi.workspacePublish(workspaceSlug, selectedId as number, revisionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['portfolio-case-study', workspaceSlug, selectedId],
            });
            queryClient.invalidateQueries({ queryKey: ['portfolio-case-studies', workspaceSlug] });
        },
    });

    const unpublishMutation = useMutation({
        mutationFn: () => portfolioApi.workspaceUnpublish(workspaceSlug, selectedId as number),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['portfolio-case-study', workspaceSlug, selectedId],
            });
            queryClient.invalidateQueries({ queryKey: ['portfolio-case-studies', workspaceSlug] });
        },
    });

    const requestAiGenerate = async (feedbackInstruction?: string) => {
        if (selectedId === null) return;
        const normalizedFeedback = feedbackInstruction?.trim() || '';
        let baseRevisionId = normalizedFeedback ? (selectedRevision?.id ?? null) : null;
        const generationInstruction = normalizedFeedback || instruction.trim();
        if (normalizedFeedback && hasUnsavedChanges) {
            try {
                const savedManualRevision = await portfolioApi.workspaceSaveRevision(
                    workspaceSlug,
                    selectedId,
                    content,
                    'MANUAL'
                );
                baseRevisionId = savedManualRevision.id;
                setSelectedRevisionId(savedManualRevision.id);
                await queryClient.invalidateQueries({
                    queryKey: ['portfolio-case-study', workspaceSlug, selectedId],
                });
            } catch (error) {
                setAiError(
                    error instanceof Error
                        ? error.message
                        : '현재 편집 내용을 revision으로 저장하지 못했습니다.'
                );
                return;
            }
        }
        resetAiStream();
        setIsGenerating(true);
        const controller = new AbortController();
        abortRef.current = controller;
        let completedContent: PortfolioCaseStudyContent | null = null;
        try {
            await portfolioApi.workspaceGenerateStream(
                workspaceSlug,
                selectedId,
                {
                    instruction: generationInstruction,
                    studyIds,
                    skillIds,
                    competencyIds,
                    baseRevisionId,
                },
                (event) => {
                    if (event.type === 'stage') {
                        pushStage(event.stage, event.message);
                    } else if (event.type === 'token') {
                        appendToken(event.stage, event.text);
                    } else if (event.type === 'facts') {
                        // no-op: fact count already implied by stage progress
                    } else if (event.type === 'complete') {
                        finishStages();
                        completedContent = event.content;
                        setContent(event.content);
                        setStudyIds(event.content.sourceStudyIds);
                    } else {
                        setAiError(event.message);
                    }
                },
                controller.signal
            );
            if (completedContent) {
                const saved = await portfolioApi.workspaceSaveRevision(
                    workspaceSlug,
                    selectedId,
                    completedContent,
                    'AI',
                    {
                        baseRevisionId,
                        feedbackInstruction: generationInstruction || null,
                        aiModel: 'NVIDIA NIM',
                    }
                );
                setSelectedRevisionId(saved.id);
                await queryClient.invalidateQueries({
                    queryKey: ['portfolio-case-study', workspaceSlug, selectedId],
                });
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                setAiError(error instanceof Error ? error.message : 'AI 초안 생성에 실패했습니다.');
            }
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
                setIsGenerating(false);
            }
        }
    };

    const handleUploadImage = async (file: File) => {
        setUploadingImage(true);
        try {
            const presigned = await imageApi.requestWorkspacePresignedUpload(
                workspaceSlug,
                'PORTFOLIO_ARCHITECTURE',
                file.name,
                file.type
            );
            await imageApi.uploadToPresignedUrl(presigned.uploadUrl, file);
            setContent((cur) => ({
                ...cur,
                architecture: {
                    ...cur.architecture,
                    imageObjectKeys: [...cur.architecture.imageObjectKeys, presigned.objectKey],
                    imageUrls: [...cur.architecture.imageUrls, presigned.publicUrl],
                },
            }));
        } finally {
            setUploadingImage(false);
        }
    };

    const updateTradeoff = (
        index: number,
        field: 'option' | 'pros' | 'cons' | 'chosenBecause',
        value: string
    ) => {
        setContent((cur) => ({
            ...cur,
            tradeoffs: cur.tradeoffs.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
        }));
    };

    const updateMetric = (index: number, field: 'label' | 'before' | 'after', value: string) => {
        setContent((cur) => ({
            ...cur,
            outcome: {
                ...cur.outcome,
                metrics: cur.outcome.metrics.map((m, i) =>
                    i === index ? { ...m, [field]: value } : m
                ),
            },
        }));
    };

    const openCreateWorkspace = () => {
        setSelectedId(null);
        setCreateForm({ experienceId: '', slug: '', title: '' });
        setCreateSourceQuery('');
        setCreateOpen(true);
    };

    const selectCreateExperience = (experienceId: number) => {
        const experience = experienceById.get(experienceId);
        if (!experience) return;
        const asciiSlug = experience.title
            .normalize('NFKD')
            .toLocaleLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setCreateForm({
            experienceId: String(experienceId),
            title: experience.title,
            slug: asciiSlug || `case-study-${experienceId}`,
        });
    };

    return (
        <div className="space-y-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-6 lg:space-y-0 lg:overflow-hidden">
            <AdminPageHeader
                eyebrow="Source Record"
                title="포트폴리오 사례 관리"
                description="경력과 프로젝트 원본에서 보여줄 사례를 설계하고, 근거 기반 AI 초안과 revision을 관리합니다. 공개 순서는 공개 페이지에서 별도로 구성합니다."
                compact
                descriptionMode="tooltip"
                actions={
                    createOpen ? (
                        <button
                            type="button"
                            onClick={() => setCreateOpen(false)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            <ArrowLeft className="h-4 w-4" /> 사례 목록으로
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={openCreateWorkspace}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                        >
                            <Plus className="h-4 w-4" /> 새 사례 설계
                        </button>
                    )
                }
            />

            {createOpen ? (
                <section className="bg-white py-2 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
                    <div className="max-w-3xl shrink-0">
                        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                            어떤 경험을 하나의 사례로 보여줄까요?
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            먼저 경력·프로젝트 원본을 고릅니다. 사례 작업공간을 만든 뒤 학습 기록,
                            기술, 핵심 역량을 근거로 연결해 AI 초안을 만들 수 있습니다.
                        </p>
                    </div>

                    <div className="mt-9 grid gap-10 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(23rem,1.28fr)] xl:gap-14 xl:grid-cols-[minmax(17rem,0.68fr)_minmax(25rem,1.32fr)]">
                        <div className="lg:flex lg:min-h-0 lg:flex-col">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <h4 className="text-base font-semibold text-slate-900">
                                        출발점 선택
                                    </h4>
                                    <p className="mt-1.5 text-sm text-slate-500">
                                        등록된 회사 경력과 프로젝트만 표시합니다.
                                    </p>
                                </div>
                                <span className="shrink-0 text-xs text-slate-400">
                                    {projectOptions.length}개 원본
                                </span>
                            </div>

                            <label className="mt-5 flex items-center gap-2 border-b border-slate-300 py-2.5 focus-within:border-slate-900">
                                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="sr-only">경력·프로젝트 원본 검색</span>
                                <input
                                    value={createSourceQuery}
                                    onChange={(event) => setCreateSourceQuery(event.target.value)}
                                    placeholder="이름이나 소속으로 검색"
                                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                />
                            </label>

                            <div className="mt-3 max-h-[28rem] overflow-y-auto border-t border-slate-200 lg:min-h-0 lg:max-h-none lg:flex-1">
                                {filteredProjectOptions.map((experience) => {
                                    const isSelected =
                                        createForm.experienceId === String(experience.id);
                                    const existingCaseStudy = caseStudies.find(
                                        (caseStudy) => caseStudy.experienceId === experience.id
                                    );
                                    return (
                                        <button
                                            key={experience.id}
                                            type="button"
                                            onClick={() => selectCreateExperience(experience.id)}
                                            className={`group flex w-full items-center gap-3 border-b border-l-2 border-b-slate-200 px-3 py-3.5 text-left transition-colors duration-150 ${
                                                isSelected
                                                    ? 'border-l-slate-900 bg-slate-50'
                                                    : 'border-l-transparent bg-white hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span>
                                                        {experienceTypeLabel(experience.type)}
                                                    </span>
                                                    {existingCaseStudy && (
                                                        <>
                                                            <span aria-hidden="true">·</span>
                                                            <span>기존 사례 있음</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="mt-1 truncate text-sm font-medium text-slate-900">
                                                    {experience.title}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    {experienceOrgName(experience)}
                                                </p>
                                            </div>
                                            <ArrowRight
                                                className={`h-4 w-4 shrink-0 ${isSelected ? 'text-slate-900' : 'text-slate-300'}`}
                                            />
                                        </button>
                                    );
                                })}
                                {filteredProjectOptions.length === 0 && (
                                    <div className="border-b border-slate-200 px-4 py-12 text-center">
                                        <BriefcaseBusiness className="mx-auto h-6 w-6 text-slate-300" />
                                        <p className="mt-3 text-sm font-medium text-slate-600">
                                            {projectOptions.length === 0
                                                ? '연결할 경력·프로젝트 원본이 없습니다.'
                                                : '검색 결과가 없습니다.'}
                                        </p>
                                        {projectOptions.length === 0 && (
                                            <p className="mt-1 text-xs text-slate-400">
                                                먼저 이력 및 경력 관리에서 원본을 등록해 주세요.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-8 lg:flex lg:min-h-0 lg:flex-col lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0 xl:pl-14">
                            <h4 className="text-base font-semibold text-slate-900">
                                사례 기본 정보
                            </h4>
                            <p className="mt-1.5 text-sm leading-6 text-slate-500">
                                방문자에게 보일 제목과 관리 URL을 확인합니다.
                            </p>

                            {selectedCreateExperience ? (
                                <div className="mt-7 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
                                    <div className="border-b border-slate-200 pb-5">
                                        <p className="text-xs text-slate-400">연결 원본</p>
                                        <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                            {selectedCreateExperience.title}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {experienceOrgName(selectedCreateExperience)}
                                        </p>
                                    </div>

                                    <label className="mt-7 block text-sm font-medium text-slate-700">
                                        사례 제목
                                        <input
                                            value={createForm.title}
                                            onChange={(event) =>
                                                setCreateForm((form) => ({
                                                    ...form,
                                                    title: event.target.value,
                                                }))
                                            }
                                            placeholder="예: 장애 대응 체계를 다시 설계한 과정"
                                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                                        />
                                    </label>

                                    <label className="mt-6 block text-sm font-medium text-slate-700">
                                        URL 식별자
                                        <div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-slate-700 focus-within:ring-2 focus-within:ring-slate-200">
                                            <span className="shrink-0 border-r border-slate-200 px-3 text-xs text-slate-400">
                                                /portfolio/
                                            </span>
                                            <input
                                                value={createForm.slug}
                                                onChange={(event) =>
                                                    setCreateForm((form) => ({
                                                        ...form,
                                                        slug: event.target.value
                                                            .toLocaleLowerCase()
                                                            .replace(/[^a-z0-9-]/g, ''),
                                                    }))
                                                }
                                                placeholder="case-study"
                                                className="min-w-0 flex-1 rounded-r-lg px-3 py-3 font-mono text-sm outline-none"
                                            />
                                        </div>
                                        <span className="mt-1.5 block text-xs text-slate-400">
                                            영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.
                                        </span>
                                    </label>

                                    {createMutation.error && (
                                        <p className="mt-5 border-y border-rose-200 py-2.5 text-xs font-medium text-rose-700">
                                            {createMutation.error instanceof Error
                                                ? createMutation.error.message
                                                : '사례 작업공간을 만들지 못했습니다.'}
                                        </p>
                                    )}

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            type="button"
                                            disabled={
                                                !createForm.experienceId ||
                                                !createForm.slug.trim() ||
                                                !createForm.title.trim() ||
                                                createMutation.isPending
                                            }
                                            onClick={() => createMutation.mutate()}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {createMutation.isPending
                                                ? '작업공간 만드는 중...'
                                                : '사례 작업공간 만들기'}
                                            {!createMutation.isPending && (
                                                <ArrowRight className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-12 max-w-sm">
                                    <FolderGit2 className="h-6 w-6 text-slate-300" />
                                    <p className="mt-4 text-sm font-medium text-slate-600">
                                        왼쪽에서 원본을 선택하세요.
                                    </p>
                                    <p className="mt-1.5 text-sm leading-6 text-slate-400">
                                        선택한 원본을 기준으로 제목과 URL을 먼저 채워드립니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            ) : (
                <div className="grid min-h-[44rem] gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
                    {/* 원본 목록: 공개 페이지 포함 여부가 아니라 Workspace에 저장된 사례 원본을 탐색한다. */}
                    <aside className="flex min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
                        <div className="border-b border-slate-200 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-slate-900">사례 원본</p>
                                <span className="text-xs font-bold text-slate-400">
                                    {caseStudies.length}개
                                </span>
                            </div>
                            <label className="relative mt-3 block">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="제목, URL, 연결 경험 검색"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none transition focus:border-slate-700 focus:bg-white"
                                />
                            </label>
                            <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] font-black">
                                {(
                                    [
                                        ['ALL', `전체 ${caseStudies.length}`],
                                        ['DRAFT', `작성 중 ${draftCount}`],
                                        ['PUBLISHED', `기준본 ${publishedCount}`],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setStatusFilter(value)}
                                        className={`rounded-lg border px-1.5 py-2 transition ${
                                            statusFilter === value
                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                            {filteredCaseStudies.map((caseStudy: PortfolioCaseStudy) => {
                                const sourceExperience = experienceById.get(caseStudy.experienceId);
                                const isSelected = selectedId === caseStudy.id;
                                return (
                                    <button
                                        key={caseStudy.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedId(caseStudy.id);
                                            setDetailView('EDITOR');
                                        }}
                                        className={`w-full rounded-xl border p-3.5 text-left transition ${
                                            isSelected
                                                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                                : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="line-clamp-2 text-sm font-black leading-5">
                                                {caseStudy.title}
                                            </span>
                                            {caseStudy.status === 'PUBLISHED' && (
                                                <CheckCircle2
                                                    className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}
                                                />
                                            )}
                                        </div>
                                        {sourceExperience && (
                                            <span
                                                className={`mt-2 flex items-center gap-1 truncate text-[11px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}
                                            >
                                                <BriefcaseBusiness className="h-3 w-3 shrink-0" />
                                                {experienceOrgName(sourceExperience)} ·{' '}
                                                {sourceExperience.title}
                                            </span>
                                        )}
                                        <div
                                            className={`mt-3 flex items-center justify-between gap-2 text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}
                                        >
                                            <span className="truncate font-mono">
                                                /{caseStudy.slug}
                                            </span>
                                            <span className="shrink-0 font-bold">
                                                {STATUS_LABELS[caseStudy.status]}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredCaseStudies.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                                    <FileText className="mx-auto h-5 w-5 text-slate-300" />
                                    <p className="mt-2 text-xs font-bold text-slate-500">
                                        조건에 맞는 사례가 없습니다.
                                    </p>
                                    {caseStudies.length === 0 && (
                                        <button
                                            type="button"
                                            onClick={openCreateWorkspace}
                                            className="mt-4 text-xs font-black text-slate-900 underline underline-offset-4"
                                        >
                                            첫 사례 설계하기
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* 상세 편집 */}
                    {selectedCaseStudy ? (
                        <main className="min-w-0 space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:min-h-0">
                            <div className="border-b border-slate-200 pb-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                            Case study workspace
                                        </span>
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <h2 className="truncate text-xl font-black tracking-tight text-slate-950">
                                                {selectedCaseStudy.title}
                                            </h2>
                                            <span
                                                className={`rounded-full px-2 py-1 text-[9px] font-black ${
                                                    selectedCaseStudy.status === 'PUBLISHED'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {STATUS_LABELS[selectedCaseStudy.status]}
                                            </span>
                                            {hasUnsavedChanges && detailView === 'EDITOR' && (
                                                <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-700">
                                                    저장하지 않은 변경
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 truncate text-[11px] text-slate-400">
                                            /{selectedCaseStudy.slug}
                                            {selectedSourceExperience && (
                                                <>
                                                    {' · '}
                                                    {experienceOrgName(
                                                        selectedSourceExperience
                                                    )} · {selectedSourceExperience.title}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm('이 케이스스터디를 삭제할까요?')) {
                                                deleteMutation.mutate(selectedCaseStudy.id);
                                            }
                                        }}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> 삭제
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                                        <button
                                            type="button"
                                            onClick={() => setDetailView('EDITOR')}
                                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-black transition ${
                                                detailView === 'EDITOR'
                                                    ? 'bg-slate-900 text-white shadow-sm'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            <FileText className="h-3.5 w-3.5" /> 내용 편집
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDetailView('REVISIONS')}
                                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-black transition ${
                                                detailView === 'REVISIONS'
                                                    ? 'bg-slate-900 text-white shadow-sm'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            <History className="h-3.5 w-3.5" /> revision 이력{' '}
                                            {detail?.revisions.length ?? 0}
                                        </button>
                                    </div>
                                    <p className="max-w-xl text-[10px] font-medium leading-4 text-slate-500">
                                        기준 revision은 공개 구성에서 선택할 후보입니다. 실제 방문자
                                        노출과 순서는 <strong>공개 페이지 → 경험 구성</strong>에서만
                                        결정합니다.
                                    </p>
                                </div>
                            </div>

                            {detailView === 'REVISIONS' && (
                                <div className="space-y-3">
                                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                                        <h3 className="text-xs font-black text-slate-900">
                                            저장된 revision
                                        </h3>
                                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                            원하는 시점의 내용을 편집기로 불러오거나, 검토가 끝난
                                            revision을 공개 구성용 기준본으로 지정할 수 있습니다.
                                        </p>
                                    </div>
                                    {detail?.revisions.map((revision) => {
                                        const isPublished =
                                            selectedCaseStudy.publishedRevisionId === revision.id;
                                        const isSelected = selectedRevisionId === revision.id;
                                        return (
                                            <div
                                                key={revision.id}
                                                className={`rounded-xl border p-4 ${
                                                    isSelected
                                                        ? 'border-blue-300 bg-blue-50/40'
                                                        : 'border-slate-200'
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-slate-900">
                                                                v{revision.version}
                                                            </span>
                                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">
                                                                {revision.source === 'AI'
                                                                    ? 'AI 초안'
                                                                    : '직접 편집'}
                                                            </span>
                                                            {isPublished && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700">
                                                                    <CheckCircle2 className="h-2.5 w-2.5" />{' '}
                                                                    현재 기준 revision
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-[10px] text-slate-400">
                                                            {new Date(
                                                                revision.createdAt
                                                            ).toLocaleString('ko-KR')}
                                                        </p>
                                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                                                            {revision.content.summary ||
                                                                '한줄 요약이 없는 revision입니다.'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedRevisionId(revision.id);
                                                                setContent(revision.content);
                                                                setStudyIds(
                                                                    revision.content.sourceStudyIds
                                                                );
                                                                setDetailView('EDITOR');
                                                            }}
                                                            className="rounded-lg border border-slate-300 px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50"
                                                        >
                                                            편집기로 불러오기
                                                        </button>
                                                        {!isPublished && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    publishMutation.mutate(
                                                                        revision.id
                                                                    )
                                                                }
                                                                disabled={publishMutation.isPending}
                                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50"
                                                            >
                                                                기준 revision으로 지정
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {detail?.revisions.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-xs font-bold text-slate-400">
                                            아직 저장된 revision이 없습니다.
                                        </div>
                                    )}
                                </div>
                            )}

                            {detailView === 'EDITOR' && (
                                <>
                                    {selectedRevision && (
                                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                            <span className="text-[11px] font-bold text-slate-600">
                                                v{selectedRevision.version}을(를) 기준으로 편집 중
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setDetailView('REVISIONS')}
                                                className="text-[10px] font-black text-blue-600"
                                            >
                                                다른 revision 보기
                                            </button>
                                        </div>
                                    )}

                                    {/* 서버의 Workspace 권한·출처 검증을 통과하는 편집자에게 AI 입력을 노출한다. */}
                                    {enablePlatformAi && (
                                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                            <div className="border-b border-slate-200 px-5 py-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white">
                                                        <Sparkles className="h-4 w-4" />
                                                    </span>
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-950">
                                                            근거 기반 AI 초안
                                                        </h3>
                                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                                            사용할 근거를 먼저 고른 뒤 초안을
                                                            만들고, 오른쪽 대화에서 현재 revision을
                                                            계속 개선합니다.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid xl:grid-cols-[minmax(18rem,0.8fr)_minmax(28rem,1.2fr)]">
                                                <div className="space-y-5 border-b border-slate-200 bg-slate-50/60 p-5 xl:border-b-0 xl:border-r">
                                                    <label className="block text-xs font-black text-slate-700">
                                                        작성 방향
                                                        <textarea
                                                            value={instruction}
                                                            onChange={(event) =>
                                                                setInstruction(event.target.value)
                                                            }
                                                            placeholder="예: 운영 안정성을 높이기 위해 내린 판단과 트레이드오프 중심"
                                                            rows={3}
                                                            className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-5 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                                                        />
                                                    </label>

                                                    <div>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-black text-slate-700">
                                                                학습 기록
                                                            </p>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {studyIds.length}개 선택
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                                                            {(studyPage?.content ?? [])
                                                                .slice(0, 30)
                                                                .map((study) => (
                                                                    <button
                                                                        key={study.id}
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setStudyIds(
                                                                                (current) =>
                                                                                    current.includes(
                                                                                        study.id
                                                                                    )
                                                                                        ? current.filter(
                                                                                              (
                                                                                                  id
                                                                                              ) =>
                                                                                                  id !==
                                                                                                  study.id
                                                                                          )
                                                                                        : [
                                                                                              ...current,
                                                                                              study.id,
                                                                                          ]
                                                                            )
                                                                        }
                                                                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                                                                            studyIds.includes(
                                                                                study.id
                                                                            )
                                                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                                                                        }`}
                                                                    >
                                                                        {study.title}
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-black text-slate-700">
                                                                핵심 역량
                                                            </p>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {competencyIds.length}개 선택
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                                                            {competencies.map((competency) => (
                                                                <button
                                                                    key={competency.id}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setCompetencyIds(
                                                                            (current) =>
                                                                                current.includes(
                                                                                    competency.id
                                                                                )
                                                                                    ? current.filter(
                                                                                          (id) =>
                                                                                              id !==
                                                                                              competency.id
                                                                                      )
                                                                                    : [
                                                                                          ...current,
                                                                                          competency.id,
                                                                                      ]
                                                                        )
                                                                    }
                                                                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                                                                        competencyIds.includes(
                                                                            competency.id
                                                                        )
                                                                            ? 'border-slate-900 bg-slate-900 text-white'
                                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                                                                    }`}
                                                                >
                                                                    {competency.title}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-black text-slate-700">
                                                                기술
                                                            </p>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {skillIds.length}개 선택
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                                                            {skills.map((skill) => (
                                                                <button
                                                                    key={skill.id}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSkillIds((current) =>
                                                                            current.includes(
                                                                                skill.id
                                                                            )
                                                                                ? current.filter(
                                                                                      (id) =>
                                                                                          id !==
                                                                                          skill.id
                                                                                  )
                                                                                : [
                                                                                      ...current,
                                                                                      skill.id,
                                                                                  ]
                                                                        )
                                                                    }
                                                                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                                                                        skillIds.includes(skill.id)
                                                                            ? 'border-slate-900 bg-slate-900 text-white'
                                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                                                                    }`}
                                                                >
                                                                    {skill.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {aiStages.length > 0 && (
                                                        <div
                                                            ref={chatRef}
                                                            className="max-h-64 space-y-2 overflow-y-auto border-t border-slate-200 pt-4"
                                                        >
                                                            {aiStages.map((stage) => (
                                                                <AiStageBubble
                                                                    key={stage.stage}
                                                                    stage={stage}
                                                                    fieldLabels={AI_FIELD_LABELS}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {aiError && (
                                                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                                                            {aiError}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="h-[38rem] min-h-0 overflow-hidden bg-white">
                                                    <AiRevisionChat
                                                        revisions={aiRevisionMessages}
                                                        isGenerating={isGenerating}
                                                        onGenerate={(feedback) =>
                                                            void requestAiGenerate(feedback)
                                                        }
                                                        onCancelGenerate={() =>
                                                            abortRef.current?.abort()
                                                        }
                                                        onApplyMessage={(message) => {
                                                            const revision = detail?.revisions.find(
                                                                (candidate) =>
                                                                    candidate.id === message.id
                                                            );
                                                            if (!revision) return;
                                                            setSelectedRevisionId(revision.id);
                                                            setContent(revision.content);
                                                            setStudyIds(
                                                                revision.content.sourceStudyIds
                                                            );
                                                        }}
                                                        title="포트폴리오 초안 & 개선 대화"
                                                        subtitle="피드백과 결과가 content revision에 함께 기록됩니다."
                                                        generateButtonLabel="새 초안 생성"
                                                        emptyTitle="저장된 AI 초안이 없습니다."
                                                        emptyDescription="근거로 사용할 학습·기술을 고른 뒤 새 초안을 생성하세요. 생성 결과는 자동으로 revision에 저장됩니다."
                                                        inputPlaceholder="현재 revision에서 개선할 점을 입력하세요"
                                                        showModelSelector={false}
                                                    />
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* 구조화 편집 폼 */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-slate-600">
                                            한줄 요약
                                            <input
                                                value={content.summary}
                                                onChange={(e) =>
                                                    setContent((c) => ({
                                                        ...c,
                                                        summary: e.target.value,
                                                    }))
                                                }
                                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                            />
                                        </label>
                                        <label className="block text-xs font-bold text-slate-600">
                                            문제 인식
                                            <textarea
                                                value={content.problem}
                                                onChange={(e) =>
                                                    setContent((c) => ({
                                                        ...c,
                                                        problem: e.target.value,
                                                    }))
                                                }
                                                rows={3}
                                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                            />
                                        </label>
                                        <label className="block text-xs font-bold text-slate-600">
                                            고민한 것
                                            <textarea
                                                value={content.thoughtProcess}
                                                onChange={(e) =>
                                                    setContent((c) => ({
                                                        ...c,
                                                        thoughtProcess: e.target.value,
                                                    }))
                                                }
                                                rows={3}
                                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                            />
                                        </label>

                                        <div>
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-600">
                                                    트레이드오프
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setContent((c) => ({
                                                            ...c,
                                                            tradeoffs: [
                                                                ...c.tradeoffs,
                                                                {
                                                                    option: '',
                                                                    pros: '',
                                                                    cons: '',
                                                                    chosenBecause: '',
                                                                },
                                                            ],
                                                        }))
                                                    }
                                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                                                >
                                                    + 추가
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {content.tradeoffs.map((t, i) => (
                                                    <div
                                                        key={i}
                                                        className="rounded-md border border-slate-200 p-2"
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                value={t.option}
                                                                onChange={(e) =>
                                                                    updateTradeoff(
                                                                        i,
                                                                        'option',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="후보안"
                                                                className="flex-1 rounded border border-slate-300 px-1.5 py-1 text-xs font-bold"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setContent((c) => ({
                                                                        ...c,
                                                                        tradeoffs:
                                                                            c.tradeoffs.filter(
                                                                                (_, idx) =>
                                                                                    idx !== i
                                                                            ),
                                                                    }))
                                                                }
                                                            >
                                                                <X className="h-3.5 w-3.5 text-slate-400" />
                                                            </button>
                                                        </div>
                                                        <input
                                                            value={t.pros}
                                                            onChange={(e) =>
                                                                updateTradeoff(
                                                                    i,
                                                                    'pros',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="장점"
                                                            className="mt-1 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                                                        />
                                                        <input
                                                            value={t.cons}
                                                            onChange={(e) =>
                                                                updateTradeoff(
                                                                    i,
                                                                    'cons',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="단점"
                                                            className="mt-1 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                                                        />
                                                        <input
                                                            value={t.chosenBecause}
                                                            onChange={(e) =>
                                                                updateTradeoff(
                                                                    i,
                                                                    'chosenBecause',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="선택 이유"
                                                            className="mt-1 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <label className="block text-xs font-bold text-slate-600">
                                            해결
                                            <textarea
                                                value={content.solution}
                                                onChange={(e) =>
                                                    setContent((c) => ({
                                                        ...c,
                                                        solution: e.target.value,
                                                    }))
                                                }
                                                rows={3}
                                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                            />
                                        </label>

                                        <label className="block text-xs font-bold text-slate-600">
                                            성과 요약
                                            <textarea
                                                value={content.outcome.summary}
                                                onChange={(e) =>
                                                    setContent((c) => ({
                                                        ...c,
                                                        outcome: {
                                                            ...c.outcome,
                                                            summary: e.target.value,
                                                        },
                                                    }))
                                                }
                                                rows={2}
                                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                            />
                                        </label>

                                        <div>
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-600">
                                                    성과 지표
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setContent((c) => ({
                                                            ...c,
                                                            outcome: {
                                                                ...c.outcome,
                                                                metrics: [
                                                                    ...c.outcome.metrics,
                                                                    {
                                                                        label: '',
                                                                        before: '',
                                                                        after: '',
                                                                    },
                                                                ],
                                                            },
                                                        }))
                                                    }
                                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                                                >
                                                    + 추가
                                                </button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {content.outcome.metrics.map((m, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center gap-1.5"
                                                    >
                                                        <input
                                                            value={m.label}
                                                            onChange={(e) =>
                                                                updateMetric(
                                                                    i,
                                                                    'label',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="지표명"
                                                            className="w-24 rounded border border-slate-300 px-1.5 py-1 text-xs"
                                                        />
                                                        <input
                                                            value={m.before}
                                                            onChange={(e) =>
                                                                updateMetric(
                                                                    i,
                                                                    'before',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="이전"
                                                            className="w-20 rounded border border-slate-300 px-1.5 py-1 text-xs"
                                                        />
                                                        <input
                                                            value={m.after}
                                                            onChange={(e) =>
                                                                updateMetric(
                                                                    i,
                                                                    'after',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="이후"
                                                            className="w-20 rounded border border-slate-300 px-1.5 py-1 text-xs"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setContent((c) => ({
                                                                    ...c,
                                                                    outcome: {
                                                                        ...c.outcome,
                                                                        metrics:
                                                                            c.outcome.metrics.filter(
                                                                                (_, idx) =>
                                                                                    idx !== i
                                                                            ),
                                                                    },
                                                                }))
                                                            }
                                                        >
                                                            <X className="h-3.5 w-3.5 text-slate-400" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <label className="block text-xs font-bold text-slate-600">
                                            아키텍처 Mermaid
                                            <textarea
                                                value={content.architecture.mermaidSource ?? ''}
                                                onChange={(e) =>
                                                    setContent((c) => ({
                                                        ...c,
                                                        architecture: {
                                                            ...c.architecture,
                                                            mermaidSource: e.target.value || null,
                                                        },
                                                    }))
                                                }
                                                rows={4}
                                                placeholder={'graph TD\n  A[시작] --> B[완료]'}
                                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                                            />
                                        </label>

                                        <div>
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-600">
                                                    아키텍처 이미지
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadingImage}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                                >
                                                    {uploadingImage ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-3 w-3" />
                                                    )}
                                                    업로드
                                                </button>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) void handleUploadImage(file);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {content.architecture.imageUrls.map((url, i) => (
                                                    <div key={i} className="relative">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={url}
                                                            alt=""
                                                            className="h-16 w-16 rounded-md border border-slate-200 object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setContent((c) => ({
                                                                    ...c,
                                                                    architecture: {
                                                                        ...c.architecture,
                                                                        imageObjectKeys:
                                                                            c.architecture.imageObjectKeys.filter(
                                                                                (_, idx) =>
                                                                                    idx !== i
                                                                            ),
                                                                        imageUrls:
                                                                            c.architecture.imageUrls.filter(
                                                                                (_, idx) =>
                                                                                    idx !== i
                                                                            ),
                                                                    },
                                                                }))
                                                            }
                                                            className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-600 text-white"
                                                        >
                                                            <X className="h-2.5 w-2.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => saveRevisionMutation.mutate('MANUAL')}
                                            disabled={
                                                saveRevisionMutation.isPending || !hasUnsavedChanges
                                            }
                                            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
                                        >
                                            {saveRevisionMutation.isPending
                                                ? '저장 중...'
                                                : hasUnsavedChanges
                                                  ? '새 revision 저장'
                                                  : '저장됨'}
                                        </button>
                                        {selectedRevision &&
                                            selectedCaseStudy.publishedRevisionId !==
                                                selectedRevision.id && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        publishMutation.mutate(selectedRevision.id)
                                                    }
                                                    disabled={
                                                        publishMutation.isPending ||
                                                        hasUnsavedChanges
                                                    }
                                                    title={
                                                        hasUnsavedChanges
                                                            ? '변경 내용을 새 revision으로 저장한 뒤 기준본으로 지정하세요.'
                                                            : undefined
                                                    }
                                                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                                                >
                                                    v{selectedRevision.version} 기준본 지정
                                                </button>
                                            )}
                                        {selectedCaseStudy.status === 'PUBLISHED' && (
                                            <button
                                                type="button"
                                                onClick={() => unpublishMutation.mutate()}
                                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600"
                                            >
                                                기준본 지정 해제
                                            </button>
                                        )}
                                        <span className="ml-auto text-right text-[10px] leading-4 text-slate-400">
                                            {selectedRevision
                                                ? `선택 v${selectedRevision.version}`
                                                : '첫 revision을 저장해 주세요'}
                                            {hasUnsavedChanges && (
                                                <>
                                                    <br />새 revision 저장 후 기준본으로 지정할 수
                                                    있습니다.
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </>
                            )}
                        </main>
                    ) : (
                        <main className="flex min-h-[34rem] min-w-0 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center lg:min-h-0">
                            <div className="max-w-sm">
                                <FolderGit2 className="mx-auto h-8 w-8 text-slate-300" />
                                <h3 className="mt-4 text-base font-black text-slate-800">
                                    편집할 사례를 선택하세요
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    왼쪽 목록에서 기존 사례를 선택하거나 새 사례를 설계해 근거 기반
                                    AI 초안과 revision을 관리할 수 있습니다.
                                </p>
                                <button
                                    type="button"
                                    onClick={openCreateWorkspace}
                                    className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                                >
                                    <Plus className="h-4 w-4" /> 새 사례 설계
                                </button>
                            </div>
                        </main>
                    )}
                </div>
            )}
        </div>
    );
}
