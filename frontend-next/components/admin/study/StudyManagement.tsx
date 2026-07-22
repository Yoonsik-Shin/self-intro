'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    BookOpen,
    Check,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Sparkles,
    Trash2,
    WandSparkles,
} from 'lucide-react';
import { ApiError, studyApi, skillApi, experienceApi } from '@/lib/api';
import type { GalleryImage, Study, StudyRequest, StudySuggestion } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { ImageGalleryEditor } from '../shared/ImageGalleryEditor';
import { MarkdownEditor } from '../shared/MarkdownEditor';
import { StudyDetailPanel } from './StudyDetailPanel';
import { AiStageBubble, useAiSuggestionStream } from '../ai/AiDraftAssistant';

const STUDY_AI_FIELD_LABELS: Record<string, string> = {
    text: '사실',
    reason: '판단',
    title: '제목',
    summary: '요약',
    contentMarkdown: '본문',
};

type StudyForm = Omit<StudyRequest, 'tagNames' | 'images'> & {
    tagNames: string;
    images: GalleryImage[];
};

const emptyStudyForm: StudyForm = {
    slug: '',
    title: '',
    summary: '',
    contentMarkdown: '',
    status: 'DRAFT',
    categoryId: 1,
    tagNames: '',
    skillIds: [],
    experienceIds: [],
    experienceDetailIds: [],
    relatedStudies: [],
    images: [],
    learnedAt: new Date().toISOString().split('T')[0],
    publishedAt: null,
};

const toStudyRequest = (form: StudyForm): StudyRequest => ({
    ...form,
    tagNames: form.tagNames
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    images: form.images.map(({ id, objectKey, displayOrder }) => ({ id, objectKey, displayOrder })),
});

export function StudyManagement() {
    const queryClient = useQueryClient();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const handleMutationError = (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) setUnauthenticated();
    };

    const {
        data: studyPage,
        isLoading: isStudyListLoading,
        isError: isStudyListError,
        refetch: refetchStudies,
    } = useQuery({
        queryKey: ['studies', 'admin'],
        queryFn: () => studyApi.adminList(),
    });
    const studies = studyPage?.content;

    const { data: studyCategories } = useQuery({
        queryKey: ['studyCategories'],
        queryFn: studyApi.categories,
    });
    const { data: skillsList } = useQuery({ queryKey: ['skills'], queryFn: () => skillApi.list() });
    const { data: experiencesList } = useQuery({
        queryKey: ['experiences'],
        queryFn: () => experienceApi.list(),
    });

    const [studyEditingId, setStudyEditingId] = useState<number | null>(null);
    const [studyForm, setStudyForm] = useState<StudyForm>(emptyStudyForm);
    const [isStudyFormOpen, setIsStudyFormOpen] = useState(false);
    const [selectedStudyId, setSelectedStudyId] = useState<number | null>(null);
    const [previousStudyId, setPreviousStudyId] = useState<number | null>(null);

    const syncStudyUrlState = useCallback(
        (
            id: number | null,
            action?: 'edit' | 'new',
            options?: { history?: 'push' | 'replace'; fromStudyId?: number | null }
        ) => {
            if (id !== null) {
                setSelectedStudyId(id);
                if (action === 'edit') {
                    setIsStudyFormOpen(true);
                    setStudyEditingId(id);
                } else {
                    setIsStudyFormOpen(false);
                    setStudyEditingId(null);
                }
            } else if (action === 'new') {
                setSelectedStudyId(null);
                setIsStudyFormOpen(true);
                setStudyEditingId(null);
            } else {
                setSelectedStudyId(null);
                setIsStudyFormOpen(false);
                setStudyEditingId(null);
            }

            const fromStudyId = options?.fromStudyId ?? null;
            setPreviousStudyId(fromStudyId);

            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'STUDY');
                if (id) {
                    url.searchParams.set('studyId', id.toString());
                } else {
                    url.searchParams.delete('studyId');
                }
                if (action) {
                    url.searchParams.set('action', action);
                } else {
                    url.searchParams.delete('action');
                }
                if (fromStudyId !== null) {
                    url.searchParams.set('fromStudyId', fromStudyId.toString());
                } else {
                    url.searchParams.delete('fromStudyId');
                }

                const nextUrl = url.pathname + url.search;
                if (options?.history === 'push') {
                    window.history.pushState(null, '', nextUrl);
                } else {
                    window.history.replaceState(null, '', nextUrl);
                }
            }
        },
        []
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const studyIdParam = params.get('studyId');
            const actionParam = params.get('action');
            const fromStudyIdParam = params.get('fromStudyId');
            const parsedFromStudyId = fromStudyIdParam ? Number(fromStudyIdParam) : NaN;

            setPreviousStudyId(Number.isFinite(parsedFromStudyId) ? parsedFromStudyId : null);

            if (studyIdParam) {
                const sId = Number(studyIdParam);
                if (!isNaN(sId)) {
                    setSelectedStudyId(sId);
                    if (actionParam === 'edit') {
                        setIsStudyFormOpen(true);
                        setStudyEditingId(sId);
                    } else {
                        setIsStudyFormOpen(false);
                        setStudyEditingId(null);
                    }
                    return;
                }
            }

            if (actionParam === 'new') {
                setIsStudyFormOpen(true);
                setStudyEditingId(null);
                setSelectedStudyId(null);
                return;
            }

            setSelectedStudyId(null);
            setIsStudyFormOpen(false);
            setStudyEditingId(null);
        };

        syncFromUrl();

        const handlePopState = () => {
            syncFromUrl();
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const [studySkillSearch, setStudySkillSearch] = useState('');
    const [studyExperienceSearch, setStudyExperienceSearch] = useState('');
    const [studyExperienceDetailSearch, setStudyExperienceDetailSearch] = useState('');
    const [relatedStudySearch, setRelatedStudySearch] = useState('');
    const [studyFilter, setStudyFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
    const [selectedStudyIds, setSelectedStudyIds] = useState<number[]>([]);
    const [studySearch, setStudySearch] = useState<string>('');
    const [studyAiInstruction, setStudyAiInstruction] = useState('');
    const [studyAiSuggestions, setStudyAiSuggestions] = useState<StudySuggestion[]>([]);
    const [studyAiFactCount, setStudyAiFactCount] = useState(0);
    const {
        aiStages: studyAiStages,
        aiError: studyAiError,
        setAiError: setStudyAiError,
        isGenerating: isStudyAiGenerating,
        setIsGenerating: setIsStudyAiGenerating,
        abortRef: studyAiAbortRef,
        chatRef: studyAiChatRef,
        reset: resetStudyAiStreamBase,
        pushStage: pushStudyAiStage,
        appendToken: appendStudyAiToken,
        finishStages: finishStudyAiStages,
    } = useAiSuggestionStream();
    const resetStudyAiStream = useCallback(() => {
        resetStudyAiStreamBase();
        setStudyAiFactCount(0);
    }, [resetStudyAiStreamBase]);

    const counts = useMemo(() => {
        const total = studies?.length ?? 0;
        const draft = studies?.filter((s) => s.status === 'DRAFT').length ?? 0;
        const published = studies?.filter((s) => s.status === 'PUBLISHED').length ?? 0;
        return { total, draft, published };
    }, [studies]);

    const filteredStudies = useMemo(() => {
        return studies?.filter((study) => {
            const matchesCategory = studyFilter === 'ALL' || study.category.slug === studyFilter;
            const matchesStatus = statusFilter === 'ALL' || study.status === statusFilter;
            const matchesSearch =
                !studySearch ||
                study.title.toLowerCase().includes(studySearch.toLowerCase()) ||
                study.summary.toLowerCase().includes(studySearch.toLowerCase()) ||
                study.contentMarkdown.toLowerCase().includes(studySearch.toLowerCase()) ||
                study.tags.some((tag) =>
                    tag.name.toLowerCase().includes(studySearch.toLowerCase())
                ) ||
                study.skills.some((skill) =>
                    skill.name.toLowerCase().includes(studySearch.toLowerCase())
                );
            return matchesCategory && matchesStatus && matchesSearch;
        });
    }, [studies, studyFilter, statusFilter, studySearch]);

    const selectedStudy = useMemo(
        () => studies?.find((study) => study.id === selectedStudyId) ?? null,
        [studies, selectedStudyId]
    );

    const selectableStudySkills = useMemo(() => {
        const keyword = studySkillSearch.trim().toLowerCase();
        if (!keyword) return skillsList ?? [];
        return (skillsList ?? []).filter(
            (skill) =>
                skill.name.toLowerCase().includes(keyword) ||
                skill.category.toLowerCase().includes(keyword)
        );
    }, [skillsList, studySkillSearch]);

    const selectableStudyExperiences = useMemo(() => {
        const keyword = studyExperienceSearch.trim().toLowerCase();
        if (!keyword) return experiencesList ?? [];
        return (experiencesList ?? []).filter(
            (experience) =>
                experience.title.toLowerCase().includes(keyword) ||
                experience.type.toLowerCase().includes(keyword)
        );
    }, [experiencesList, studyExperienceSearch]);

    const selectableStudyExperienceDetails = useMemo(() => {
        const keyword = studyExperienceDetailSearch.trim().toLowerCase();
        return (experiencesList ?? [])
            .map((experience) => ({
                experience,
                details: experience.details.filter(
                    (detail) =>
                        !keyword ||
                        experience.title.toLowerCase().includes(keyword) ||
                        detail.content.toLowerCase().includes(keyword)
                ),
            }))
            .filter((group) => group.details.length > 0);
    }, [experiencesList, studyExperienceDetailSearch]);

    const selectableRelatedStudies = useMemo(() => {
        const keyword = relatedStudySearch.trim().toLowerCase();
        return (studies ?? []).filter((study) => {
            if (study.id === studyEditingId) return false;
            return (
                !keyword ||
                study.title.toLowerCase().includes(keyword) ||
                study.slug.toLowerCase().includes(keyword)
            );
        });
    }, [studies, studyEditingId, relatedStudySearch]);

    const createStudyMutation = useMutation({
        mutationFn: (form: StudyForm) => studyApi.create(toStudyRequest(form)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['learning'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            setStudyForm(emptyStudyForm);
            setIsStudyFormOpen(false);
        },
        onError: handleMutationError,
    });

    const updateStudyMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: StudyForm }) =>
            studyApi.update(id, toStudyRequest(payload)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['learning'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            setStudyEditingId(null);
            setStudyForm(emptyStudyForm);
            setIsStudyFormOpen(false);
        },
        onError: handleMutationError,
    });

    const deleteStudyMutation = useMutation({
        mutationFn: studyApi.remove,
        onSuccess: (_data, deletedId) => {
            queryClient.invalidateQueries({ queryKey: ['learning'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            if (selectedStudyId === deletedId) setSelectedStudyId(null);
            setSelectedStudyIds((prev) => prev.filter((id) => id !== deletedId));
        },
        onError: handleMutationError,
    });

    const batchPublishMutation = useMutation({
        mutationFn: (ids: number[]) => studyApi.batchPublish(ids),
        onSuccess: (updatedStudies) => {
            queryClient.invalidateQueries({ queryKey: ['learning'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            setSelectedStudyIds([]);
            alert(`${updatedStudies.length}개의 초안 글이 성공적으로 공개 전환되었습니다!`);
        },
        onError: handleMutationError,
    });

    const batchUnpublishMutation = useMutation({
        mutationFn: (ids: number[]) => studyApi.batchUnpublish(ids),
        onSuccess: (updatedStudies) => {
            queryClient.invalidateQueries({ queryKey: ['learning'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            setSelectedStudyIds([]);
            alert(`${updatedStudies.length}개의 글이 성공적으로 초안(비공개) 전환되었습니다!`);
        },
        onError: handleMutationError,
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (id: number) => studyApi.toggleStatus(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['learning'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
        },
        onError: handleMutationError,
    });

    const toggleSelectStudy = (id: number) => {
        setSelectedStudyIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAllFiltered = () => {
        if (!filteredStudies) return;
        const filteredIds = filteredStudies.map((s) => s.id);
        const allSelected = filteredIds.every((id) => selectedStudyIds.includes(id));
        if (allSelected) {
            setSelectedStudyIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
        } else {
            setSelectedStudyIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const handleBatchPublish = (idsToPublish: number[]) => {
        if (idsToPublish.length === 0) return;
        if (
            window.confirm(
                `선택한 ${idsToPublish.length}개의 초안 글을 모두 공개로 전환하시겠습니까?`
            )
        ) {
            batchPublishMutation.mutate(idsToPublish);
        }
    };

    const handleBatchUnpublish = (idsToUnpublish: number[]) => {
        if (idsToUnpublish.length === 0) return;
        if (
            window.confirm(
                `선택한 ${idsToUnpublish.length}개의 글을 모두 초안(비공개) 상태로 전환하시겠습니까?`
            )
        ) {
            batchUnpublishMutation.mutate(idsToUnpublish);
        }
    };

    const handleStudySubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (studyEditingId !== null) {
            updateStudyMutation.mutate({ id: studyEditingId, payload: studyForm });
        } else {
            createStudyMutation.mutate(studyForm);
        }
    };

    const handleStudyDelete = (id: number) => {
        if (window.confirm('정말 이 공부 기록을 삭제하시겠습니까?')) {
            deleteStudyMutation.mutate(id);
        }
    };

    const requestStudyAiSuggestions = async () => {
        resetStudyAiStream();
        setStudyAiSuggestions([]);
        setIsStudyAiGenerating(true);
        const controller = new AbortController();
        studyAiAbortRef.current = controller;
        try {
            await studyApi.suggestStream(
                {
                    instruction: studyAiInstruction,
                    draftTitle: studyForm.title,
                    draftSummary: studyForm.summary,
                    skillIds: studyForm.skillIds,
                    experienceIds: studyForm.experienceIds,
                    experienceDetailIds: studyForm.experienceDetailIds,
                    relatedStudyIds: studyForm.relatedStudies.map((item) => item.studyId),
                },
                (event) => {
                    if (event.type === 'stage') {
                        pushStudyAiStage(event.stage, event.message);
                    } else if (event.type === 'token') {
                        appendStudyAiToken(event.stage, event.text);
                    } else if (event.type === 'facts') {
                        setStudyAiFactCount(event.factCount);
                    } else if (event.type === 'complete') {
                        finishStudyAiStages();
                        setStudyAiSuggestions(event.suggestions);
                    } else {
                        setStudyAiError(event.message);
                    }
                },
                controller.signal
            );
        } catch (error) {
            if (!controller.signal.aborted) {
                setStudyAiError(
                    error instanceof Error ? error.message : 'AI 초안 생성에 실패했습니다.'
                );
            }
        } finally {
            if (studyAiAbortRef.current === controller) {
                studyAiAbortRef.current = null;
                setIsStudyAiGenerating(false);
            }
        }
    };

    const applyStudyAiSuggestion = (suggestion: StudySuggestion) => {
        if (
            (studyForm.title.trim() ||
                studyForm.summary.trim() ||
                studyForm.contentMarkdown.trim()) &&
            !window.confirm('현재 작성한 제목·요약·본문을 AI 초안으로 바꾸시겠습니까?')
        )
            return;
        setStudyForm({
            ...studyForm,
            title: suggestion.title,
            summary: suggestion.summary,
            contentMarkdown: suggestion.contentMarkdown,
            tagNames: suggestion.tagNames.join(', '),
        });
    };

    const openStudyEditor = useCallback(
        (study: Study) => {
            setStudyEditingId(study.id);
            setSelectedStudyId(study.id);
            setStudyForm({
                slug: study.slug,
                title: study.title,
                summary: study.summary,
                contentMarkdown: study.contentMarkdown,
                status: study.status,
                categoryId: study.category.id,
                tagNames: study.tags.map((tag) => tag.name).join(', '),
                skillIds: study.skills.map((skill) => skill.id),
                experienceIds: study.experiences.map((experience) => experience.id),
                experienceDetailIds: study.experienceDetails.map((detail) => detail.id),
                relatedStudies: study.relatedStudies.map((related) => ({
                    studyId: related.id,
                    type: related.type,
                })),
                images: study.images,
                learnedAt: study.learnedAt,
                publishedAt: study.publishedAt ?? null,
            });
            setStudyAiSuggestions([]);
            resetStudyAiStream();
            setIsStudyFormOpen(true);
            syncStudyUrlState(study.id, 'edit');
        },
        [resetStudyAiStream, syncStudyUrlState]
    );

    // Populate edit form on page refresh once studies finish loading from API
    useEffect(() => {
        if (studies && studyEditingId !== null && isStudyFormOpen && !studyForm.title) {
            const target = studies.find((s) => s.id === studyEditingId);
            if (target) {
                requestAnimationFrame(() => {
                    setStudyForm({
                        slug: target.slug,
                        title: target.title,
                        summary: target.summary,
                        contentMarkdown: target.contentMarkdown,
                        status: target.status,
                        categoryId: target.category.id,
                        tagNames: target.tags.map((tag) => tag.name).join(', '),
                        skillIds: target.skills.map((skill) => skill.id),
                        experienceIds: target.experiences.map((experience) => experience.id),
                        experienceDetailIds: target.experienceDetails.map((detail) => detail.id),
                        relatedStudies: target.relatedStudies.map((related) => ({
                            studyId: related.id,
                            type: related.type,
                        })),
                        images: target.images,
                        learnedAt: target.learnedAt,
                        publishedAt: target.publishedAt ?? null,
                    });
                });
            }
        }
    }, [studies, studyEditingId, isStudyFormOpen, studyForm.title]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <h2 className="text-xl font-black text-slate-950">Study 관리</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Markdown 학습 문서와 관련 기술·프로젝트·경력을 관리합니다.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setSelectedStudyId(null);
                        setStudyEditingId(null);
                        setStudyForm(emptyStudyForm);
                        setStudyAiInstruction('');
                        setStudyAiSuggestions([]);
                        resetStudyAiStream();
                        setIsStudyFormOpen(true);
                        syncStudyUrlState(null, 'new');
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                >
                    <Plus className="h-4 w-4" />새 글 작성
                </button>
            </div>

            {!isStudyFormOpen && !selectedStudy && (
                <div className="sticky top-14 z-20 flex flex-col gap-3 bg-white/95 p-4 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-xl animate-fadeIn">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        {/* Status Filter Pills */}
                        <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 border border-slate-200/60">
                            {(
                                [
                                    { key: 'ALL', label: '전체', count: counts.total },
                                    { key: 'DRAFT', label: '초안', count: counts.draft },
                                    { key: 'PUBLISHED', label: '공개', count: counts.published },
                                ] as const
                            ).map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter(item.key);
                                        setSelectedStudyIds([]);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition ${
                                        statusFilter === item.key
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {item.label}
                                    <span
                                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                            statusFilter === item.key
                                                ? item.key === 'DRAFT'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : item.key === 'PUBLISHED'
                                                      ? 'bg-emerald-100 text-emerald-800'
                                                      : 'bg-slate-200 text-slate-700'
                                                : 'bg-slate-200/60 text-slate-500'
                                        }`}
                                    >
                                        {item.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-64 relative">
                            <input
                                type="text"
                                placeholder="제목, 본문, 기술 검색..."
                                value={studySearch}
                                onChange={(e) => setStudySearch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 pl-9 text-sm transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                            />
                            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">
                            카테고리:
                        </span>
                        {[{ slug: 'ALL', name: '전체' }, ...(studyCategories ?? [])].map(
                            (category) => (
                                <button
                                    key={category.slug}
                                    onClick={() => setStudyFilter(category.slug)}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                                        studyFilter === category.slug
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/50'
                                    }`}
                                >
                                    {category.name}
                                </button>
                            )
                        )}
                    </div>
                </div>
            )}

            {!isStudyFormOpen && !selectedStudy && statusFilter !== 'ALL' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={Boolean(
                                    filteredStudies &&
                                    filteredStudies.length > 0 &&
                                    filteredStudies.every((s) => selectedStudyIds.includes(s.id))
                                )}
                                onChange={toggleSelectAllFiltered}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            현재 {statusFilter === 'DRAFT' ? '초안' : '공개'} 목록 전체 선택 (
                            {filteredStudies?.length ?? 0}개 중 {selectedStudyIds.length}개 선택됨)
                        </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {statusFilter === 'DRAFT' && (
                            <>
                                {selectedStudyIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleBatchPublish(selectedStudyIds)}
                                        disabled={batchPublishMutation.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        선택한 {selectedStudyIds.length}개 일괄 공개
                                    </button>
                                )}

                                {counts.draft > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const draftIds =
                                                studies
                                                    ?.filter((s) => s.status === 'DRAFT')
                                                    .map((s) => s.id) ?? [];
                                            handleBatchPublish(draftIds);
                                        }}
                                        disabled={batchPublishMutation.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                                    >
                                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                        초안 {counts.draft}개 전체 일괄 공개
                                    </button>
                                )}
                            </>
                        )}

                        {statusFilter === 'PUBLISHED' && (
                            <>
                                {selectedStudyIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleBatchUnpublish(selectedStudyIds)}
                                        disabled={batchUnpublishMutation.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-50"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        선택한 {selectedStudyIds.length}개 일괄 비공개(초안) 전환
                                    </button>
                                )}

                                {counts.published > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const publishedIds =
                                                studies
                                                    ?.filter((s) => s.status === 'PUBLISHED')
                                                    .map((s) => s.id) ?? [];
                                            handleBatchUnpublish(publishedIds);
                                        }}
                                        disabled={batchUnpublishMutation.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-200 disabled:opacity-50"
                                    >
                                        공개 {counts.published}개 전체 일괄 비공개 전환
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {isStudyFormOpen && (
                <form
                    onSubmit={handleStudySubmit}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h3 className="text-base font-black text-slate-800">
                        {studyEditingId !== null ? '글 수정' : '새 글 작성'}
                    </h3>

                    <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
                                <WandSparkles className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h4 className="font-black text-violet-950">
                                    AI로 학습 정리 초안 만들기
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-violet-700">
                                    AI가 1단계에서 선택한 기술·경력·관련 Study와 메모의 사실관계를
                                    정리하고, 2단계에서 검증된 사실만 사용해 제목·요약·태그·본문
                                    초안을 작성합니다.
                                </p>
                                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                    <textarea
                                        rows={3}
                                        maxLength={1000}
                                        value={studyAiInstruction}
                                        onChange={(event) =>
                                            setStudyAiInstruction(event.target.value)
                                        }
                                        placeholder="이 글에 담고 싶은 핵심 내용, 키워드, 있었던 일을 적어주세요."
                                        className="min-h-[88px] flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={requestStudyAiSuggestions}
                                        disabled={isStudyAiGenerating}
                                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 sm:self-stretch"
                                    >
                                        <WandSparkles
                                            className={`h-4 w-4 ${isStudyAiGenerating ? 'animate-pulse' : ''}`}
                                        />
                                        {isStudyAiGenerating
                                            ? '사실관계 정리·작성 중...'
                                            : studyAiSuggestions.length > 0
                                              ? '다시 생성'
                                              : 'AI 초안 생성'}
                                    </button>
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-violet-500">
                                    선택한 기술·경력·Study 요약과 메모가 NVIDIA NIM API로
                                    전송됩니다. AI 초안은 자동 저장되지 않으니 반드시 검토 후
                                    저장하세요.
                                </p>

                                {(studyAiStages.length > 0 || studyAiError) && (
                                    <div
                                        ref={studyAiChatRef}
                                        className="mt-4 max-h-80 space-y-2.5 overflow-y-auto rounded-xl border border-violet-100 bg-white p-3"
                                    >
                                        {studyAiStages.map((stageItem) => (
                                            <AiStageBubble
                                                key={stageItem.stage}
                                                stage={stageItem}
                                                fieldLabels={STUDY_AI_FIELD_LABELS}
                                                extra={
                                                    stageItem.stage === 1 &&
                                                    studyAiFactCount > 0 ? (
                                                        <p className="mt-2 text-[11px] font-bold text-violet-600">
                                                            검증된 사실 {studyAiFactCount}개
                                                        </p>
                                                    ) : undefined
                                                }
                                            />
                                        ))}
                                        {studyAiError && (
                                            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                                {studyAiError}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {studyAiSuggestions.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                        {studyAiSuggestions.map((suggestion, index) => (
                                            <article
                                                key={`${suggestion.title}-${index}`}
                                                className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm"
                                            >
                                                <h5 className="text-sm font-black leading-snug text-slate-900">
                                                    {suggestion.title}
                                                </h5>
                                                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                                    {suggestion.summary}
                                                </p>
                                                {suggestion.tagNames.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {suggestion.tagNames.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="rounded bg-blue-50 px-1.5 py-1 text-[10px] font-bold text-blue-700"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                                                    {suggestion.contentMarkdown}
                                                </div>
                                                {suggestion.reason && (
                                                    <p className="mt-3 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] leading-relaxed text-violet-700">
                                                        {suggestion.reason}
                                                    </p>
                                                )}
                                                <div className="mt-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            applyStudyAiSuggestion(suggestion)
                                                        }
                                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50"
                                                    >
                                                        <Check className="h-3.5 w-3.5" /> 이 초안
                                                        적용
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                제목
                            </label>
                            <input
                                type="text"
                                required
                                value={studyForm.title}
                                onChange={(e) =>
                                    setStudyForm({ ...studyForm, title: e.target.value })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Slug
                            </label>
                            <input
                                type="text"
                                value={studyForm.slug}
                                onChange={(e) =>
                                    setStudyForm({ ...studyForm, slug: e.target.value })
                                }
                                placeholder="비워두면 제목으로 자동 생성"
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                카테고리
                            </label>
                            <select
                                value={studyForm.categoryId}
                                onChange={(e) =>
                                    setStudyForm({
                                        ...studyForm,
                                        categoryId: Number(e.target.value),
                                    })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                {(studyCategories ?? []).map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                공개 상태
                            </label>
                            <select
                                value={studyForm.status}
                                onChange={(e) =>
                                    setStudyForm({
                                        ...studyForm,
                                        status: e.target.value as StudyForm['status'],
                                    })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                <option value="DRAFT">임시 저장</option>
                                <option value="PUBLISHED">공개</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            목록 요약
                        </label>
                        <textarea
                            required
                            rows={2}
                            maxLength={500}
                            value={studyForm.summary}
                            onChange={(e) =>
                                setStudyForm({ ...studyForm, summary: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            태그 (쉼표 구분)
                        </label>
                        <input
                            type="text"
                            value={studyForm.tagNames}
                            onChange={(e) =>
                                setStudyForm({ ...studyForm, tagNames: e.target.value })
                            }
                            placeholder="트랜잭션, 동시성, 장애대응"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                기술 스택
                            </label>
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={studySkillSearch}
                                    onChange={(event) => setStudySkillSearch(event.target.value)}
                                    placeholder="기술명 또는 분류 검색"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                                {selectableStudySkills.map((skill) => (
                                    <label
                                        key={skill.id}
                                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={studyForm.skillIds.includes(skill.id)}
                                            onChange={(event) =>
                                                setStudyForm({
                                                    ...studyForm,
                                                    skillIds: event.target.checked
                                                        ? [...studyForm.skillIds, skill.id]
                                                        : studyForm.skillIds.filter(
                                                              (id) => id !== skill.id
                                                          ),
                                                })
                                            }
                                        />
                                        {skill.name}
                                    </label>
                                ))}
                                {selectableStudySkills.length === 0 && (
                                    <p className="py-4 text-center text-xs font-semibold text-slate-400">
                                        검색 결과가 없습니다.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                관련 프로젝트·경력
                            </label>
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={studyExperienceSearch}
                                    onChange={(event) =>
                                        setStudyExperienceSearch(event.target.value)
                                    }
                                    placeholder="제목 또는 유형 검색"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                                {selectableStudyExperiences.map((experience) => (
                                    <label
                                        key={experience.id}
                                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={studyForm.experienceIds.includes(
                                                experience.id
                                            )}
                                            onChange={(event) =>
                                                setStudyForm({
                                                    ...studyForm,
                                                    experienceIds: event.target.checked
                                                        ? [
                                                              ...studyForm.experienceIds,
                                                              experience.id,
                                                          ]
                                                        : studyForm.experienceIds.filter(
                                                              (id) => id !== experience.id
                                                          ),
                                                })
                                            }
                                        />
                                        <span className="font-mono text-slate-400">
                                            {experience.type}
                                        </span>
                                        {experience.title}
                                    </label>
                                ))}
                                {selectableStudyExperiences.length === 0 && (
                                    <p className="py-4 text-center text-xs font-semibold text-slate-400">
                                        검색 결과가 없습니다.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            관련 경력 상세 항목
                        </label>
                        <div className="relative mb-2">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={studyExperienceDetailSearch}
                                onChange={(event) =>
                                    setStudyExperienceDetailSearch(event.target.value)
                                }
                                placeholder="경력 제목 또는 항목 내용 검색"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div className="max-h-52 space-y-3 overflow-auto rounded-xl border border-slate-200 p-3">
                            {selectableStudyExperienceDetails.map(({ experience, details }) => (
                                <div key={experience.id}>
                                    <p className="mb-1 px-2 text-xs font-bold text-slate-400">
                                        {experience.title}
                                    </p>
                                    {details.map((detail) => (
                                        <label
                                            key={detail.id}
                                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={studyForm.experienceDetailIds.includes(
                                                    detail.id
                                                )}
                                                onChange={(event) =>
                                                    setStudyForm({
                                                        ...studyForm,
                                                        experienceDetailIds: event.target.checked
                                                            ? [
                                                                  ...studyForm.experienceDetailIds,
                                                                  detail.id,
                                                              ]
                                                            : studyForm.experienceDetailIds.filter(
                                                                  (id) => id !== detail.id
                                                              ),
                                                    })
                                                }
                                            />
                                            {detail.content}
                                        </label>
                                    ))}
                                </div>
                            ))}
                            {selectableStudyExperienceDetails.length === 0 && (
                                <p className="py-4 text-center text-xs font-semibold text-slate-400">
                                    검색 결과가 없습니다.
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            관련 Study
                        </label>
                        <div className="relative mb-2">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={relatedStudySearch}
                                onChange={(event) => setRelatedStudySearch(event.target.value)}
                                placeholder="Study 제목 또는 slug 검색"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div className="max-h-52 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
                            {selectableRelatedStudies.map((study) => {
                                const relation = studyForm.relatedStudies.find(
                                    (item) => item.studyId === study.id
                                );
                                return (
                                    <div
                                        key={study.id}
                                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={Boolean(relation)}
                                            onChange={(event) =>
                                                setStudyForm({
                                                    ...studyForm,
                                                    relatedStudies: event.target.checked
                                                        ? [
                                                              ...studyForm.relatedStudies,
                                                              {
                                                                  studyId: study.id,
                                                                  type: 'RELATED',
                                                              },
                                                          ]
                                                        : studyForm.relatedStudies.filter(
                                                              (item) => item.studyId !== study.id
                                                          ),
                                                })
                                            }
                                        />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                            {study.title}
                                        </span>
                                        {relation && (
                                            <select
                                                value={relation.type}
                                                onChange={(event) =>
                                                    setStudyForm({
                                                        ...studyForm,
                                                        relatedStudies:
                                                            studyForm.relatedStudies.map((item) =>
                                                                item.studyId === study.id
                                                                    ? {
                                                                          ...item,
                                                                          type: event.target
                                                                              .value as typeof item.type,
                                                                      }
                                                                    : item
                                                            ),
                                                    })
                                                }
                                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                                            >
                                                <option value="RELATED">일반 관련</option>
                                                <option value="PREREQUISITE">선행 학습</option>
                                                <option value="FOLLOW_UP">후속 학습</option>
                                                <option value="APPLIED_TO">적용 사례</option>
                                            </select>
                                        )}
                                    </div>
                                );
                            })}
                            {selectableRelatedStudies.length === 0 && (
                                <p className="py-4 text-center text-xs font-semibold text-slate-400">
                                    검색 결과가 없습니다.
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            이미지
                        </label>
                        <ImageGalleryEditor
                            scope="STUDY_GALLERY"
                            images={studyForm.images}
                            onChange={(images) => setStudyForm({ ...studyForm, images })}
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Markdown 본문
                        </label>
                        <MarkdownEditor
                            value={studyForm.contentMarkdown}
                            onChange={(contentMarkdown) =>
                                setStudyForm({ ...studyForm, contentMarkdown })
                            }
                            enableImageUpload
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            학습일
                        </label>
                        <input
                            type="date"
                            required
                            value={studyForm.learnedAt}
                            onChange={(e) =>
                                setStudyForm({ ...studyForm, learnedAt: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsStudyFormOpen(false);
                                setStudyAiSuggestions([]);
                                resetStudyAiStream();
                            }}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={
                                createStudyMutation.isPending || updateStudyMutation.isPending
                            }
                            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                        >
                            {studyEditingId !== null ? '수정 완료' : '작성 완료'}
                        </button>
                    </div>
                </form>
            )}

            {!isStudyFormOpen && selectedStudy && (
                <StudyDetailPanel
                    study={selectedStudy}
                    backLabel={previousStudyId !== null ? '이전 학습으로' : '목록으로'}
                    onBack={() => {
                        if (previousStudyId !== null) {
                            window.history.back();
                            return;
                        }
                        syncStudyUrlState(null);
                    }}
                    onEdit={openStudyEditor}
                    onDelete={handleStudyDelete}
                    onSelectStudy={(id) => {
                        syncStudyUrlState(id, undefined, {
                            history: 'push',
                            fromStudyId: selectedStudyId,
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                />
            )}

            {!isStudyFormOpen && !selectedStudy && (
                <div className="space-y-2.5">
                    {isStudyListLoading && (
                        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                            <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
                            <p className="mt-3 text-sm font-bold text-slate-500">
                                Study 목록을 불러오는 중입니다.
                            </p>
                        </div>
                    )}

                    {isStudyListError && (
                        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 px-6 py-12 text-center shadow-sm">
                            <p className="text-base font-black text-red-700">
                                Study 목록을 불러오지 못했습니다.
                            </p>
                            <p className="mt-1 text-sm font-medium text-red-500">
                                잠시 후 다시 시도해 주세요.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    void refetchStudies();
                                }}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                다시 시도
                            </button>
                        </div>
                    )}

                    {!isStudyListLoading && !isStudyListError && filteredStudies?.length === 0 && (
                        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
                            <BookOpen className="h-7 w-7 text-slate-300" />
                            <p className="mt-3 text-base font-black text-slate-700">
                                {studies?.length === 0
                                    ? '아직 등록된 Study가 없습니다.'
                                    : '조건에 맞는 Study가 없습니다.'}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-400">
                                {studies?.length === 0
                                    ? '새 글 작성을 눌러 첫 번째 학습 기록을 추가해 보세요.'
                                    : '카테고리나 검색어를 변경해 보세요.'}
                            </p>
                        </div>
                    )}

                    {!isStudyListLoading &&
                        !isStudyListError &&
                        filteredStudies?.map((study) => {
                            const isSelected = selectedStudyIds.includes(study.id);
                            return (
                                <div
                                    key={study.id}
                                    className={`rounded-xl border p-4 shadow-xs transition ${
                                        isSelected
                                            ? 'border-indigo-400 bg-indigo-50/20'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        {statusFilter !== 'ALL' && (
                                            <div className="flex items-center shrink-0 pr-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectStudy(study.id)}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            className="min-w-0 flex-1 text-left"
                                            onClick={() => syncStudyUrlState(study.id)}
                                        >
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs font-bold text-slate-400">
                                                    {study.learnedAt} · {study.category.name}
                                                </span>
                                                <span
                                                    className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                                        study.status === 'PUBLISHED'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                                    }`}
                                                >
                                                    {study.status === 'PUBLISHED' ? '공개' : '초안'}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-base font-black text-slate-800 transition hover:text-slate-950">
                                                {study.title}
                                            </p>
                                            <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                                                {study.summary}
                                            </p>
                                        </button>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleStatusMutation.mutate(study.id)
                                                }
                                                disabled={toggleStatusMutation.isPending}
                                                title={
                                                    study.status === 'PUBLISHED'
                                                        ? '초안(비공개)으로 전환'
                                                        : '공개로 전환'
                                                }
                                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                                                    study.status === 'PUBLISHED'
                                                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                }`}
                                            >
                                                {study.status === 'PUBLISHED'
                                                    ? '비공개 전환'
                                                    : '공개 전환'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => openStudyEditor(study)}
                                                title="수정"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStudyDelete(study.id)}
                                                title="삭제"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-600"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
