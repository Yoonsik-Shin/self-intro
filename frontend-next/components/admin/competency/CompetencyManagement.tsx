'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Check,
    Eye,
    EyeOff,
    Pencil,
    Plus,
    Save,
    Search,
    Sparkles,
    Trash2,
    WandSparkles,
} from 'lucide-react';
import { competencyApi, experienceApi, skillApi, studyApi } from '@/lib/api';
import type { Competency, CompetencyRequest, CompetencySuggestion } from '@/lib/api/types';
import { CompetencyDetailPanel } from './CompetencyDetailPanel';
import { AiStageBubble, useAiSuggestionStream } from '../ai/AiDraftAssistant';

const AI_FIELD_LABELS: Record<string, string> = {
    theme: '주제',
    fact: '근거',
    reason: '판단',
    title: '역량명',
    summary: '설명',
    evidenceSummary: '근거 요약',
};

const emptyForm: CompetencyRequest = {
    title: '',
    summary: '',
    displayOrder: 0,
    visible: true,
    skillIds: [],
    evidences: [],
    studyIds: [],
};

type VisibilityFilter = 'ALL' | 'VISIBLE' | 'HIDDEN';
type AiEvidenceGroupSummary = { theme: string; evidenceCount: number; studyCount: number };

export function CompetencyManagement() {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedCompetencyId, setSelectedCompetencyId] = useState<number | null>(null);
    const [form, setForm] = useState<CompetencyRequest>(emptyForm);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<number[]>([]);
    const [listSearch, setListSearch] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('ALL');
    const [skillSearch, setSkillSearch] = useState('');
    const [experienceSearch, setExperienceSearch] = useState('');
    const [studySearch, setStudySearch] = useState('');
    const [aiInstruction, setAiInstruction] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<CompetencySuggestion[]>([]);
    const [aiEvidenceGroups, setAiEvidenceGroups] = useState<AiEvidenceGroupSummary[]>([]);
    const {
        aiStages,
        aiError,
        setAiError,
        isGenerating,
        setIsGenerating,
        abortRef: aiAbortRef,
        chatRef: aiChatRef,
        reset: resetAiStreamBase,
        pushStage,
        appendToken,
        finishStages,
    } = useAiSuggestionStream();

    const { data: competencies = [], isLoading } = useQuery({
        queryKey: ['competencies', 'admin'],
        queryFn: competencyApi.list,
    });
    const { data: skills = [] } = useQuery({ queryKey: ['skills'], queryFn: skillApi.list });
    const { data: experiences = [] } = useQuery({
        queryKey: ['experiences'],
        queryFn: experienceApi.list,
    });
    const { data: studyPage } = useQuery({
        queryKey: ['studies', 'admin'],
        queryFn: () => studyApi.adminList(),
    });

    const counts = useMemo(() => {
        const total = competencies.length;
        const visible = competencies.filter((item) => item.visible).length;
        const hidden = competencies.filter((item) => !item.visible).length;
        return { total, visible, hidden };
    }, [competencies]);

    const selectedCompetency =
        competencies.find((item) => item.id === selectedCompetencyId) ?? null;
    const filteredCompetencies = useMemo(() => {
        const keyword = listSearch.trim().toLowerCase();
        return competencies.filter((item) => {
            const matchesVisibility =
                visibilityFilter === 'ALL' ||
                (visibilityFilter === 'VISIBLE' && item.visible) ||
                (visibilityFilter === 'HIDDEN' && !item.visible);
            const searchable = [
                item.title,
                item.summary,
                ...item.skills.map((skill) => skill.name),
                ...item.evidences.map((evidence) => evidence.experienceTitle),
                ...item.relatedStudies.map((study) => study.title),
            ]
                .join(' ')
                .toLowerCase();
            return matchesVisibility && (!keyword || searchable.includes(keyword));
        });
    }, [competencies, listSearch, visibilityFilter]);
    const selectableExperiences = useMemo(
        () =>
            experiences.filter(
                (item) =>
                    (item.type === 'CAREER' || item.type === 'PROJECT') &&
                    (!experienceSearch ||
                        item.title.toLowerCase().includes(experienceSearch.toLowerCase()))
            ),
        [experiences, experienceSearch]
    );
    const filteredSkills = useMemo(
        () =>
            skills.filter(
                (item) =>
                    !skillSearch || item.name.toLowerCase().includes(skillSearch.toLowerCase())
            ),
        [skills, skillSearch]
    );
    const filteredStudies = useMemo(
        () =>
            (studyPage?.content ?? []).filter(
                (item) =>
                    !studySearch || item.title.toLowerCase().includes(studySearch.toLowerCase())
            ),
        [studyPage, studySearch]
    );

    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['competencies'] }),
            queryClient.invalidateQueries({ queryKey: ['introduction'] }),
        ]);
    };

    const finishSave = async (competency: Competency) => {
        await refresh();
        setSelectedCompetencyId(competency.id);
        setEditingId(null);
        setForm(emptyForm);
        setIsFormOpen(false);
    };
    const createMutation = useMutation({ mutationFn: competencyApi.create, onSuccess: finishSave });
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: CompetencyRequest }) =>
            competencyApi.update(id, payload),
        onSuccess: finishSave,
    });
    const deleteMutation = useMutation({
        mutationFn: competencyApi.remove,
        onSuccess: async (_data, deletedId) => {
            setSelectedCompetencyId(null);
            setSelectedCompetencyIds((prev) => prev.filter((id) => id !== deletedId));
            await refresh();
        },
    });

    const batchPublishMutation = useMutation({
        mutationFn: (ids: number[]) => competencyApi.batchPublish(ids),
        onSuccess: async () => {
            await refresh();
            setSelectedCompetencyIds([]);
        },
    });

    const batchUnpublishMutation = useMutation({
        mutationFn: (ids: number[]) => competencyApi.batchUnpublish(ids),
        onSuccess: async () => {
            await refresh();
            setSelectedCompetencyIds([]);
        },
    });

    const toggleVisibilityMutation = useMutation({
        mutationFn: (id: number) => competencyApi.toggleVisibility(id),
        onSuccess: async () => {
            await refresh();
        },
    });

    const toggleSelectCompetency = (id: number) => {
        setSelectedCompetencyIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAllFiltered = () => {
        const filteredIds = filteredCompetencies.map((c) => c.id);
        const allSelected = filteredIds.every((id) => selectedCompetencyIds.includes(id));
        if (allSelected) {
            setSelectedCompetencyIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
        } else {
            setSelectedCompetencyIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const selectedCompetencies = useMemo(
        () => competencies.filter((c) => selectedCompetencyIds.includes(c.id)),
        [competencies, selectedCompetencyIds]
    );
    const selectedHiddenIds = useMemo(
        () => selectedCompetencies.filter((c) => !c.visible).map((c) => c.id),
        [selectedCompetencies]
    );
    const selectedVisibleIds = useMemo(
        () => selectedCompetencies.filter((c) => c.visible).map((c) => c.id),
        [selectedCompetencies]
    );

    const handleBatchPublish = (ids: number[]) => {
        if (ids.length === 0) return;
        if (window.confirm(`선택한 ${ids.length}개의 핵심 역량을 모두 공개로 전환하시겠습니까?`)) {
            batchPublishMutation.mutate(ids);
        }
    };

    const handleBatchUnpublish = (ids: number[]) => {
        if (ids.length === 0) return;
        if (
            window.confirm(`선택한 ${ids.length}개의 핵심 역량을 모두 숨김으로 전환하시겠습니까?`)
        ) {
            batchUnpublishMutation.mutate(ids);
        }
    };

    const resetAiStream = () => {
        resetAiStreamBase();
        setAiEvidenceGroups([]);
    };

    const resetRelationSearches = () => {
        setSkillSearch('');
        setExperienceSearch('');
        setStudySearch('');
    };

    const openCreate = () => {
        setSelectedCompetencyId(null);
        setEditingId(null);
        setForm({ ...emptyForm, displayOrder: competencies.length + 1 });
        setAiInstruction('');
        setAiSuggestions([]);
        resetAiStream();
        resetRelationSearches();
        setIsFormOpen(true);
    };

    const openEdit = (competency: Competency) => {
        setSelectedCompetencyId(competency.id);
        setEditingId(competency.id);
        setForm({
            title: competency.title,
            summary: competency.summary,
            displayOrder: competency.displayOrder,
            visible: competency.visible,
            skillIds: competency.skills.map((skill) => skill.id),
            evidences: competency.evidences.map((evidence) => ({
                experienceId: evidence.experienceId,
                evidenceSummary: evidence.evidenceSummary ?? '',
                primary: evidence.primary,
                displayOrder: evidence.displayOrder,
            })),
            studyIds: competency.relatedStudies.map((study) => study.id),
        });
        setAiSuggestions([]);
        resetAiStream();
        resetRelationSearches();
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setEditingId(null);
        setForm(emptyForm);
        setAiSuggestions([]);
        resetAiStream();
        setIsFormOpen(false);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('이 핵심 역량을 삭제하시겠습니까?')) deleteMutation.mutate(id);
    };

    const toggleSkill = (id: number) => {
        setForm((current) => ({
            ...current,
            skillIds: current.skillIds.includes(id)
                ? current.skillIds.filter((value) => value !== id)
                : [...current.skillIds, id],
        }));
    };

    const toggleStudy = (id: number) => {
        setForm((current) => ({
            ...current,
            studyIds: current.studyIds.includes(id)
                ? current.studyIds.filter((value) => value !== id)
                : [...current.studyIds, id],
        }));
    };

    const toggleEvidence = (experienceId: number) => {
        setForm((current) => {
            const exists = current.evidences.some((item) => item.experienceId === experienceId);
            if (exists) {
                const remaining = current.evidences.filter(
                    (item) => item.experienceId !== experienceId
                );
                if (remaining.length > 0 && !remaining.some((item) => item.primary))
                    remaining[0] = { ...remaining[0], primary: true };
                return { ...current, evidences: remaining };
            }
            return {
                ...current,
                evidences: [
                    ...current.evidences,
                    {
                        experienceId,
                        evidenceSummary: '',
                        primary: current.evidences.length === 0,
                        displayOrder: current.evidences.length,
                    },
                ],
            };
        });
    };

    const setPrimaryEvidence = (experienceId: number) => {
        setForm((current) => ({
            ...current,
            evidences: current.evidences.map((item) => ({
                ...item,
                primary: item.experienceId === experienceId,
            })),
        }));
    };

    const setEvidenceSummary = (experienceId: number, evidenceSummary: string) => {
        setForm((current) => ({
            ...current,
            evidences: current.evidences.map((item) =>
                item.experienceId === experienceId ? { ...item, evidenceSummary } : item
            ),
        }));
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const payload = {
            ...form,
            evidences: form.evidences.map((item, index) => ({ ...item, displayOrder: index })),
        };
        if (editingId === null) createMutation.mutate(payload);
        else updateMutation.mutate({ id: editingId, payload });
    };

    const requestAiSuggestions = async () => {
        resetAiStream();
        setAiSuggestions([]);
        setIsGenerating(true);
        const controller = new AbortController();
        aiAbortRef.current = controller;
        try {
            await competencyApi.suggestStream(
                {
                    instruction: aiInstruction,
                    draftTitle: form.title,
                    draftSummary: form.summary,
                    skillIds: form.skillIds,
                    experienceIds: form.evidences.map((item) => item.experienceId),
                    studyIds: form.studyIds,
                },
                (event) => {
                    if (event.type === 'stage') {
                        pushStage(event.stage, event.message);
                    } else if (event.type === 'token') {
                        appendToken(event.stage, event.text);
                    } else if (event.type === 'evidence') {
                        setAiEvidenceGroups(event.groups);
                    } else if (event.type === 'complete') {
                        finishStages();
                        setAiSuggestions(event.suggestions);
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
            if (aiAbortRef.current === controller) {
                aiAbortRef.current = null;
                setIsGenerating(false);
            }
        }
    };

    const applyAiSuggestion = (suggestion: CompetencySuggestion) => {
        if (
            (form.title.trim() || form.summary.trim()) &&
            !window.confirm('현재 작성한 역량명과 설명을 AI 초안으로 바꾸시겠습니까?')
        )
            return;
        setForm((current) => ({
            ...current,
            title: suggestion.title,
            summary: suggestion.summary,
            skillIds: suggestion.skillIds,
            evidences: suggestion.evidences.map((evidence, index) => ({
                ...evidence,
                displayOrder: index,
            })),
            studyIds: suggestion.studyIds,
        }));
    };

    const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;
    const isSaving = createMutation.isPending || updateMutation.isPending;
    const showList = !isFormOpen && !selectedCompetency;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                        <Sparkles className="h-5 w-5" /> 핵심 역량 관리
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        공개 페이지에 표시할 역량과 실무·학습 근거를 직접 관리합니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                    <Plus className="h-4 w-4" /> 새 역량 작성
                </button>
            </div>

            {mutationError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {mutationError instanceof Error
                        ? mutationError.message
                        : '저장 중 오류가 발생했습니다.'}
                </p>
            )}

            {showList && (
                <>
                    <div className="sticky top-14 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ['ALL', `전체 ${counts.total}`],
                                    ['VISIBLE', `공개 ${counts.visible}`],
                                    ['HIDDEN', `숨김 ${counts.hidden}`],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setVisibilityFilter(value)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${visibilityFilter === value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={listSearch}
                                onChange={(event) => setListSearch(event.target.value)}
                                placeholder="역량명, 기술, 근거 검색..."
                                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(
                                        filteredCompetencies.length > 0 &&
                                        filteredCompetencies.every((c) =>
                                            selectedCompetencyIds.includes(c.id)
                                        )
                                    )}
                                    onChange={toggleSelectAllFiltered}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                />
                                현재 목록 전체 선택 ({filteredCompetencies.length}개 중{' '}
                                {selectedCompetencyIds.length}개 선택됨)
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {selectedCompetencyIds.length > 0 && (
                                <>
                                    {selectedHiddenIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleBatchPublish(selectedHiddenIds)}
                                            disabled={batchPublishMutation.isPending}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            {selectedVisibleIds.length > 0
                                                ? `선택한 숨김 ${selectedHiddenIds.length}개 일괄 공개`
                                                : `선택한 ${selectedHiddenIds.length}개 일괄 공개`}
                                        </button>
                                    )}
                                    {selectedVisibleIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleBatchUnpublish(selectedVisibleIds)}
                                            disabled={batchUnpublishMutation.isPending}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
                                        >
                                            <EyeOff className="h-3.5 w-3.5" />
                                            {selectedHiddenIds.length > 0
                                                ? `선택한 공개 ${selectedVisibleIds.length}개 일괄 숨김`
                                                : `선택한 ${selectedVisibleIds.length}개 일괄 숨김`}
                                        </button>
                                    )}
                                </>
                            )}
                            {selectedCompetencyIds.length === 0 &&
                                visibilityFilter === 'HIDDEN' &&
                                counts.hidden > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const hiddenIds = competencies
                                                .filter((item) => !item.visible)
                                                .map((item) => item.id);
                                            handleBatchPublish(hiddenIds);
                                        }}
                                        disabled={batchPublishMutation.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                        <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                        숨김 {counts.hidden}개 전체 일괄 공개
                                    </button>
                                )}
                            {selectedCompetencyIds.length === 0 &&
                                visibilityFilter === 'VISIBLE' &&
                                counts.visible > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const visibleIds = competencies
                                                .filter((item) => item.visible)
                                                .map((item) => item.id);
                                            handleBatchUnpublish(visibleIds);
                                        }}
                                        disabled={batchUnpublishMutation.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-200 disabled:opacity-50"
                                    >
                                        <EyeOff className="h-3.5 w-3.5 text-slate-600" />
                                        공개 {counts.visible}개 전체 일괄 숨김
                                    </button>
                                )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {isLoading && <p className="text-sm text-slate-400">불러오는 중...</p>}
                        {!isLoading && filteredCompetencies.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                                조건에 맞는 핵심 역량이 없습니다.
                            </p>
                        )}
                        {filteredCompetencies.map((competency) => {
                            const isSelected = selectedCompetencyIds.includes(competency.id);
                            return (
                                <article
                                    key={competency.id}
                                    className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm transition ${
                                        isSelected
                                            ? 'border-indigo-400 bg-indigo-50/20'
                                            : competency.visible
                                              ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                              : 'border-slate-200 bg-slate-50/70 opacity-80 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex shrink-0 items-center">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectCompetency(competency.id)}
                                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCompetencyId(competency.id)}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleVisibilityMutation.mutate(competency.id);
                                                }}
                                                title="클릭하여 공개/숨김 상태 전환"
                                                className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition hover:scale-105 ${
                                                    competency.visible
                                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                }`}
                                            >
                                                {competency.visible ? (
                                                    <Eye className="h-3 w-3" />
                                                ) : (
                                                    <EyeOff className="h-3 w-3" />
                                                )}
                                                {competency.visible ? '공개' : '숨김'}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">
                                                정렬 {competency.displayOrder}
                                            </span>
                                        </div>
                                        <h3
                                            className={`mt-2 font-black ${competency.visible ? 'text-slate-900' : 'text-slate-600'}`}
                                        >
                                            {competency.title}
                                        </h3>
                                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
                                            {competency.summary}
                                        </p>
                                        <p className="mt-2 text-xs font-semibold text-slate-400">
                                            기술 {competency.skills.length}개 · 실무 근거{' '}
                                            {competency.evidences.length}개 · 관련 Study{' '}
                                            {competency.relatedStudies.length}개
                                        </p>
                                    </button>
                                    <div className="flex shrink-0 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(competency)}
                                            aria-label={`${competency.title} 수정`}
                                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(competency.id)}
                                            aria-label={`${competency.title} 삭제`}
                                            className="grid h-9 w-9 place-items-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}

            {selectedCompetency && !isFormOpen && (
                <CompetencyDetailPanel
                    competency={selectedCompetency}
                    onBack={() => setSelectedCompetencyId(null)}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                />
            )}

            {isFormOpen && (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h3 className="font-black text-slate-900">
                        {editingId === null ? '새 핵심 역량 작성' : '핵심 역량 수정'}
                    </h3>

                    {editingId === null && (
                        <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
                                    <WandSparkles className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-violet-950">
                                        AI로 핵심 역량 초안 만들기
                                    </h4>
                                    <p className="mt-1 text-xs leading-relaxed text-violet-700">
                                        AI가 1단계에서 포트폴리오 근거를 추출하고, 2단계에서 검증된
                                        근거만 사용해 역량 초안을 작성합니다. 선택 항목이 없으면
                                        등록된 전체 데이터를 분석합니다.
                                    </p>
                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                        <textarea
                                            rows={2}
                                            maxLength={500}
                                            value={aiInstruction}
                                            onChange={(event) =>
                                                setAiInstruction(event.target.value)
                                            }
                                            placeholder="작성 방향을 입력하세요. 예: 동시성 처리와 안정적인 운영 경험 중심"
                                            className="min-h-[72px] flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={requestAiSuggestions}
                                            disabled={isGenerating}
                                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 sm:self-stretch"
                                        >
                                            <WandSparkles
                                                className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`}
                                            />
                                            {isGenerating
                                                ? '근거 분석·작성 중...'
                                                : aiSuggestions.length > 0
                                                  ? '다시 생성'
                                                  : 'AI 초안 생성'}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-[11px] leading-relaxed text-violet-500">
                                        선택한 포트폴리오 요약 데이터가 NVIDIA NIM API로 전송됩니다.
                                        AI 초안은 자동 저장되지 않습니다.
                                    </p>

                                    {(aiStages.length > 0 || aiError) && (
                                        <div
                                            ref={aiChatRef}
                                            className="mt-4 max-h-80 space-y-2.5 overflow-y-auto rounded-xl border border-violet-100 bg-white p-3"
                                        >
                                            {aiStages.map((stageItem) => (
                                                <AiStageBubble
                                                    key={stageItem.stage}
                                                    stage={stageItem}
                                                    fieldLabels={AI_FIELD_LABELS}
                                                    extra={
                                                        stageItem.stage === 1 &&
                                                        aiEvidenceGroups.length > 0 ? (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {aiEvidenceGroups.map((group) => (
                                                                    <span
                                                                        key={group.theme}
                                                                        className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700"
                                                                    >
                                                                        {group.theme} · 근거{' '}
                                                                        {group.evidenceCount}개 ·
                                                                        Study {group.studyCount}개
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : undefined
                                                    }
                                                />
                                            ))}
                                            {aiError && (
                                                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                                    {aiError}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {aiSuggestions.length > 0 && (
                                        <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                            {aiSuggestions.map((suggestion, index) => (
                                                <article
                                                    key={`${suggestion.title}-${index}`}
                                                    className="flex flex-col rounded-xl border border-violet-200 bg-white p-4 shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[11px] font-black uppercase tracking-wider text-violet-500">
                                                            후보 {index + 1}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            근거 {suggestion.evidences.length}개
                                                        </span>
                                                    </div>
                                                    <h5 className="mt-2 text-sm font-black leading-snug text-slate-900">
                                                        {suggestion.title}
                                                    </h5>
                                                    <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-slate-600">
                                                        {suggestion.summary}
                                                    </p>
                                                    {suggestion.reason && (
                                                        <p className="mt-3 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] leading-relaxed text-violet-700">
                                                            {suggestion.reason}
                                                        </p>
                                                    )}
                                                    <div className="mt-3 flex flex-wrap gap-1">
                                                        {suggestion.skillIds.map((id) => {
                                                            const skill = skills.find(
                                                                (item) => item.id === id
                                                            );
                                                            return skill ? (
                                                                <span
                                                                    key={id}
                                                                    className="rounded bg-blue-50 px-1.5 py-1 text-[10px] font-bold text-blue-700"
                                                                >
                                                                    {skill.name}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                    <div className="mt-auto pt-4">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                applyAiSuggestion(suggestion)
                                                            }
                                                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50"
                                                        >
                                                            <Check className="h-3.5 w-3.5" /> 이
                                                            초안 적용
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                        <FormField label="역량명">
                            <input
                                required
                                maxLength={120}
                                value={form.title}
                                onChange={(event) =>
                                    setForm({ ...form, title: event.target.value })
                                }
                                placeholder="예: 안정적인 백엔드 설계"
                                className={inputClassName}
                            />
                        </FormField>
                        <FormField label="정렬 순서">
                            <input
                                type="number"
                                value={form.displayOrder}
                                onChange={(event) =>
                                    setForm({ ...form, displayOrder: Number(event.target.value) })
                                }
                                className={inputClassName}
                            />
                        </FormField>
                    </div>
                    <FormField label="역량 설명">
                        <textarea
                            required
                            maxLength={500}
                            rows={4}
                            value={form.summary}
                            onChange={(event) => setForm({ ...form, summary: event.target.value })}
                            placeholder="이 역량을 설명하는 핵심 문장을 입력하세요."
                            className={inputClassName}
                        />
                    </FormField>
                    <FormField label="공개 상태">
                        <select
                            value={form.visible ? 'VISIBLE' : 'HIDDEN'}
                            onChange={(event) =>
                                setForm({ ...form, visible: event.target.value === 'VISIBLE' })
                            }
                            className={inputClassName}
                        >
                            <option value="VISIBLE">공개</option>
                            <option value="HIDDEN">숨김</option>
                        </select>
                    </FormField>

                    <SelectionSection
                        title={`기술 스택 (${form.skillIds.length})`}
                        search={skillSearch}
                        onSearch={setSkillSearch}
                        placeholder="기술 검색..."
                    >
                        {filteredSkills.map((skill) => (
                            <CheckItem
                                key={skill.id}
                                checked={form.skillIds.includes(skill.id)}
                                onChange={() => toggleSkill(skill.id)}
                                label={skill.name}
                                meta={skill.category}
                            />
                        ))}
                    </SelectionSection>

                    <SelectionSection
                        title={`실무 근거 (${form.evidences.length})`}
                        search={experienceSearch}
                        onSearch={setExperienceSearch}
                        placeholder="경력·프로젝트 검색..."
                    >
                        {selectableExperiences.map((experience) => {
                            const evidence = form.evidences.find(
                                (item) => item.experienceId === experience.id
                            );
                            return (
                                <div key={experience.id}>
                                    <CheckItem
                                        checked={Boolean(evidence)}
                                        onChange={() => toggleEvidence(experience.id)}
                                        label={experience.title}
                                        meta={experience.type === 'CAREER' ? '경력' : '프로젝트'}
                                    />
                                    {evidence && (
                                        <div className="ml-6 mr-2 space-y-2 rounded-b-xl border-x border-b border-slate-200 bg-slate-50 p-3">
                                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
                                                <input
                                                    type="radio"
                                                    name="primary-evidence"
                                                    checked={evidence.primary}
                                                    onChange={() =>
                                                        setPrimaryEvidence(experience.id)
                                                    }
                                                />{' '}
                                                대표 실무 근거로 지정
                                            </label>
                                            <textarea
                                                rows={2}
                                                maxLength={700}
                                                value={evidence.evidenceSummary ?? ''}
                                                onChange={(event) =>
                                                    setEvidenceSummary(
                                                        experience.id,
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="비워두면 해당 경력의 성과 또는 요약을 사용합니다."
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </SelectionSection>

                    <SelectionSection
                        title={`관련 Study (${form.studyIds.length})`}
                        search={studySearch}
                        onSearch={setStudySearch}
                        placeholder="Study 검색..."
                    >
                        {filteredStudies.map((study) => (
                            <CheckItem
                                key={study.id}
                                checked={form.studyIds.includes(study.id)}
                                onChange={() => toggleStudy(study.id)}
                                label={study.title}
                                meta={study.status}
                            />
                        ))}
                    </SelectionSection>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={closeForm}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />{' '}
                            {isSaving ? '저장 중...' : editingId === null ? '등록' : '수정 저장'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

function FormField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                {label}
            </span>
            {children}
        </label>
    );
}

function SelectionSection({
    title,
    search,
    onSearch,
    placeholder,
    children,
}: {
    title: string;
    search: string;
    onSearch: (value: string) => void;
    placeholder: string;
    children: ReactNode;
}) {
    return (
        <section>
            <h4 className="mb-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                {title}
            </h4>
            <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => onSearch(event.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
            </div>
            <div className="max-h-52 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
                {children}
            </div>
        </section>
    );
}

function CheckItem({
    checked,
    onChange,
    label,
    meta,
}: {
    checked: boolean;
    onChange: () => void;
    label: string;
    meta?: string;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
            />
            <span className="min-w-0 flex-1">
                <span className="block font-bold">{label}</span>
                {meta && (
                    <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                        {meta}
                    </span>
                )}
            </span>
        </label>
    );
}
