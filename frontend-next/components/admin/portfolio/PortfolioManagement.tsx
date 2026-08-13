'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderGit2, Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { portfolioApi } from '@/lib/api/portfolio';
import { experienceApi } from '@/lib/api/experience';
import { studyApi } from '@/lib/api/study';
import { skillApi } from '@/lib/api/skill';
import { imageApi } from '@/lib/api/image';
import type { PortfolioCaseStudy, PortfolioCaseStudyContent } from '@/lib/api/types';
import { experienceOrgName, experienceTypeLabel } from '@/lib/format';
import { AiStageBubble, useAiSuggestionStream } from '../ai/AiDraftAssistant';

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

export function PortfolioManagement({
    workspaceSlug,
    enablePlatformAi,
}: {
    workspaceSlug: string;
    enablePlatformAi: boolean;
}) {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ experienceId: '', slug: '', title: '' });
    const [content, setContent] = useState<PortfolioCaseStudyContent>(EMPTY_CONTENT);
    const [instruction, setInstruction] = useState('');
    const [studyIds, setStudyIds] = useState<number[]>([]);
    const [skillIds, setSkillIds] = useState<number[]>([]);
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
    const { data: detail } = useQuery({
        queryKey: ['portfolio-case-study', workspaceSlug, selectedId],
        queryFn: () => portfolioApi.workspaceDetail(workspaceSlug, selectedId as number),
        enabled: selectedId !== null,
    });

    const selectedCaseStudy = detail?.caseStudy ?? null;
    const projectOptions = useMemo(
        () => experiences.filter((e) => e.type === 'PROJECT' || e.type === 'CAREER'),
        [experiences]
    );

    // detail이 바뀔 때(케이스스터디 전환/리비전 재조회) 편집 폼 로컬 상태를 다시 초기화한다.
    // 렌더 중 setState로 처리해 리렌더가 한 번 더 도는 effect 패턴을 피한다.
    const [syncedDetail, setSyncedDetail] = useState(detail);
    if (detail !== syncedDetail) {
        setSyncedDetail(detail);
        const latest = detail?.revisions[0];
        setContent(latest ? latest.content : EMPTY_CONTENT);
        setStudyIds(latest ? latest.content.sourceStudyIds : []);
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

    const requestAiGenerate = async () => {
        if (selectedId === null) return;
        resetAiStream();
        setIsGenerating(true);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            await portfolioApi.workspaceGenerateStream(
                workspaceSlug,
                selectedId,
                { instruction, studyIds, skillIds },
                (event) => {
                    if (event.type === 'stage') {
                        pushStage(event.stage, event.message);
                    } else if (event.type === 'token') {
                        appendToken(event.stage, event.text);
                    } else if (event.type === 'facts') {
                        // no-op: fact count already implied by stage progress
                    } else if (event.type === 'complete') {
                        finishStages();
                        setContent(event.content);
                        setStudyIds(event.content.sourceStudyIds);
                    } else {
                        setAiError(event.message);
                    }
                },
                controller.signal
            );
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

    return (
        <div className="flex h-full min-h-0 gap-4">
            {/* 목록 */}
            <div className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                        <FolderGit2 className="h-4 w-4" /> 포트폴리오
                    </h2>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                    >
                        <Plus className="h-3.5 w-3.5" /> 새로 만들기
                    </button>
                </div>
                {caseStudies.map((cs: PortfolioCaseStudy) => (
                    <button
                        key={cs.id}
                        type="button"
                        onClick={() => setSelectedId(cs.id)}
                        className={`rounded-lg border p-2.5 text-left text-xs transition ${
                            selectedId === cs.id
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-bold text-slate-900">{cs.title}</span>
                            <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black ${
                                    cs.status === 'PUBLISHED'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >
                                {cs.status}
                            </span>
                        </div>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                            {cs.slug}
                        </span>
                    </button>
                ))}
            </div>

            {createOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-900">새 케이스스터디</h3>
                            <button type="button" onClick={() => setCreateOpen(false)}>
                                <X className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-2.5">
                            <label className="block text-xs font-bold text-slate-600">
                                프로젝트
                                <select
                                    value={createForm.experienceId}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({
                                            ...f,
                                            experienceId: e.target.value,
                                        }))
                                    }
                                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                >
                                    <option value="">선택</option>
                                    {projectOptions.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            [{experienceTypeLabel(p.type)}] {experienceOrgName(p)} —{' '}
                                            {p.title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-xs font-bold text-slate-600">
                                slug (URL)
                                <input
                                    value={createForm.slug}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, slug: e.target.value }))
                                    }
                                    placeholder="my-project-case-study"
                                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                />
                            </label>
                            <label className="block text-xs font-bold text-slate-600">
                                제목
                                <input
                                    value={createForm.title}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, title: e.target.value }))
                                    }
                                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                />
                            </label>
                        </div>
                        <button
                            type="button"
                            disabled={
                                !createForm.experienceId ||
                                !createForm.slug.trim() ||
                                !createForm.title.trim() ||
                                createMutation.isPending
                            }
                            onClick={() => createMutation.mutate()}
                            className="mt-4 w-full rounded-md bg-blue-600 py-2 text-xs font-black text-white disabled:opacity-40"
                        >
                            {createMutation.isPending ? '생성 중...' : '생성'}
                        </button>
                    </div>
                </div>
            )}

            {/* 상세 편집 */}
            {selectedCaseStudy ? (
                <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">
                                {selectedCaseStudy.title}
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                {selectedCaseStudy.slug} · 가로/세로 배치 편집은 &ldquo;PDF 템플릿
                                관리&rdquo;에서
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('이 케이스스터디를 삭제할까요?')) {
                                        deleteMutation.mutate(selectedCaseStudy.id);
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> 삭제
                            </button>
                        </div>
                    </div>

                    {/* AI 입력은 Workspace 격리까지 완료된 플랫폼 운영자에게만 노출한다. */}
                    {enablePlatformAi && (
                        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-black text-violet-900">
                                <Sparkles className="h-3.5 w-3.5" /> AI 초안 생성
                            </h3>
                            <textarea
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                placeholder="특정 관점 위주로 작성해달라는 메모 (선택)"
                                rows={2}
                                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                            />
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {(studyPage?.content ?? []).slice(0, 30).map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() =>
                                            setStudyIds((cur) =>
                                                cur.includes(s.id)
                                                    ? cur.filter((id) => id !== s.id)
                                                    : [...cur, s.id]
                                            )
                                        }
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
                                            studyIds.includes(s.id)
                                                ? 'border-violet-400 bg-violet-600 text-white'
                                                : 'border-slate-300 text-slate-500 hover:border-violet-300'
                                        }`}
                                    >
                                        {s.title}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {skills.map((sk) => (
                                    <button
                                        key={sk.id}
                                        type="button"
                                        onClick={() =>
                                            setSkillIds((cur) =>
                                                cur.includes(sk.id)
                                                    ? cur.filter((id) => id !== sk.id)
                                                    : [...cur, sk.id]
                                            )
                                        }
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
                                            skillIds.includes(sk.id)
                                                ? 'border-blue-400 bg-blue-600 text-white'
                                                : 'border-slate-300 text-slate-500 hover:border-blue-300'
                                        }`}
                                    >
                                        {sk.name}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={requestAiGenerate}
                                disabled={isGenerating}
                                className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3.5 w-3.5" />
                                )}
                                {isGenerating ? '생성 중...' : 'AI 초안 생성'}
                            </button>

                            {aiStages.length > 0 && (
                                <div
                                    ref={chatRef}
                                    className="mt-3 max-h-64 space-y-2 overflow-y-auto"
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
                                <p className="mt-2 text-xs font-bold text-rose-600">{aiError}</p>
                            )}
                        </div>
                    )}

                    {/* 구조화 편집 폼 */}
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-600">
                            한줄 요약
                            <input
                                value={content.summary}
                                onChange={(e) =>
                                    setContent((c) => ({ ...c, summary: e.target.value }))
                                }
                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                            />
                        </label>
                        <label className="block text-xs font-bold text-slate-600">
                            문제 인식
                            <textarea
                                value={content.problem}
                                onChange={(e) =>
                                    setContent((c) => ({ ...c, problem: e.target.value }))
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
                                    setContent((c) => ({ ...c, thoughtProcess: e.target.value }))
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
                                    <div key={i} className="rounded-md border border-slate-200 p-2">
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                value={t.option}
                                                onChange={(e) =>
                                                    updateTradeoff(i, 'option', e.target.value)
                                                }
                                                placeholder="후보안"
                                                className="flex-1 rounded border border-slate-300 px-1.5 py-1 text-xs font-bold"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setContent((c) => ({
                                                        ...c,
                                                        tradeoffs: c.tradeoffs.filter(
                                                            (_, idx) => idx !== i
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
                                                updateTradeoff(i, 'pros', e.target.value)
                                            }
                                            placeholder="장점"
                                            className="mt-1 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                                        />
                                        <input
                                            value={t.cons}
                                            onChange={(e) =>
                                                updateTradeoff(i, 'cons', e.target.value)
                                            }
                                            placeholder="단점"
                                            className="mt-1 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                                        />
                                        <input
                                            value={t.chosenBecause}
                                            onChange={(e) =>
                                                updateTradeoff(i, 'chosenBecause', e.target.value)
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
                                    setContent((c) => ({ ...c, solution: e.target.value }))
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
                                        outcome: { ...c.outcome, summary: e.target.value },
                                    }))
                                }
                                rows={2}
                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                            />
                        </label>

                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">성과 지표</span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setContent((c) => ({
                                            ...c,
                                            outcome: {
                                                ...c.outcome,
                                                metrics: [
                                                    ...c.outcome.metrics,
                                                    { label: '', before: '', after: '' },
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
                                    <div key={i} className="flex items-center gap-1.5">
                                        <input
                                            value={m.label}
                                            onChange={(e) =>
                                                updateMetric(i, 'label', e.target.value)
                                            }
                                            placeholder="지표명"
                                            className="w-24 rounded border border-slate-300 px-1.5 py-1 text-xs"
                                        />
                                        <input
                                            value={m.before}
                                            onChange={(e) =>
                                                updateMetric(i, 'before', e.target.value)
                                            }
                                            placeholder="이전"
                                            className="w-20 rounded border border-slate-300 px-1.5 py-1 text-xs"
                                        />
                                        <input
                                            value={m.after}
                                            onChange={(e) =>
                                                updateMetric(i, 'after', e.target.value)
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
                                                        metrics: c.outcome.metrics.filter(
                                                            (_, idx) => idx !== i
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
                                                                (_, idx) => idx !== i
                                                            ),
                                                        imageUrls: c.architecture.imageUrls.filter(
                                                            (_, idx) => idx !== i
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

                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                        <button
                            type="button"
                            onClick={() => saveRevisionMutation.mutate('MANUAL')}
                            disabled={saveRevisionMutation.isPending}
                            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                        >
                            {saveRevisionMutation.isPending ? '저장 중...' : '리비전 저장'}
                        </button>
                        {detail && detail.revisions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => publishMutation.mutate(detail.revisions[0].id)}
                                disabled={publishMutation.isPending}
                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                            >
                                최신 리비전 발행
                            </button>
                        )}
                        {selectedCaseStudy.status === 'PUBLISHED' && (
                            <button
                                type="button"
                                onClick={() => unpublishMutation.mutate()}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600"
                            >
                                발행 취소
                            </button>
                        )}
                        {detail && detail.revisions.length > 0 && (
                            <span className="ml-auto text-[11px] text-slate-400">
                                v{detail.revisions[0].version} 저장됨
                                {selectedCaseStudy.publishedRevisionId === detail.revisions[0].id &&
                                    ' · 발행 중'}
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
                    왼쪽에서 케이스스터디를 선택하거나 새로 만드세요
                </div>
            )}
        </div>
    );
}
