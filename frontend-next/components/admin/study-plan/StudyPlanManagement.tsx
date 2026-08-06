'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CalendarCheck,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    Loader2,
    Lock,
    LockOpen,
    Plus,
    Sparkles,
    X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { adminDetailMarkdownComponents } from '@/lib/markdown';
import { ApiError, learningResourceApi, studyPlanApi } from '@/lib/api';
import type { StudyPlan, StudyPlanCandidate, StudyPlanItem, StudyPlanStage } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useAiModelStore } from '@/store/useAiModelStore';
import { AiModelUsageBadge } from '@/components/admin/AiModelUsageBadge';
import { useSlideDrawer } from '@/lib/hooks/useSlideDrawer';
import { LearningResourceDetailPanel } from '@/components/admin/learning-resource/LearningResourceDetailPanel';

export function StudyPlanManagement() {
    const queryClient = useQueryClient();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const aiModel = useAiModelStore((s) => s.modelKey);
    const aiCustomModelName = useAiModelStore((s) => s.customModelName);
    const handleMutationError = (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) setUnauthenticated();
    };
    const alertError = (error: unknown, fallback: string) => {
        handleMutationError(error);
        alert(error instanceof ApiError ? error.message : fallback);
    };

    // undefined = 아직 아무것도 선택 안 함(불러와지면 최신 계획 자동 선택) / null = "새 계획" 버튼으로
    // 명시적으로 선택 해제한 상태(목록이 있어도 자동 선택하지 않음) / number = 명시적으로 고른 계획.
    const [selectedId, setSelectedId] = useState<number | null | undefined>(undefined);
    const [weeklyAvailableMinutes, setWeeklyAvailableMinutes] = useState(300);
    const [focusGoal, setFocusGoal] = useState('');
    const [feedback, setFeedback] = useState('');
    const [expandedItemIds, setExpandedItemIds] = useState<Set<number>>(new Set());
    const [revealedQuestionIds, setRevealedQuestionIds] = useState<Set<number>>(new Set());
    const [drawerResourceId, setDrawerResourceId] = useState<number | null>(null);

    const { data: summaries } = useQuery({
        queryKey: ['studyPlans'],
        queryFn: () => studyPlanApi.list(),
    });

    const effectiveSelectedId =
        selectedId === undefined
            ? summaries && summaries.length > 0
                ? summaries[0].id
                : null
            : selectedId;

    const { data: plan, isLoading: isPlanLoading } = useQuery({
        queryKey: ['studyPlan', effectiveSelectedId],
        queryFn: () => studyPlanApi.get(effectiveSelectedId as number),
        enabled: effectiveSelectedId != null,
    });

    const setPlanCache = (updated: StudyPlan) => {
        queryClient.setQueryData(['studyPlan', updated.id], updated);
        queryClient.invalidateQueries({ queryKey: ['studyPlans'] });
    };

    const createMutation = useMutation({
        mutationFn: () =>
            studyPlanApi.create({
                weeklyAvailableMinutes,
                focusGoal: focusGoal.trim() || undefined,
            }),
        onSuccess: (created) => {
            setPlanCache(created);
            setSelectedId(created.id);
            setFocusGoal('');
        },
        onError: (error) => alertError(error, '학습 계획 생성에 실패했습니다.'),
    });

    const sendMessageMutation = useMutation({
        mutationFn: (content: string) =>
            studyPlanApi.sendMessage(
                effectiveSelectedId as number,
                content,
                aiModel,
                aiCustomModelName || undefined
            ),
        onSuccess: (updated) => {
            setPlanCache(updated);
            setFeedback('');
        },
        onError: (error) => alertError(error, '피드백 반영에 실패했습니다.'),
    });

    const generateMutation = useMutation({
        mutationFn: () =>
            studyPlanApi.generate(
                effectiveSelectedId as number,
                aiModel,
                aiCustomModelName || undefined
            ),
        onSuccess: setPlanCache,
        onError: (error) => alertError(error, '계획 생성에 실패했습니다.'),
    });

    const confirmMutation = useMutation({
        mutationFn: () => studyPlanApi.confirm(effectiveSelectedId as number),
        onSuccess: setPlanCache,
        onError: (error) => alertError(error, '계획 확정에 실패했습니다.'),
    });

    const unconfirmMutation = useMutation({
        mutationFn: () => studyPlanApi.unconfirm(effectiveSelectedId as number),
        onSuccess: setPlanCache,
        onError: (error) => alertError(error, '잠금 해제에 실패했습니다.'),
    });

    const toggleCompletedMutation = useMutation({
        mutationFn: (itemId: number) =>
            studyPlanApi.toggleCompleted(effectiveSelectedId as number, itemId),
        onSuccess: setPlanCache,
        onError: (error) => alertError(error, '완료 체크에 실패했습니다.'),
    });

    const toggleUnderstandingMutation = useMutation({
        mutationFn: (itemId: number) =>
            studyPlanApi.toggleUnderstanding(effectiveSelectedId as number, itemId),
        onSuccess: setPlanCache,
        onError: (error) => alertError(error, '이해도 점검 체크에 실패했습니다.'),
    });

    const toggleCandidateMutation = useMutation({
        mutationFn: (resourceId: number) =>
            studyPlanApi.toggleCandidateSelected(effectiveSelectedId as number, resourceId),
        onSuccess: setPlanCache,
        onError: (error) => alertError(error, '후보 선택 변경에 실패했습니다.'),
    });

    const setCategorySelectedMutation = useMutation({
        mutationFn: ({ category, selected }: { category: string; selected: boolean }) =>
            studyPlanApi.setCategorySelected(effectiveSelectedId as number, category, selected),
        onSuccess: setPlanCache,
        onError: (error) => alertError(error, '카테고리 일괄 선택에 실패했습니다.'),
    });

    const toggleItemExpanded = (itemId: number) => {
        setExpandedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const toggleHintRevealed = (questionId: number) => {
        setRevealedQuestionIds((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });
    };

    const startNewPlan = () => {
        setSelectedId(null);
        setFocusGoal('');
    };

    const isCollecting = plan?.status === 'COLLECTING';
    const isConfirmed = plan?.status === 'CONFIRMED';

    // Stage들을 레벨(stageOrder) 기준으로 묶는다 — 같은 레벨의 Stage 여러 개는 서로 독립적인
    // 병렬 트랙이라는 뜻이고, 레벨이 다른 그룹끼리만 순차적으로 진행한다.
    const stageLevels = useMemo(() => {
        if (!plan) return [];
        const map = new Map<number, StudyPlanStage[]>();
        for (const stage of plan.stages) {
            const list = map.get(stage.stageOrder) ?? [];
            list.push(stage);
            map.set(stage.stageOrder, list);
        }
        return [...map.entries()].sort(([a], [b]) => a - b);
    }, [plan]);

    // 후보를 카테고리별로 묶는다 — 처음 등장한 순서를 그대로 유지한다.
    const candidatesByCategory = useMemo(() => {
        if (!plan) return [];
        const map = new Map<string, StudyPlanCandidate[]>();
        for (const candidate of plan.candidates) {
            const list = map.get(candidate.category) ?? [];
            list.push(candidate);
            map.set(candidate.category, list);
        }
        return [...map.entries()];
    }, [plan]);

    const selectedCandidateCount = plan?.candidates.filter((c) => c.selected).length ?? 0;

    const closeDrawer = () => setDrawerResourceId(null);
    const drawerAnim = useSlideDrawer(drawerResourceId !== null);
    const { data: drawerResource } = useQuery({
        queryKey: ['learningResource', drawerResourceId],
        queryFn: () => learningResourceApi.get(drawerResourceId as number),
        enabled: drawerResourceId != null,
    });
    const notEditableHere = () => alert('자료 수정/삭제는 "학습 자료 관리" 화면에서 해주세요.');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <h2 className="text-xl font-black text-slate-950">AI 학습 계획</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        수집한 학습 자료를 순서와 병렬 진행 가능 여부에 맞춰 테마 단계로 묶은 계획을
                        AI와 대화하며 다듬습니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {summaries && summaries.length > 0 && (
                        <select
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={effectiveSelectedId ?? ''}
                            onChange={(e) => setSelectedId(Number(e.target.value))}
                        >
                            {summaries.map((summary) => (
                                <option key={summary.id} value={summary.id}>
                                    {summary.focusGoal || `계획 #${summary.id}`} (
                                    {summary.status === 'CONFIRMED'
                                        ? '확정'
                                        : summary.status === 'COLLECTING'
                                          ? '자료 수집 중'
                                          : '초안'}
                                    )
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={startNewPlan}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                        <Plus className="h-4 w-4" />새 계획
                    </button>
                </div>
            </div>

            {effectiveSelectedId == null ? (
                <div className="max-w-xl space-y-4 rounded-2xl border border-slate-200 p-5">
                    <div>
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                            주당 가용 시간(분)
                        </label>
                        <input
                            type="number"
                            min={1}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={weeklyAvailableMinutes}
                            onChange={(e) => setWeeklyAvailableMinutes(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                            목표/집중 방향 (선택)
                        </label>
                        <textarea
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            rows={3}
                            placeholder="예: 백엔드 심화, 신기술 학습 위주로"
                            value={focusGoal}
                            onChange={(e) => setFocusGoal(e.target.value)}
                        />
                    </div>
                    <button
                        disabled={createMutation.isPending || weeklyAvailableMinutes < 1}
                        onClick={() => createMutation.mutate()}
                        className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {createMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4" />
                        )}
                        {createMutation.isPending ? '자료 찾는 중...' : '학습 자료 찾기'}
                    </button>
                </div>
            ) : isPlanLoading || !plan ? (
                <p className="text-sm text-slate-500">불러오는 중...</p>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                    <div className="space-y-4">
                        {isCollecting ? (
                            <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-base font-extrabold text-slate-900">
                                        후보 학습 자료 (선택 {selectedCandidateCount}/
                                        {plan.candidates.length}개)
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <AiModelUsageBadge />
                                        <button
                                            disabled={
                                                generateMutation.isPending ||
                                                selectedCandidateCount === 0
                                            }
                                            onClick={() => generateMutation.mutate()}
                                            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {generateMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="h-4 w-4" />
                                            )}
                                            {generateMutation.isPending
                                                ? '생성 중...'
                                                : '이 자료들로 계획 생성'}
                                        </button>
                                    </div>
                                </div>
                                {plan.candidates.length === 0 ? (
                                    <p className="text-sm text-slate-500">
                                        조건에 맞는 학습 자료를 찾지 못했어요. 오른쪽 채팅으로 다른
                                        키워드를 알려주세요.
                                    </p>
                                ) : (
                                    <div className="max-h-[55vh] space-y-3 overflow-y-auto">
                                        {candidatesByCategory.map(([category, list]) => {
                                            const allSelected = list.every((c) => c.selected);
                                            return (
                                                <div key={category}>
                                                    <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-1 pb-1 text-xs font-black text-slate-500">
                                                        <input
                                                            type="checkbox"
                                                            checked={allSelected}
                                                            onChange={() =>
                                                                setCategorySelectedMutation.mutate({
                                                                    category,
                                                                    selected: !allSelected,
                                                                })
                                                            }
                                                        />
                                                        {category} (
                                                        {list.filter((c) => c.selected).length}/
                                                        {list.length})
                                                    </label>
                                                    <ul className="mt-1 space-y-0.5">
                                                        {list.map((candidate) => (
                                                            <li
                                                                key={candidate.id}
                                                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={candidate.selected}
                                                                    onChange={() =>
                                                                        toggleCandidateMutation.mutate(
                                                                            candidate.id
                                                                        )
                                                                    }
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDrawerResourceId(
                                                                            candidate.id
                                                                        )
                                                                    }
                                                                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                                                                >
                                                                    <span className="truncate font-bold text-slate-700">
                                                                        {candidate.title}
                                                                    </span>
                                                                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
                                                                        {candidate.familiar && (
                                                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                                                                                이미 아는 개념
                                                                            </span>
                                                                        )}
                                                                        {candidate.durationMinutes
                                                                            ? `${candidate.durationMinutes}분`
                                                                            : ''}
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            stageLevels.map(([order, stagesAtLevel]) => (
                                <div key={order} className="space-y-2">
                                    <div className="flex items-center gap-2 px-1">
                                        <span className="text-xs font-black text-slate-400">
                                            {order}단계
                                        </span>
                                        {stagesAtLevel.length > 1 && (
                                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                                                병렬로 진행 가능
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className={
                                            stagesAtLevel.length > 1
                                                ? 'grid gap-4 sm:grid-cols-2'
                                                : undefined
                                        }
                                    >
                                        {stagesAtLevel.map((stage) => (
                                            <div
                                                key={stage.id}
                                                className="rounded-2xl border border-slate-200 p-4"
                                            >
                                                <div className="mb-2 flex items-center justify-between">
                                                    <h3 className="text-base font-extrabold text-slate-900">
                                                        {stage.theme}
                                                    </h3>
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                                        {stage.estimatedDurationLabel}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {stage.items.map((item) => (
                                                        <StudyPlanItemRow
                                                            key={item.id}
                                                            item={item}
                                                            expanded={expandedItemIds.has(item.id)}
                                                            onToggleExpanded={() =>
                                                                toggleItemExpanded(item.id)
                                                            }
                                                            revealedQuestionIds={
                                                                revealedQuestionIds
                                                            }
                                                            onToggleHint={toggleHintRevealed}
                                                            onToggleCompleted={() =>
                                                                toggleCompletedMutation.mutate(
                                                                    item.id
                                                                )
                                                            }
                                                            onToggleUnderstanding={() =>
                                                                toggleUnderstandingMutation.mutate(
                                                                    item.id
                                                                )
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-1 text-base font-extrabold text-slate-900">
                                <CalendarCheck className="h-4 w-4" />
                                {isCollecting ? '대화로 자료 좁히기' : '대화로 계획 다듬기'}
                            </h3>
                            {!isCollecting &&
                                (isConfirmed ? (
                                    <button
                                        disabled={unconfirmMutation.isPending}
                                        onClick={() => unconfirmMutation.mutate()}
                                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        <LockOpen className="h-3.5 w-3.5" />
                                        잠금 해제
                                    </button>
                                ) : (
                                    <button
                                        disabled={confirmMutation.isPending}
                                        onClick={() => confirmMutation.mutate()}
                                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                    >
                                        <Lock className="h-3.5 w-3.5" />
                                        계획 확정
                                    </button>
                                ))}
                        </div>

                        <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3">
                            {plan.messages.map((message) => (
                                <div key={message.id}>
                                    {message.role === 'USER' ? (
                                        <p className="text-right text-sm text-slate-700">
                                            {message.content}
                                        </p>
                                    ) : (
                                        <div className="markdown-body text-sm text-slate-700">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={adminDetailMarkdownComponents}
                                            >
                                                {message.content.replace(/\\n/g, '\n')}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {isConfirmed ? (
                            <p className="text-xs text-slate-400">
                                확정된 계획입니다. 잠금 해제 후 다시 피드백을 보낼 수 있어요.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <textarea
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    rows={3}
                                    placeholder={
                                        isCollecting
                                            ? '예: 프론트엔드 자료는 빼줘, 책도 넣어줘'
                                            : '예: 3단계에 너무 몰림, 분산시켜줘'
                                    }
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                                <div className="flex items-center justify-end gap-2">
                                    {/* 후보 좁히기(수집) 단계는 이 모델 설정을 안 쓰고 고정 모델로
                                        키워드만 뽑는다 — 계획을 실제로 다시 짤 때만 보여준다. */}
                                    {!isCollecting && <AiModelUsageBadge />}
                                    <button
                                        disabled={sendMessageMutation.isPending || !feedback.trim()}
                                        onClick={() => sendMessageMutation.mutate(feedback.trim())}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {sendMessageMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-4 w-4" />
                                        )}
                                        {sendMessageMutation.isPending
                                            ? '반영 중...'
                                            : '피드백 보내기'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {drawerAnim.shouldRender &&
                createPortal(
                    <div className="fixed inset-0 z-40 flex justify-end">
                        <div
                            className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-300 ease-out ${drawerAnim.isVisible ? 'opacity-100' : 'opacity-0'}`}
                            onClick={closeDrawer}
                            aria-hidden
                        />
                        <div
                            className={`relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out ${drawerAnim.isVisible ? 'translate-x-0' : 'translate-x-full'}`}
                        >
                            {drawerResource ? (
                                <div className="p-4">
                                    <LearningResourceDetailPanel
                                        resource={drawerResource}
                                        backLabel="닫기"
                                        onBack={closeDrawer}
                                        onEdit={notEditableHere}
                                        onDelete={notEditableHere}
                                        onSelectResource={(id) => setDrawerResourceId(id)}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-1 items-center justify-end p-4">
                                    <button
                                        type="button"
                                        onClick={closeDrawer}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

function StudyPlanItemRow({
    item,
    expanded,
    onToggleExpanded,
    revealedQuestionIds,
    onToggleHint,
    onToggleCompleted,
    onToggleUnderstanding,
}: {
    item: StudyPlanItem;
    expanded: boolean;
    onToggleExpanded: () => void;
    revealedQuestionIds: Set<number>;
    onToggleHint: (questionId: number) => void;
    onToggleCompleted: () => void;
    onToggleUnderstanding: () => void;
}) {
    const label = item.resourceTitle ?? item.freeTextLabel ?? '삭제된 자료';
    const hasQuestions = item.checkQuestions.length > 0;

    return (
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500">
                        {item.allocatedMinutes}분{item.notes ? ` · ${item.notes}` : ''}
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={onToggleCompleted}
                        />
                        학습 완료
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <input
                            type="checkbox"
                            checked={item.understandingChecked}
                            onChange={onToggleUnderstanding}
                        />
                        이해도 점검 완료
                    </label>
                </div>
            </div>
            {hasQuestions && (
                <div className="mt-2">
                    <button
                        onClick={onToggleExpanded}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                        {expanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        이해도 점검 질문 {item.checkQuestions.length}개
                    </button>
                    {expanded && (
                        <ul className="mt-2 space-y-2">
                            {item.checkQuestions.map((question) => (
                                <li
                                    key={question.id}
                                    className="rounded-lg bg-white p-2 text-xs text-slate-600"
                                >
                                    <p className="font-bold text-slate-700">{question.question}</p>
                                    {question.modelAnswerHint && (
                                        <button
                                            onClick={() => onToggleHint(question.id)}
                                            className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-600"
                                        >
                                            <Lightbulb className="h-3 w-3" />
                                            {revealedQuestionIds.has(question.id)
                                                ? question.modelAnswerHint
                                                : '모범답안 힌트 보기'}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
