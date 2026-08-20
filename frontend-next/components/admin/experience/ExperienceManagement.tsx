'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    Briefcase,
    Check,
    ChevronDown,
    ChevronUp,
    GripVertical,
    ListChecks,
    MinusCircle,
    Pencil,
    Plus,
    PlusCircle,
    RefreshCw,
    Search,
    Trash2,
    WandSparkles,
    Wrench,
} from 'lucide-react';
import {
    ApiError,
    studyApi,
    skillApi,
    experienceApi,
    experiencePlacementApi,
    connectionApi,
} from '@/lib/api';
import { credentialKindLabel } from '@/lib/format';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import type {
    Experience,
    ExperienceConnections,
    ExperienceDetailRequest,
    ExperienceDetailSuggestion,
    ExperienceRequest,
    ExperienceSuggestion,
    GalleryImage,
} from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { ImageGalleryEditor } from '../shared/ImageGalleryEditor';
import { MarkdownEditor } from '../shared/MarkdownEditor';
import type { PendingExperienceIntent } from '../AdminDashboardShell';
import { ExperienceDetailPanel } from './ExperienceDetailPanel';
import { AiStageBubble, useAiSuggestionStream } from '../ai/AiDraftAssistant';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';
import { useTouchDrag } from '@/hooks/useTouchDrag';

const skillUsageOptions = [
    { value: 'LEARNING', label: '학습' },
    { value: 'WORK_EXPERIENCE', label: '실무 경험' },
    { value: 'PROJECT_USE', label: '프로젝트 활용' },
];

const EXPERIENCE_AI_FIELD_LABELS: Record<string, string> = {
    text: '사실',
    reason: '판단',
    summary: '요약',
    takeaway: '배운 점',
    content: '상세 항목',
    situation: '상황',
    actionDetail: '행동',
    outcome: '성과',
};

type AdminExperienceDetailForm = ExperienceDetailRequest & { studyIds: number[] };

export type AdminExperienceForm = Omit<ExperienceRequest, 'details' | 'tagNames' | 'images'> & {
    details: AdminExperienceDetailForm[];
    tagNames: string;
    images: GalleryImage[];
    studyIds: number[];
    relatedExperienceIds: number[];
    childProjectIds: number[];
};

const emptyExperienceForm: AdminExperienceForm = {
    type: 'PROJECT',
    title: '',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: '',
    summary: '',
    takeaway: '',
    displayOrder: 0,
    // Legacy compatibility fields. Public placement is configured in Public Page composition.
    showOnTimeline: false,
    timelineLabel: '',
    details: [],
    skillIds: [],
    tagNames: '',
    images: [],
    companyName: '',
    employmentType: '정규직',
    department: '',
    role: '',
    slug: '',
    contributionRate: 100,
    repositoryUrl: '',
    careerId: undefined,
    institutionName: '',
    educationType: 'ACADEMIC',
    degree: '학사',
    major: '',
    gpa: '',
    graduationStatus: 'GRADUATED',
    issuer: '',
    studyIds: [],
    relatedExperienceIds: [],
    childProjectIds: [],
};

export function ExperienceManagement({
    workspaceSlug,
    enableWorkspaceAi,
    pendingIntent,
    onConsumeIntent,
}: {
    workspaceSlug: string;
    enableWorkspaceAi: boolean;
    pendingIntent: PendingExperienceIntent;
    onConsumeIntent: () => void;
}) {
    const queryClient = useQueryClient();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const handleMutationError = (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) setUnauthenticated();
    };

    const { data: experiencesList } = useQuery({
        queryKey: ['experiences', workspaceSlug],
        queryFn: () => experienceApi.workspaceList(workspaceSlug),
    });
    const { data: studyPage } = useQuery({
        queryKey: ['studies', 'workspace', workspaceSlug],
        queryFn: () => studyApi.workspaceAdminList(workspaceSlug),
    });
    const studies = studyPage?.content;
    const { data: skillsList } = useQuery({
        queryKey: ['skills', workspaceSlug],
        queryFn: () => skillApi.workspaceList(workspaceSlug),
    });

    const [expFilter, setExpFilter] = useState('ALL');
    const [expSearch, setExpSearch] = useState('');
    const [expSkillSearch, setExpSkillSearch] = useState('');
    const [detailSkillSearch, setDetailSkillSearch] = useState('');
    const [detailStudySearch, setDetailStudySearch] = useState('');
    const [expStudySearch, setExpStudySearch] = useState('');
    const [expRelatedSearch, setExpRelatedSearch] = useState('');
    const [expChildProjectSearch, setExpChildProjectSearch] = useState('');

    const reorderMutation = useMutation({
        mutationFn: (orderedIds: number[]) =>
            experienceApi.workspaceReorder(workspaceSlug, orderedIds),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['experiences'] }),
        onError: handleMutationError,
    });

    const [expEditingId, setExpEditingId] = useState<number | null>(null);
    const [expForm, setExpForm] = useState<AdminExperienceForm>(emptyExperienceForm);
    const [isExpFormOpen, setIsExpFormOpen] = useState(false);
    const [createAsCoreProject, setCreateAsCoreProject] = useState(false);
    const [detailInput, setDetailInput] = useState('');
    const [detailListSearch, setDetailListSearch] = useState('');
    const [selectedExperienceId, setSelectedExperienceId] = useState<number | null>(null);
    const [parentExperienceId, setParentExperienceId] = useState<number | null>(null);
    const [expandedDetailIdx, setExpandedDetailIdx] = useState<number | null>(null);
    const [isNarrativeGenerating, setIsNarrativeGenerating] = useState(false);
    const [narrativeError, setNarrativeError] = useState<string | null>(null);
    const [expAiInstruction, setExpAiInstruction] = useState('');
    const [expAiSuggestions, setExpAiSuggestions] = useState<ExperienceSuggestion[]>([]);
    const [expAiFactCount, setExpAiFactCount] = useState(0);
    const {
        aiStages: expAiStages,
        aiError: expAiError,
        setAiError: setExpAiError,
        isGenerating: isExpAiGenerating,
        setIsGenerating: setIsExpAiGenerating,
        abortRef: expAiAbortRef,
        chatRef: expAiChatRef,
        reset: resetExpAiStreamBase,
        pushStage: pushExpAiStage,
        appendToken: appendExpAiToken,
        finishStages: finishExpAiStages,
    } = useAiSuggestionStream();
    const resetExpAiStream = () => {
        resetExpAiStreamBase();
        setExpAiFactCount(0);
    };
    const setExperienceDraft = useAdminPreviewStore((s) => s.setExperienceDraft);

    // 라이브 프리뷰 패널이 저장 전 초안을 메인페이지 경력/프로젝트 영역에 반영할 수 있도록 발행한다.
    useEffect(() => {
        setExperienceDraft(isExpFormOpen ? { editingId: expEditingId, form: expForm } : null);
        return () => setExperienceDraft(null);
    }, [isExpFormOpen, expEditingId, expForm, setExperienceDraft]);

    // CORE_PROJECTS 탭에서 "새 프로젝트 등록"으로 넘어온 경우, 실험 목록이 로드된 뒤 폼을 자동으로 연다.
    useEffect(() => {
        if (!pendingIntent || !experiencesList) return;
        const nextDisplayOrder =
            Math.max(-1, ...experiencesList.map((experience) => experience.displayOrder)) + 1;
        // 외부 탭에서 전달된 일회성 생성 intent를 편집 폼 상태로 소비한다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedExperienceId(null);
        setExpEditingId(null);
        setExpForm({ ...emptyExperienceForm, type: 'PROJECT', displayOrder: nextDisplayOrder });
        setExpAiInstruction('');
        setExpAiSuggestions([]);
        resetExpAiStream();
        setCreateAsCoreProject(true);
        setIsExpFormOpen(true);
        onConsumeIntent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingIntent, experiencesList]);

    const selectedExperience =
        experiencesList?.find((experience) => experience.id === selectedExperienceId) ?? null;

    const counts = useMemo(() => {
        const list = (experiencesList ?? []).filter((item) => {
            const matchesType = expFilter === 'ALL' || item.type === expFilter;
            const matchesSearch =
                !expSearch ||
                item.title.toLowerCase().includes(expSearch.toLowerCase()) ||
                (item.summary && item.summary.toLowerCase().includes(expSearch.toLowerCase()));
            return matchesType && matchesSearch;
        });
        return { all: list.length };
    }, [experiencesList, expFilter, expSearch]);

    const sortedExperiences = useMemo(() => {
        return [...(experiencesList ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    }, [experiencesList]);

    const filteredExperiences = useMemo(() => {
        return sortedExperiences.filter((exp) => {
            const matchesType =
                expFilter === 'ALL' ||
                (expFilter === 'ACADEMIC'
                    ? exp.type === 'EDUCATION' &&
                      (exp.educationType === 'ACADEMIC' ||
                          (!exp.educationType && credentialKindLabel(exp) === '학력'))
                    : expFilter === 'COURSE'
                      ? exp.type === 'EDUCATION' &&
                        (exp.educationType === 'COURSE' ||
                            (!exp.educationType && credentialKindLabel(exp) === '교육'))
                      : exp.type === expFilter);
            const matchesSearch =
                !expSearch ||
                exp.title.toLowerCase().includes(expSearch.toLowerCase()) ||
                (exp.summary && exp.summary.toLowerCase().includes(expSearch.toLowerCase()));
            return matchesType && matchesSearch;
        });
    }, [sortedExperiences, expFilter, expSearch]);

    const handleMove = (id: number, direction: 'UP' | 'DOWN') => {
        const index = sortedExperiences.findIndex((item) => item.id === id);
        if (index === -1) return;
        const targetIndex = direction === 'UP' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sortedExperiences.length) return;

        const reordered = [...sortedExperiences];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);

        reorderMutation.mutate(reordered.map((item) => item.id));
    };

    const selectableExpSkills = (() => {
        const keyword = expSkillSearch.trim().toLowerCase();
        if (!keyword) return skillsList ?? [];
        return (skillsList ?? []).filter(
            (skill) =>
                skill.name.toLowerCase().includes(keyword) ||
                skill.category.toLowerCase().includes(keyword)
        );
    })();

    const selectableDetailSkills = (() => {
        const keyword = detailSkillSearch.trim().toLowerCase();
        if (!keyword) return skillsList ?? [];
        return (skillsList ?? []).filter(
            (skill) =>
                skill.name.toLowerCase().includes(keyword) ||
                skill.category.toLowerCase().includes(keyword)
        );
    })();

    const selectableDetailStudies = (() => {
        const keyword = detailStudySearch.trim().toLowerCase();
        return (studies ?? []).filter(
            (study) => !keyword || study.title.toLowerCase().includes(keyword)
        );
    })();

    const selectableExpStudies = (studies ?? []).filter(
        (study) =>
            !expStudySearch || study.title.toLowerCase().includes(expStudySearch.toLowerCase())
    );

    const selectableRelatedExperiences = (experiencesList ?? []).filter(
        (experience) =>
            experience.id !== expEditingId &&
            (!expRelatedSearch ||
                experience.title.toLowerCase().includes(expRelatedSearch.toLowerCase()) ||
                experience.type.toLowerCase().includes(expRelatedSearch.toLowerCase()))
    );

    const buildExperienceConnections = (
        saved: Experience,
        form: AdminExperienceForm
    ): ExperienceConnections => ({
        studyIds: form.studyIds,
        detailStudies: saved.details.map((detail, index) => ({
            detailId: detail.id,
            studyIds: form.details[index]?.studyIds ?? [],
        })),
        relatedExperiences: form.relatedExperienceIds.map((experienceId) => ({
            experienceId,
            type: 'RELATED' as const,
        })),
    });

    const syncChildProjectsForCareer = async (
        careerId: number,
        childProjectIds: number[],
        currentList: Experience[]
    ) => {
        const projects = currentList.filter((item) => item.type === 'PROJECT');
        for (const proj of projects) {
            const isSelected = childProjectIds.includes(proj.id);
            const isCurrentlyLinked = proj.careerId === careerId;
            if (isSelected === isCurrentlyLinked) continue;

            await experienceApi.workspaceUpdate(workspaceSlug, proj.id, {
                type: proj.type,
                title: proj.title,
                periodStart: proj.periodStart,
                periodEnd: proj.periodEnd ?? null,
                summary: proj.summary ?? '',
                takeaway: proj.takeaway ?? '',
                displayOrder: proj.displayOrder,
                showOnTimeline: proj.showOnTimeline,
                timelineLabel: proj.timelineLabel ?? undefined,
                details: (proj.details ?? []).map((detail) => ({
                    id: detail.id,
                    content: detail.content,
                    situation: detail.situation ?? '',
                    actionDetail: detail.actionDetail ?? '',
                    outcome: detail.outcome ?? '',
                    narrative: detail.narrative ?? '',
                    skillIds: detail.skills?.map((s) => s.id) ?? [],
                })),
                skillIds: proj.skills?.map((s) => s.id) ?? [],
                tagNames: proj.tags?.map((t) => t.name) ?? [],
                images:
                    proj.images?.map((img) => ({
                        id: img.id,
                        objectKey: img.objectKey,
                        displayOrder: img.displayOrder,
                    })) ?? [],
                role: proj.role ?? undefined,
                slug: proj.slug ?? undefined,
                contributionRate: proj.contributionRate ?? undefined,
                repositoryUrl: proj.repositoryUrl ?? undefined,
                careerId: isSelected ? careerId : undefined,
            });
        }
    };

    const createExpMutation = useMutation({
        mutationFn: async ({
            payload,
            form,
            addToCoreProjects,
        }: {
            payload: ExperienceRequest;
            form: AdminExperienceForm;
            addToCoreProjects: boolean;
        }) => {
            const experience = await experienceApi.workspaceCreate(workspaceSlug, payload);
            await connectionApi.updateWorkspaceExperience(
                workspaceSlug,
                experience.id,
                buildExperienceConnections(experience, form)
            );
            if (form.type === 'CAREER' && form.childProjectIds) {
                await syncChildProjectsForCareer(
                    experience.id,
                    form.childProjectIds,
                    experiencesList ?? []
                );
            }
            if (addToCoreProjects) {
                const placements =
                    await experiencePlacementApi.workspaceListCoreProjects(workspaceSlug);
                await experiencePlacementApi.workspaceReplaceCoreProjects(workspaceSlug, [
                    ...placements.map((placement, index) => ({
                        experienceId: placement.experienceId,
                        displayOrder: index,
                        enabled: placement.enabled,
                        detailIds: placement.detailIds,
                    })),
                    {
                        experienceId: experience.id,
                        displayOrder: placements.length,
                        enabled: true,
                        detailIds: experience.details.map((detail) => detail.id),
                    },
                ]);
            }
            return { experience, addToCoreProjects };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
            queryClient.invalidateQueries({
                queryKey: ['experience-placements', workspaceSlug, 'CORE_PROJECT'],
            });
            setExpForm(emptyExperienceForm);
            setIsExpFormOpen(false);
            setCreateAsCoreProject(false);
        },
        onError: handleMutationError,
    });

    const updateExpMutation = useMutation({
        mutationFn: async ({
            id,
            payload,
            form,
        }: {
            id: number;
            payload: ExperienceRequest;
            form: AdminExperienceForm;
        }) => {
            const experience = await experienceApi.workspaceUpdate(workspaceSlug, id, payload);
            await connectionApi.updateWorkspaceExperience(
                workspaceSlug,
                experience.id,
                buildExperienceConnections(experience, form)
            );
            if (form.type === 'CAREER' && form.childProjectIds) {
                await syncChildProjectsForCareer(
                    experience.id,
                    form.childProjectIds,
                    experiencesList ?? []
                );
            }
            return experience;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
            setExpEditingId(null);
            setExpForm(emptyExperienceForm);
            setIsExpFormOpen(false);
        },
        onError: handleMutationError,
    });

    const deleteExpMutation = useMutation({
        mutationFn: (id: number) => experienceApi.workspaceRemove(workspaceSlug, id),
        onSuccess: (_data, deletedId) => {
            queryClient.invalidateQueries({ queryKey: ['experiences'] });
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
            if (selectedExperienceId === deletedId) setSelectedExperienceId(null);
        },
        onError: handleMutationError,
    });

    const requestExpAiSuggestions = async () => {
        resetExpAiStream();
        setExpAiSuggestions([]);
        setIsExpAiGenerating(true);
        const controller = new AbortController();
        expAiAbortRef.current = controller;
        try {
            await experienceApi.workspaceSuggestStream(
                workspaceSlug,
                {
                    instruction: expAiInstruction,
                    type: expForm.type,
                    draftTitle: expForm.title,
                    companyName: expForm.type === 'CAREER' ? expForm.companyName : undefined,
                    role:
                        expForm.type === 'CAREER' || expForm.type === 'PROJECT'
                            ? expForm.role
                            : undefined,
                    institutionName:
                        expForm.type === 'EDUCATION' ? expForm.institutionName : undefined,
                    issuer: expForm.type === 'CERTIFICATE' ? expForm.issuer : undefined,
                    repositoryUrl: expForm.type === 'PROJECT' ? expForm.repositoryUrl : undefined,
                    skillIds: expForm.skillIds,
                    studyIds: expForm.studyIds,
                    relatedExperienceIds: expForm.relatedExperienceIds,
                },
                (event) => {
                    if (event.type === 'stage') {
                        pushExpAiStage(event.stage, event.message);
                    } else if (event.type === 'token') {
                        appendExpAiToken(event.stage, event.text);
                    } else if (event.type === 'facts') {
                        setExpAiFactCount(event.factCount);
                    } else if (event.type === 'complete') {
                        finishExpAiStages();
                        setExpAiSuggestions(event.suggestions);
                    } else {
                        setExpAiError(event.message);
                    }
                },
                controller.signal
            );
        } catch (error) {
            if (!controller.signal.aborted) {
                setExpAiError(
                    error instanceof Error ? error.message : 'AI 초안 생성에 실패했습니다.'
                );
            }
        } finally {
            if (expAiAbortRef.current === controller) {
                expAiAbortRef.current = null;
                setIsExpAiGenerating(false);
            }
        }
    };

    const applyExpAiSummary = (suggestion: ExperienceSuggestion) => {
        if (
            (expForm.summary?.trim() || expForm.takeaway?.trim()) &&
            !window.confirm('현재 작성한 요약·배운 점을 AI 초안으로 바꾸시겠습니까?')
        )
            return;
        setExpForm({
            ...expForm,
            summary: suggestion.summary,
            takeaway: suggestion.takeaway,
        });
    };

    const addExpAiDetailSuggestion = (detail: ExperienceDetailSuggestion) => {
        setExpForm({
            ...expForm,
            details: [
                ...expForm.details,
                {
                    content: detail.content,
                    situation: detail.situation,
                    actionDetail: detail.actionDetail,
                    outcome: detail.outcome,
                    skillIds: detail.skillIds,
                    studyIds: [],
                },
            ],
        });
    };

    const generateDetailNarrative = async (idx: number) => {
        const detail = expForm.details[idx];
        if (!detail.situation?.trim() && !detail.actionDetail?.trim() && !detail.outcome?.trim()) {
            setNarrativeError('상황/진행 과정/성과 중 최소 하나는 입력해야 합니다.');
            return;
        }
        setNarrativeError(null);
        setIsNarrativeGenerating(true);
        try {
            const { narrative } = await experienceApi.workspaceGenerateNarrative(workspaceSlug, {
                content: detail.content,
                situation: detail.situation,
                actionDetail: detail.actionDetail,
                outcome: detail.outcome,
            });
            updateDetailField(idx, 'narrative', narrative);
        } catch (error) {
            handleMutationError(error);
            setNarrativeError(error instanceof Error ? error.message : 'AI 재작성에 실패했습니다.');
        } finally {
            setIsNarrativeGenerating(false);
        }
    };

    const handleExpSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const payload: ExperienceRequest = {
            type: expForm.type,
            title: expForm.title,
            periodStart: expForm.periodStart,
            periodEnd: expForm.periodEnd ? expForm.periodEnd : null,
            summary: expForm.summary,
            takeaway: expForm.takeaway,
            displayOrder: Number(expForm.displayOrder),
            showOnTimeline: expForm.showOnTimeline,
            timelineLabel: expForm.timelineLabel?.trim() || undefined,
            details: expForm.details.map((detail) => ({
                id: detail.id,
                content: detail.content,
                situation: detail.situation,
                task: detail.task,
                actionDetail: detail.actionDetail,
                outcome: detail.outcome,
                narrative: detail.narrative,
                skillIds: detail.skillIds,
            })),
            skillIds: expForm.skillIds,
            tagNames: expForm.tagNames
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            images: expForm.images.map(({ id, objectKey, displayOrder }) => ({
                id,
                objectKey,
                displayOrder,
            })),
            companyName: expForm.type === 'CAREER' ? expForm.companyName : undefined,
            employmentType: expForm.type === 'CAREER' ? expForm.employmentType : undefined,
            department: expForm.type === 'CAREER' ? expForm.department : undefined,
            role:
                expForm.type === 'CAREER' || expForm.type === 'PROJECT' ? expForm.role : undefined,
            slug: expForm.type === 'PROJECT' ? expForm.slug : undefined,
            contributionRate:
                expForm.type === 'PROJECT' && expForm.contributionRate != null
                    ? Number(expForm.contributionRate)
                    : undefined,
            repositoryUrl:
                expForm.type === 'PROJECT' ? expForm.repositoryUrl?.trim() || undefined : undefined,
            careerId: expForm.type === 'PROJECT' ? expForm.careerId : undefined,
            institutionName: expForm.type === 'EDUCATION' ? expForm.institutionName : undefined,
            educationType: expForm.type === 'EDUCATION' ? expForm.educationType : undefined,
            degree:
                expForm.type === 'EDUCATION' && expForm.educationType === 'ACADEMIC'
                    ? expForm.degree
                    : undefined,
            major:
                expForm.type === 'EDUCATION' && expForm.educationType === 'ACADEMIC'
                    ? expForm.major
                    : undefined,
            gpa:
                expForm.type === 'EDUCATION' && expForm.educationType === 'ACADEMIC'
                    ? expForm.gpa
                    : undefined,
            graduationStatus: expForm.type === 'EDUCATION' ? expForm.graduationStatus : undefined,
            issuer: expForm.type === 'CERTIFICATE' ? expForm.issuer : undefined,
        };

        if (expEditingId !== null) {
            updateExpMutation.mutate({ id: expEditingId, payload, form: expForm });
        } else {
            createExpMutation.mutate({
                payload,
                form: expForm,
                addToCoreProjects: createAsCoreProject,
            });
        }
    };

    const handleExpDelete = (id: number) => {
        if (window.confirm('정말 이 이력 항목을 삭제하시겠습니까?')) {
            deleteExpMutation.mutate(id);
        }
    };

    const openExperienceEditor = async (experience: Experience) => {
        try {
            const connections = await connectionApi.getWorkspaceExperience(
                workspaceSlug,
                experience.id
            );
            const detailStudies = new Map(
                connections.detailStudies.map((connection) => [
                    connection.detailId,
                    connection.studyIds,
                ])
            );
            setExpEditingId(experience.id);
            setCreateAsCoreProject(false);
            setExpandedDetailIdx(null);
            setDetailListSearch('');
            setExpForm({
                type: experience.type,
                title: experience.title,
                periodStart: experience.periodStart,
                periodEnd: experience.periodEnd ?? '',
                summary: experience.summary ?? '',
                takeaway: experience.takeaway ?? '',
                displayOrder: experience.displayOrder,
                showOnTimeline: experience.showOnTimeline,
                timelineLabel: experience.timelineLabel ?? '',
                details: (experience.details ?? []).map((detail) => ({
                    id: detail.id,
                    content: detail.content,
                    situation: detail.situation ?? '',
                    actionDetail: detail.actionDetail ?? '',
                    outcome: detail.outcome ?? '',
                    narrative: detail.narrative ?? '',
                    skillIds: detail.skills?.map((skill) => skill.id) ?? [],
                    studyIds: detailStudies.get(detail.id) ?? [],
                })),
                skillIds: experience.skills?.map((skill) => skill.id) ?? [],
                tagNames: experience.tags?.map((tag) => tag.name).join(', ') ?? '',
                images: experience.images ?? [],
                companyName: experience.companyName ?? '',
                employmentType: experience.employmentType ?? '정규직',
                department: experience.department ?? '',
                role: experience.role ?? '',
                slug: experience.slug ?? '',
                contributionRate: experience.contributionRate,
                repositoryUrl: experience.repositoryUrl ?? '',
                careerId: experience.careerId,
                institutionName: experience.institutionName ?? '',
                educationType:
                    experience.educationType ??
                    (credentialKindLabel(experience) === '학력' ? 'ACADEMIC' : 'COURSE'),
                degree: experience.degree ?? '',
                major: experience.major ?? '',
                gpa: experience.gpa ?? '',
                graduationStatus: experience.graduationStatus ?? 'GRADUATED',
                issuer: experience.issuer ?? '',
                studyIds: connections.studyIds,
                relatedExperienceIds: connections.relatedExperiences.map(
                    (related) => related.experienceId
                ),
                childProjectIds: (experiencesList ?? [])
                    .filter((item) => item.type === 'PROJECT' && item.careerId === experience.id)
                    .map((item) => item.id),
            });
            setExpAiSuggestions([]);
            resetExpAiStream();
            setIsExpFormOpen(true);
        } catch (error) {
            handleMutationError(error);
        }
    };

    const [draggedDetailIdx, setDraggedDetailIdx] = useState<number | null>(null);

    const touchDetailDrag = useTouchDrag({
        disabled: detailListSearch.trim() !== '',
        onDragStart: (sourceId) => setDraggedDetailIdx(Number(sourceId)),
        onDrop: (sourceId, targetId) => {
            const sourceIndex = Number(sourceId);
            const targetIndex = Number(targetId);
            if (
                !Number.isInteger(sourceIndex) ||
                !Number.isInteger(targetIndex) ||
                sourceIndex === targetIndex
            ) {
                return;
            }
            setExpForm((prev) => {
                if (
                    sourceIndex < 0 ||
                    targetIndex < 0 ||
                    sourceIndex >= prev.details.length ||
                    targetIndex >= prev.details.length
                ) {
                    return prev;
                }
                const details = [...prev.details];
                const [moved] = details.splice(sourceIndex, 1);
                details.splice(targetIndex, 0, moved);
                return { ...prev, details };
            });
        },
        onDragEnd: () => setDraggedDetailIdx(null),
    });

    const handleDetailDragStart = (idx: number) => {
        setDraggedDetailIdx(idx);
    };

    const handleDetailDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedDetailIdx === null || draggedDetailIdx === idx) return;

        setExpForm((prev) => {
            const details = [...prev.details];
            const [moved] = details.splice(draggedDetailIdx, 1);
            details.splice(idx, 0, moved);
            return { ...prev, details };
        });
        setDraggedDetailIdx(idx);
    };

    const handleDetailDragEnd = () => {
        setDraggedDetailIdx(null);
    };

    const addDetailPoint = () => {
        if (detailInput.trim()) {
            setExpForm({
                ...expForm,
                details: [
                    ...expForm.details,
                    {
                        content: detailInput.trim(),
                        situation: '',
                        actionDetail: '',
                        outcome: '',
                        narrative: '',
                        skillIds: [],
                        studyIds: [],
                    },
                ],
            });
            setDetailInput('');
        }
    };

    const removeDetailPoint = (idx: number) => {
        setExpForm({ ...expForm, details: expForm.details.filter((_, i) => i !== idx) });
    };

    const updateDetailField = (
        idx: number,
        field: 'content' | 'situation' | 'actionDetail' | 'outcome' | 'narrative',
        value: string
    ) => {
        setExpForm({
            ...expForm,
            details: expForm.details.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
        });
    };

    const moveDetailPoint = (idx: number, direction: -1 | 1) => {
        const target = idx + direction;
        if (target < 0 || target >= expForm.details.length) return;
        const details = [...expForm.details];
        [details[idx], details[target]] = [details[target], details[idx]];
        setExpForm({ ...expForm, details });
        setExpandedDetailIdx((current) =>
            current === idx ? target : current === target ? idx : current
        );
    };

    const toggleDetailSkill = (idx: number, skillId: number) => {
        setExpForm({
            ...expForm,
            details: expForm.details.map((d, i) => {
                if (i !== idx) return d;
                const isChecked = d.skillIds.includes(skillId);
                return {
                    ...d,
                    skillIds: isChecked
                        ? d.skillIds.filter((id) => id !== skillId)
                        : [...d.skillIds, skillId],
                };
            }),
        });
    };

    const toggleDetailStudy = (idx: number, studyId: number) => {
        setExpForm({
            ...expForm,
            details: expForm.details.map((detail, detailIndex) => {
                if (detailIndex !== idx) return detail;
                const isChecked = detail.studyIds.includes(studyId);
                return {
                    ...detail,
                    studyIds: isChecked
                        ? detail.studyIds.filter((id) => id !== studyId)
                        : [...detail.studyIds, studyId],
                };
            }),
        });
    };

    const toggleExpSkill = (skillId: number) => {
        const isChecked = expForm.skillIds.includes(skillId);
        setExpForm({
            ...expForm,
            skillIds: isChecked
                ? expForm.skillIds.filter((id) => id !== skillId)
                : [...expForm.skillIds, skillId],
        });
    };

    return (
        <div className="space-y-4">
            <AdminPageHeader
                title="이력 및 경력 관리"
                description="경력·프로젝트·교육·자격 원본을 기록합니다. 공개 범위와 타임라인 구성은 공개 페이지에서 관리합니다."
                actions={
                    <button
                        onClick={() => {
                            setSelectedExperienceId(null);
                            setExpEditingId(null);
                            setExpForm(emptyExperienceForm);
                            setCreateAsCoreProject(false);
                            setExpandedDetailIdx(null);
                            setDetailListSearch('');
                            setExpAiInstruction('');
                            setExpAiSuggestions([]);
                            resetExpAiStream();
                            setIsExpFormOpen(true);
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />
                        이력 추가
                    </button>
                }
            />

            {!isExpFormOpen && !selectedExperience && (
                <div className="space-y-3 animate-fadeIn">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white/95 p-4 rounded-2xl border border-slate-200 shadow-xs backdrop-blur-xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                                전체 원본 {counts.all}개
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {[
                                    'ALL',
                                    'CAREER',
                                    'PROJECT',
                                    'ACADEMIC',
                                    'COURSE',
                                    'CERTIFICATE',
                                ].map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setExpFilter(cat)}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${expFilter === cat ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'}`}
                                    >
                                        {cat === 'ALL'
                                            ? '전체 유형'
                                            : cat === 'CAREER'
                                              ? '회사 경력'
                                              : cat === 'PROJECT'
                                                ? '프로젝트'
                                                : cat === 'ACADEMIC'
                                                  ? '학력'
                                                  : cat === 'COURSE'
                                                    ? '학습·교육'
                                                    : '자격증'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="w-full sm:w-56">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    placeholder="이력명, 성과 검색..."
                                    value={expSearch}
                                    onChange={(e) => setExpSearch(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs transition focus:border-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isExpFormOpen && (
                <form
                    onSubmit={handleExpSubmit}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h3 className="text-base font-black text-slate-800">
                        {expEditingId !== null ? '이력 수정' : '새 이력 추가'}
                    </h3>

                    {createAsCoreProject && expEditingId === null && (
                        <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                            프로젝트를 저장하면 핵심 프로젝트의 마지막 순서에 자동으로 편성됩니다.
                        </p>
                    )}

                    {enableWorkspaceAi && (
                        <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
                                    <WandSparkles className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-violet-950">
                                        AI로 경력 회고 초안 만들기
                                    </h4>
                                    <p className="mt-1 text-xs leading-relaxed text-violet-700">
                                        AI가 1단계에서 선택한 기술·관련 Study·관련 경력과 메모의
                                        사실관계를 정리하고, 2단계에서 검증된 사실만 사용해
                                        요약·배운 점과 상세 항목 초안을 작성합니다.
                                    </p>
                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                        <textarea
                                            rows={3}
                                            maxLength={1000}
                                            value={expAiInstruction}
                                            onChange={(event) =>
                                                setExpAiInstruction(event.target.value)
                                            }
                                            placeholder="이 경력·프로젝트에서 있었던 일, 맡은 역할, 핵심 키워드를 적어주세요."
                                            className="min-h-[88px] flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={requestExpAiSuggestions}
                                            disabled={isExpAiGenerating}
                                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 sm:self-stretch"
                                        >
                                            <WandSparkles
                                                className={`h-4 w-4 ${isExpAiGenerating ? 'animate-pulse' : ''}`}
                                            />
                                            {isExpAiGenerating
                                                ? '사실관계 정리·작성 중...'
                                                : expAiSuggestions.length > 0
                                                  ? '다시 생성'
                                                  : 'AI 초안 생성'}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-[11px] leading-relaxed text-violet-500">
                                        선택한 기술·관련 Study·경력 요약과 메모가 NVIDIA NIM API로
                                        전송됩니다. AI 초안은 자동 저장되지 않으니 반드시 검토 후
                                        저장하세요.
                                    </p>

                                    {(expAiStages.length > 0 || expAiError) && (
                                        <div
                                            ref={expAiChatRef}
                                            className="mt-4 max-h-80 space-y-2.5 overflow-y-auto rounded-xl border border-violet-100 bg-white p-3"
                                        >
                                            {expAiStages.map((stageItem) => (
                                                <AiStageBubble
                                                    key={stageItem.stage}
                                                    stage={stageItem}
                                                    fieldLabels={EXPERIENCE_AI_FIELD_LABELS}
                                                    extra={
                                                        stageItem.stage === 1 &&
                                                        expAiFactCount > 0 ? (
                                                            <p className="mt-2 text-[11px] font-bold text-violet-600">
                                                                검증된 사실 {expAiFactCount}개
                                                            </p>
                                                        ) : undefined
                                                    }
                                                />
                                            ))}
                                            {expAiError && (
                                                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                                    {expAiError}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {expAiSuggestions.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            {expAiSuggestions.map((suggestion, index) => (
                                                <article
                                                    key={index}
                                                    className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm"
                                                >
                                                    <p className="text-xs leading-relaxed text-slate-600">
                                                        {suggestion.summary}
                                                    </p>
                                                    {suggestion.takeaway && (
                                                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                                            배운 점: {suggestion.takeaway}
                                                        </p>
                                                    )}
                                                    {suggestion.reason && (
                                                        <p className="mt-3 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] leading-relaxed text-violet-700">
                                                            {suggestion.reason}
                                                        </p>
                                                    )}
                                                    <div className="mt-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                applyExpAiSummary(suggestion)
                                                            }
                                                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />{' '}
                                                            요약·배운 점 적용
                                                        </button>
                                                    </div>
                                                    {suggestion.details.length > 0 && (
                                                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                                                제안된 상세 항목
                                                            </p>
                                                            {suggestion.details.map(
                                                                (detail, detailIndex) => (
                                                                    <div
                                                                        key={detailIndex}
                                                                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                                                                    >
                                                                        <p className="text-xs font-bold text-slate-700">
                                                                            {detail.content}
                                                                        </p>
                                                                        {detail.situation && (
                                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                                상황:{' '}
                                                                                {detail.situation}
                                                                            </p>
                                                                        )}
                                                                        {detail.actionDetail && (
                                                                            <p className="text-[11px] text-slate-500">
                                                                                행동:{' '}
                                                                                {
                                                                                    detail.actionDetail
                                                                                }
                                                                            </p>
                                                                        )}
                                                                        {detail.outcome && (
                                                                            <p className="text-[11px] text-slate-500">
                                                                                성과:{' '}
                                                                                {detail.outcome}
                                                                            </p>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                addExpAiDetailSuggestion(
                                                                                    detail
                                                                                )
                                                                            }
                                                                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-50"
                                                                        >
                                                                            <Check className="h-3 w-3" />{' '}
                                                                            상세 항목으로 추가
                                                                        </button>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                        <Briefcase className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                            기본 정보
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                이력 구분 (유형)
                            </label>
                            <select
                                value={expForm.type}
                                onChange={(e) => {
                                    const type = e.target.value as ExperienceRequest['type'];
                                    setExpForm({
                                        ...expForm,
                                        type,
                                        careerId: type === 'PROJECT' ? expForm.careerId : undefined,
                                    });
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                <option value="CAREER">회사 경력 (CAREER)</option>
                                <option value="PROJECT">프로젝트 (PROJECT)</option>
                                <option value="EDUCATION">학력/학습 (EDUCATION)</option>
                                <option value="CERTIFICATE">자격증 (CERTIFICATE)</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                이력명 (타이틀)
                            </label>
                            <input
                                type="text"
                                required
                                value={expForm.title}
                                onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                시작일
                            </label>
                            <input
                                type="date"
                                required
                                value={expForm.periodStart}
                                onChange={(e) =>
                                    setExpForm({ ...expForm, periodStart: e.target.value })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                종료일 (없으면 비워둠)
                            </label>
                            <input
                                type="date"
                                value={expForm.periodEnd ?? ''}
                                onChange={(e) =>
                                    setExpForm({ ...expForm, periodEnd: e.target.value })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                정렬 순서
                            </label>
                            <input
                                type="number"
                                required
                                value={expForm.displayOrder}
                                onChange={(e) =>
                                    setExpForm({ ...expForm, displayOrder: Number(e.target.value) })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            태그 (쉼표 구분)
                        </label>
                        <input
                            type="text"
                            value={expForm.tagNames}
                            onChange={(e) => setExpForm({ ...expForm, tagNames: e.target.value })}
                            placeholder="리드, 아키텍처, 마이그레이션"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    {expForm.type === 'CAREER' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    회사명
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={expForm.companyName}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, companyName: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    고용 형태
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={expForm.employmentType}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, employmentType: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    부서명
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={expForm.department}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, department: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    담당 직무 (역할)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={expForm.role}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, role: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {expForm.type === 'PROJECT' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                            <div className="sm:col-span-3">
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    프로젝트 소속
                                </label>
                                <select
                                    value={expForm.careerId ?? ''}
                                    onChange={(e) => {
                                        const careerId = e.target.value
                                            ? Number(e.target.value)
                                            : undefined;
                                        const career = (experiencesList ?? []).find(
                                            (item) => item.id === careerId && item.type === 'CAREER'
                                        );
                                        setExpForm({
                                            ...expForm,
                                            careerId,
                                            periodStart: career?.periodStart ?? expForm.periodStart,
                                            periodEnd: career?.periodEnd ?? expForm.periodEnd,
                                            role: career?.role || expForm.role,
                                        });
                                    }}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                >
                                    <option value="">독립·팀 프로젝트</option>
                                    {(experiencesList ?? [])
                                        .filter((item) => item.type === 'CAREER')
                                        .map((career) => (
                                            <option key={career.id} value={career.id}>
                                                {career.companyName || career.title} ·{' '}
                                                {career.role || '역할 미입력'}
                                            </option>
                                        ))}
                                </select>
                                <p className="mt-1 text-xs text-slate-400">
                                    직장 경력을 선택하면 해당 회사 아래에 소속 프로젝트로
                                    표시됩니다.
                                </p>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    프로젝트 식별자 (slug)
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="예: project1, project2"
                                    value={expForm.slug}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, slug: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    담당 직무 (역할)
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="예: Backend & DevOps"
                                    value={expForm.role}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, role: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    기여도 (%)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={expForm.contributionRate ?? ''}
                                    onChange={(e) =>
                                        setExpForm({
                                            ...expForm,
                                            contributionRate: e.target.value
                                                ? Number(e.target.value)
                                                : undefined,
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    GitHub 저장소 URL (선택)
                                </label>
                                <input
                                    type="url"
                                    maxLength={500}
                                    placeholder="https://github.com/사용자/저장소"
                                    value={expForm.repositoryUrl ?? ''}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, repositoryUrl: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                    비공개 또는 저장소가 없는 프로젝트는 비워두세요.
                                </p>
                            </div>
                        </div>
                    )}

                    {expForm.type === 'EDUCATION' && (
                        <div className="rounded-xl bg-slate-100/20 border border-slate-200/50 p-4 space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">
                                    구분
                                </label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpForm({ ...expForm, educationType: 'ACADEMIC' })
                                    }
                                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition ${expForm.educationType === 'ACADEMIC' || !expForm.educationType ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'}`}
                                >
                                    🎓 정규 학력 (고등학교/대학교 등)
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpForm({ ...expForm, educationType: 'COURSE' })
                                    }
                                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition ${expForm.educationType === 'COURSE' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'}`}
                                >
                                    📚 학습 · 교육과정 (부트캠프/강의 등)
                                </button>
                            </div>

                            {expForm.educationType === 'ACADEMIC' || !expForm.educationType ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">
                                            학교명
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 차의과학대학교 / 서울고등학교"
                                            value={expForm.institutionName}
                                            onChange={(e) =>
                                                setExpForm({
                                                    ...expForm,
                                                    institutionName: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">
                                            학력 구분 / 학위
                                        </label>
                                        <select
                                            value={expForm.degree ?? '학사'}
                                            onChange={(e) =>
                                                setExpForm({ ...expForm, degree: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                        >
                                            <option value="고등학교">고등학교</option>
                                            <option value="전문학사">전문학사 (2·3년제)</option>
                                            <option value="학사">학사 (4년제)</option>
                                            <option value="석사">석사</option>
                                            <option value="박사">박사</option>
                                            <option value="기타">기타</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">
                                            전공 / 계열
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: 스포츠의학과 / 이과계열"
                                            value={expForm.major ?? ''}
                                            onChange={(e) =>
                                                setExpForm({ ...expForm, major: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">
                                            졸업 상태
                                        </label>
                                        <select
                                            value={expForm.graduationStatus ?? 'GRADUATED'}
                                            onChange={(e) =>
                                                setExpForm({
                                                    ...expForm,
                                                    graduationStatus: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                        >
                                            <option value="GRADUATED">졸업</option>
                                            <option value="ATTENDING">재학</option>
                                            <option value="COMPLETED">수료</option>
                                            <option value="DROPPED_OUT">중퇴</option>
                                            <option value="ON_LEAVE">휴학</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-xs font-bold text-slate-600">
                                            학점 (GPA)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: 3.8 / 4.5 또는 4.0 / 4.5"
                                            value={expForm.gpa ?? ''}
                                            onChange={(e) =>
                                                setExpForm({ ...expForm, gpa: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">
                                            교육 기관명
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 멀티캠퍼스 / 청년취업사관학교"
                                            value={expForm.institutionName}
                                            onChange={(e) =>
                                                setExpForm({
                                                    ...expForm,
                                                    institutionName: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">
                                            이수 상태
                                        </label>
                                        <select
                                            value={expForm.graduationStatus ?? 'COMPLETED'}
                                            onChange={(e) =>
                                                setExpForm({
                                                    ...expForm,
                                                    graduationStatus: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                                        >
                                            <option value="COMPLETED">수료</option>
                                            <option value="ATTENDING">수강 중</option>
                                            <option value="DROPPED_OUT">중단</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {expForm.type === 'CERTIFICATE' && (
                        <div className="rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                            <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                발급 기관
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="예: 한국산업인력공단"
                                value={expForm.issuer}
                                onChange={(e) => setExpForm({ ...expForm, issuer: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                            />
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            이미지
                        </label>
                        <ImageGalleryEditor
                            workspaceSlug={workspaceSlug}
                            scope="EXPERIENCE_GALLERY"
                            images={expForm.images}
                            onChange={(images) => setExpForm({ ...expForm, images })}
                        />
                    </div>

                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                        <BookOpen className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                            본문 내용
                        </h4>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            한줄 요약 (Summary, 마크다운)
                        </label>
                        <MarkdownEditor
                            value={expForm.summary ?? ''}
                            onChange={(summary) => setExpForm({ ...expForm, summary })}
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Takeaway (성과 및 배운점, 마크다운)
                        </label>
                        <MarkdownEditor
                            value={expForm.takeaway ?? ''}
                            onChange={(takeaway) => setExpForm({ ...expForm, takeaway })}
                        />
                    </div>

                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                        <Wrench className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                            기술 · 관련 자료
                        </h4>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            사용 기술 매핑
                        </label>
                        <div className="relative mb-2">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={expSkillSearch}
                                onChange={(event) => setExpSkillSearch(event.target.value)}
                                placeholder="기술명 또는 분류 검색"
                                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div className="grid max-h-56 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
                            {selectableExpSkills.map((s) => {
                                const isChecked = expForm.skillIds.includes(s.id);
                                return (
                                    <label
                                        key={s.id}
                                        className={`flex items-start gap-2 p-2 rounded-lg border transition cursor-pointer text-sm ${isChecked ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleExpSkill(s.id)}
                                            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                                        />
                                        <span className="min-w-0">
                                            <span className="block truncate">{s.name}</span>
                                            <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
                                                {skillUsageOptions.find(
                                                    (option) => option.value === s.usageType
                                                )?.label ?? s.usageType}
                                                {s.skillVersion ? ` · v${s.skillVersion}` : ''}
                                                {s.skillLevel ? ` · ${s.skillLevel}` : ''}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                            {selectableExpSkills.length === 0 && (
                                <p className="col-span-full py-4 text-center text-xs font-semibold text-slate-400">
                                    검색 결과가 없습니다.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                관련 Study · {expForm.studyIds.length}개
                            </label>
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={expStudySearch}
                                    onChange={(event) => setExpStudySearch(event.target.value)}
                                    placeholder="Study 제목 검색"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-800"
                                />
                            </div>
                            <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
                                {selectableExpStudies.map((study) => (
                                    <label
                                        key={study.id}
                                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={expForm.studyIds.includes(study.id)}
                                            onChange={() =>
                                                setExpForm((current) => ({
                                                    ...current,
                                                    studyIds: current.studyIds.includes(study.id)
                                                        ? current.studyIds.filter(
                                                              (id) => id !== study.id
                                                          )
                                                        : [...current.studyIds, study.id],
                                                }))
                                            }
                                            className="mt-0.5"
                                        />
                                        <span className="font-semibold text-slate-700">
                                            {study.title}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {expForm.type === 'CAREER' && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                                <div className="mb-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-900">
                                        소속 직장 프로젝트 (Child Projects) ·{' '}
                                        {expForm.childProjectIds.length}개
                                    </label>
                                    <p className="mt-0.5 text-xs text-blue-700 font-medium">
                                        이 직장 경력(CAREER) 기간 중 진행된 프로젝트 목록입니다.
                                        선택 시 해당 프로젝트의 소속 경력(careerId)으로 연결됩니다.
                                    </p>
                                </div>
                                <div className="relative mb-2">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={expChildProjectSearch}
                                        onChange={(event) =>
                                            setExpChildProjectSearch(event.target.value)
                                        }
                                        placeholder="프로젝트 제목 검색..."
                                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-600"
                                    />
                                </div>
                                <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
                                    {(experiencesList ?? [])
                                        .filter(
                                            (exp) =>
                                                exp.type === 'PROJECT' &&
                                                (!expChildProjectSearch ||
                                                    exp.title
                                                        .toLowerCase()
                                                        .includes(
                                                            expChildProjectSearch.toLowerCase()
                                                        ))
                                        )
                                        .map((project) => (
                                            <label
                                                key={project.id}
                                                className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs hover:border-blue-300 transition"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={expForm.childProjectIds.includes(
                                                        project.id
                                                    )}
                                                    onChange={() =>
                                                        setExpForm((current) => ({
                                                            ...current,
                                                            childProjectIds:
                                                                current.childProjectIds.includes(
                                                                    project.id
                                                                )
                                                                    ? current.childProjectIds.filter(
                                                                          (id) => id !== project.id
                                                                      )
                                                                    : [
                                                                          ...current.childProjectIds,
                                                                          project.id,
                                                                      ],
                                                        }))
                                                    }
                                                    className="mt-0.5"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-bold text-slate-800">
                                                        {project.title}
                                                    </span>
                                                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        <span>
                                                            {project.periodStart} ~{' '}
                                                            {project.periodEnd ?? '진행중'}
                                                        </span>
                                                        {project.contributionRate != null && (
                                                            <span>
                                                                · 기여도 {project.contributionRate}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                </div>
                            </div>
                        )}

                        {expForm.type !== 'CAREER' && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                <div className="mb-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                                        기타 연관 이력·참고 링크 (Cross References) ·{' '}
                                        {expForm.relatedExperienceIds.length}개
                                    </label>
                                    <p className="mt-0.5 text-xs text-slate-400 font-medium">
                                        이 항목과 연관된 다른 이력이나 경력을 연결합니다.
                                    </p>
                                </div>
                                <div className="relative mb-2">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={expRelatedSearch}
                                        onChange={(event) =>
                                            setExpRelatedSearch(event.target.value)
                                        }
                                        placeholder="제목 또는 유형 검색"
                                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-800"
                                    />
                                </div>
                                <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
                                    {selectableRelatedExperiences.map((experience) => (
                                        <label
                                            key={experience.id}
                                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={expForm.relatedExperienceIds.includes(
                                                    experience.id
                                                )}
                                                onChange={() =>
                                                    setExpForm((current) => ({
                                                        ...current,
                                                        relatedExperienceIds:
                                                            current.relatedExperienceIds.includes(
                                                                experience.id
                                                            )
                                                                ? current.relatedExperienceIds.filter(
                                                                      (id) => id !== experience.id
                                                                  )
                                                                : [
                                                                      ...current.relatedExperienceIds,
                                                                      experience.id,
                                                                  ],
                                                    }))
                                                }
                                                className="mt-0.5"
                                            />
                                            <span>
                                                <b className="mr-1 text-slate-400">
                                                    {experience.type}
                                                </b>
                                                {experience.title}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 이력 상세 항목 (Bullet Points) */}
                    <>
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                            <ListChecks className="h-4 w-4 text-slate-500" />
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                                이력 상세 항목 (Bullet Points) · {expForm.details.length}개
                            </h4>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    placeholder="새로운 불릿 항목 상세 입력..."
                                    value={detailInput}
                                    onChange={(e) => setDetailInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addDetailPoint();
                                        }
                                    }}
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-slate-800 bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={addDetailPoint}
                                    className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 p-2 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                                >
                                    <PlusCircle className="h-4 w-4" />
                                    추가
                                </button>
                            </div>

                            {expForm.details.length > 0 && (
                                <div className="relative mb-3">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={detailListSearch}
                                        onChange={(event) =>
                                            setDetailListSearch(event.target.value)
                                        }
                                        placeholder="상세 항목 내용 검색..."
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                {expForm.details
                                    .map((d, idx) => ({ d, idx }))
                                    .filter(
                                        ({ d }) =>
                                            !detailListSearch.trim() ||
                                            d.content
                                                .toLowerCase()
                                                .includes(detailListSearch.trim().toLowerCase())
                                    )
                                    .map(({ d, idx }) => {
                                        const isDetailExpanded = expandedDetailIdx === idx;
                                        const isDragged = draggedDetailIdx === idx;
                                        return (
                                            <div
                                                key={idx}
                                                {...touchDetailDrag.dropTargetProps(String(idx))}
                                                draggable={detailListSearch.trim() === ''}
                                                onDragStart={() => handleDetailDragStart(idx)}
                                                onDragOver={(e) => handleDetailDragOver(e, idx)}
                                                onDragEnd={handleDetailDragEnd}
                                                className={`rounded-lg border text-sm transition ${isDragged ? 'border-indigo-400 bg-indigo-50/50 opacity-60 shadow-md' : 'border-slate-200 bg-white'}`}
                                            >
                                                <div className="flex items-center justify-between gap-1.5 p-2">
                                                    <div
                                                        {...touchDetailDrag.dragHandleProps(
                                                            String(idx)
                                                        )}
                                                        className="flex shrink-0 touch-none select-none items-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-0.5"
                                                        title="드래그 또는 터치하여 순서 변경"
                                                    >
                                                        <GripVertical className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex shrink-0 flex-col">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveDetailPoint(idx, -1)}
                                                            disabled={
                                                                idx === 0 ||
                                                                detailListSearch.trim() !== ''
                                                            }
                                                            title="위로 이동"
                                                            className="grid h-3.5 w-4 place-items-center text-slate-400 hover:text-slate-900 disabled:opacity-20 disabled:hover:text-slate-400"
                                                        >
                                                            <ArrowUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveDetailPoint(idx, 1)}
                                                            disabled={
                                                                idx ===
                                                                    expForm.details.length - 1 ||
                                                                detailListSearch.trim() !== ''
                                                            }
                                                            title="아래로 이동"
                                                            className="grid h-3.5 w-4 place-items-center text-slate-400 hover:text-slate-900 disabled:opacity-20 disabled:hover:text-slate-400"
                                                        >
                                                            <ArrowDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={d.content}
                                                        onChange={(e) =>
                                                            updateDetailField(
                                                                idx,
                                                                'content',
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="불릿 한 줄 요약"
                                                        className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-sm focus:border-slate-400 focus:bg-slate-100/30 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExpandedDetailIdx(
                                                                isDetailExpanded ? null : idx
                                                            );
                                                            setDetailSkillSearch('');
                                                            setDetailStudySearch('');
                                                        }}
                                                        className="text-slate-400 transition hover:text-slate-900 p-1"
                                                    >
                                                        {isDetailExpanded ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDetailPoint(idx)}
                                                        title="삭제"
                                                        className="text-red-500 transition hover:text-red-700 p-1"
                                                    >
                                                        <MinusCircle className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                {isDetailExpanded && (
                                                    <div className="space-y-2 border-t border-slate-100 p-3">
                                                        <div>
                                                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                상황 (Situation, 마크다운)
                                                            </label>
                                                            <MarkdownEditor
                                                                value={d.situation ?? ''}
                                                                onChange={(value) =>
                                                                    updateDetailField(
                                                                        idx,
                                                                        'situation',
                                                                        value
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                과정 (Action, 마크다운)
                                                            </label>
                                                            <MarkdownEditor
                                                                value={d.actionDetail ?? ''}
                                                                onChange={(value) =>
                                                                    updateDetailField(
                                                                        idx,
                                                                        'actionDetail',
                                                                        value
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                성과 (Outcome, 마크다운)
                                                            </label>
                                                            <MarkdownEditor
                                                                value={d.outcome ?? ''}
                                                                onChange={(value) =>
                                                                    updateDetailField(
                                                                        idx,
                                                                        'outcome',
                                                                        value
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                    서술 (Narrative, AI 병합 문단)
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        generateDetailNarrative(idx)
                                                                    }
                                                                    disabled={isNarrativeGenerating}
                                                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
                                                                >
                                                                    {isNarrativeGenerating ? (
                                                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <WandSparkles className="h-3.5 w-3.5" />
                                                                    )}
                                                                    {isNarrativeGenerating
                                                                        ? '재작성 중...'
                                                                        : 'AI로 재작성'}
                                                                </button>
                                                            </div>
                                                            {narrativeError && (
                                                                <p className="mb-1 text-[11px] font-semibold text-red-500">
                                                                    {narrativeError}
                                                                </p>
                                                            )}
                                                            <MarkdownEditor
                                                                value={d.narrative ?? ''}
                                                                onChange={(value) =>
                                                                    updateDetailField(
                                                                        idx,
                                                                        'narrative',
                                                                        value
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-3 lg:grid-cols-2">
                                                            <div>
                                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                    이 항목의 기술 태그
                                                                </label>
                                                                <div className="relative mb-2">
                                                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                                    <input
                                                                        type="search"
                                                                        value={detailSkillSearch}
                                                                        onChange={(event) =>
                                                                            setDetailSkillSearch(
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                        placeholder="기술명 또는 분류 검색"
                                                                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                                                                    />
                                                                </div>
                                                                <div className="max-h-52 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                                                                    {selectableDetailSkills.map(
                                                                        (s) => (
                                                                            <label
                                                                                key={s.id}
                                                                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={d.skillIds.includes(
                                                                                        s.id
                                                                                    )}
                                                                                    onChange={() =>
                                                                                        toggleDetailSkill(
                                                                                            idx,
                                                                                            s.id
                                                                                        )
                                                                                    }
                                                                                />
                                                                                {s.name}
                                                                            </label>
                                                                        )
                                                                    )}
                                                                    {selectableDetailSkills.length ===
                                                                        0 && (
                                                                        <p className="py-4 text-center text-xs font-semibold text-slate-400">
                                                                            검색 결과가 없습니다.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                    이 항목의 관련 Study ·{' '}
                                                                    {d.studyIds.length}개
                                                                </label>
                                                                <div className="relative mb-2">
                                                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                                    <input
                                                                        type="search"
                                                                        value={detailStudySearch}
                                                                        onChange={(event) =>
                                                                            setDetailStudySearch(
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                        placeholder="Study 제목 검색"
                                                                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                                                                    />
                                                                </div>
                                                                <div className="max-h-52 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                                                                    {selectableDetailStudies.map(
                                                                        (study) => (
                                                                            <label
                                                                                key={study.id}
                                                                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={d.studyIds.includes(
                                                                                        study.id
                                                                                    )}
                                                                                    onChange={() =>
                                                                                        toggleDetailStudy(
                                                                                            idx,
                                                                                            study.id
                                                                                        )
                                                                                    }
                                                                                />
                                                                                {study.title}
                                                                            </label>
                                                                        )
                                                                    )}
                                                                    {selectableDetailStudies.length ===
                                                                        0 && (
                                                                        <p className="py-4 text-center text-xs font-semibold text-slate-400">
                                                                            검색 결과가 없습니다.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsExpFormOpen(false);
                                setCreateAsCoreProject(false);
                                setExpAiSuggestions([]);
                                resetExpAiStream();
                            }}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={createExpMutation.isPending || updateExpMutation.isPending}
                            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                        >
                            {expEditingId !== null
                                ? '수정 완료'
                                : createAsCoreProject
                                  ? '핵심 프로젝트 생성'
                                  : '이력 생성'}
                        </button>
                    </div>
                </form>
            )}

            {!isExpFormOpen && selectedExperience && (
                <ExperienceDetailPanel
                    experience={selectedExperience}
                    allExperiences={experiencesList ?? []}
                    parentExperience={
                        parentExperienceId !== null
                            ? (experiencesList ?? []).find((e) => e.id === parentExperienceId)
                            : null
                    }
                    onBack={() => {
                        if (parentExperienceId !== null) {
                            setSelectedExperienceId(parentExperienceId);
                            setParentExperienceId(null);
                        } else {
                            setSelectedExperienceId(null);
                        }
                    }}
                    onEdit={(experience) => {
                        void openExperienceEditor(experience);
                    }}
                    onDelete={handleExpDelete}
                    onSelectExperience={(exp) => {
                        setParentExperienceId(selectedExperience.id);
                        setSelectedExperienceId(exp.id);
                    }}
                />
            )}

            {!isExpFormOpen && !selectedExperience && (
                <div className="space-y-2.5">
                    {filteredExperiences.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                            조건에 맞는 이력 항목이 없습니다.
                        </p>
                    )}
                    {filteredExperiences.map((exp) => {
                        return (
                            <div
                                key={exp.id}
                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <button
                                        type="button"
                                        className="min-w-0 flex-1 text-left"
                                        onClick={() => {
                                            setSelectedExperienceId(exp.id);
                                            setParentExperienceId(null);
                                        }}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-700 border border-indigo-200/60">
                                                #
                                                {sortedExperiences.findIndex(
                                                    (c) => c.id === exp.id
                                                ) + 1}
                                            </span>
                                            <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-bold text-slate-500">
                                                {exp.type}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-base font-black text-slate-800 transition hover:text-slate-950">
                                            {exp.title}
                                        </p>
                                        {exp.summary && (
                                            <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                                                {exp.summary}
                                            </p>
                                        )}
                                    </button>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMove(exp.id, 'UP');
                                            }}
                                            disabled={
                                                sortedExperiences.findIndex(
                                                    (c) => c.id === exp.id
                                                ) === 0 || reorderMutation.isPending
                                            }
                                            aria-label={`${exp.title} 위로 이동`}
                                            title="순서 위로 이동"
                                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                                        >
                                            <ArrowUp className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMove(exp.id, 'DOWN');
                                            }}
                                            disabled={
                                                sortedExperiences.findIndex(
                                                    (c) => c.id === exp.id
                                                ) ===
                                                    sortedExperiences.length - 1 ||
                                                reorderMutation.isPending
                                            }
                                            aria-label={`${exp.title} 아래로 이동`}
                                            title="순서 아래로 이동"
                                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void openExperienceEditor(exp);
                                            }}
                                            title="수정"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleExpDelete(exp.id)}
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
