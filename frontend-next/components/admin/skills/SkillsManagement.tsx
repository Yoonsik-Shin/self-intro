'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { ApiError, skillApi, connectionApi, studyApi, experienceApi } from '@/lib/api';
import { skillProposalApi } from '@/lib/api/skillProposal';
import type { Skill } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';
import { SkillGroupSection } from './SkillGroupSection';
import { SkillWorkbenchPanel } from './SkillWorkbenchPanel';
import { getSkillCategoryPresentation, skillCategoryPresentations } from './skillPresentation';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

export type SkillForm = Omit<Skill, 'id'> & {
    catalogSkillId: number | null;
    studyIds: number[];
    experienceIds: number[];
    experienceDetailIds: number[];
};

const emptySkillForm: SkillForm = {
    catalogSkillId: null,
    name: '',
    category: 'FRAMEWORK',
    skillLevel: '중급',
    skillVersion: '',
    comment: '',
    usageType: 'LEARNING',
    badgeKey: '',
    badgeColor: '',
    isCore: false,
    displayOrder: 0,
    studyIds: [],
    experienceIds: [],
    experienceDetailIds: [],
};

const skillCategoryFilters = [
    'ALL',
    'LANGUAGE',
    'FRAMEWORK',
    'DATABASE',
    'DEVOPS',
    'AI_RAG',
    'ETC',
];
const skillCategoryFilterLabels: Record<string, string> = {
    ALL: '전체',
    LANGUAGE: '언어',
    FRAMEWORK: '프레임워크',
    DATABASE: 'DB',
    DEVOPS: '인프라/DevOps',
    AI_RAG: 'AI/RAG',
    ETC: '기타',
};

export function SkillsManagement({ workspaceSlug }: { workspaceSlug: string }) {
    const queryClient = useQueryClient();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const handleMutationError = (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) setUnauthenticated();
    };

    const { data: skillsList } = useQuery({
        queryKey: ['skills', workspaceSlug],
        queryFn: () => skillApi.workspaceList(workspaceSlug),
    });
    const { data: catalogSkills = [] } = useQuery({
        queryKey: ['skill-catalog'],
        queryFn: skillApi.catalog,
    });
    const availableCatalogSkills = catalogSkills.filter(
        (catalogSkill) => !(skillsList ?? []).some((skill) => skill.id === catalogSkill.id)
    );
    const { data: studyPage } = useQuery({
        queryKey: ['studies', 'workspace', workspaceSlug],
        queryFn: () => studyApi.workspaceAdminList(workspaceSlug),
    });
    const studies = studyPage?.content;
    const { data: experiencesList } = useQuery({
        queryKey: ['experiences', workspaceSlug],
        queryFn: () => experienceApi.workspaceList(workspaceSlug),
    });
    const { data: skillProposals } = useQuery({
        queryKey: ['skillProposals', workspaceSlug],
        queryFn: () => skillProposalApi.workspaceList(workspaceSlug),
    });

    const [skillFilter, setSkillFilter] = useState('ALL');
    const [skillSearch, setSkillSearch] = useState('');
    const [skillEditingId, setSkillEditingId] = useState<number | null>(null);
    const [skillForm, setSkillForm] = useState<SkillForm>(emptySkillForm);
    const [isSkillFormOpen, setIsSkillFormOpen] = useState(false);
    const setSkillDraft = useAdminPreviewStore((s) => s.setSkillDraft);

    // 라이브 프리뷰 패널이 저장 전 초안을 메인페이지 기술 스택 영역에 반영할 수 있도록 발행한다.
    useEffect(() => {
        setSkillDraft(isSkillFormOpen ? { editingId: skillEditingId, form: skillForm } : null);
        return () => setSkillDraft(null);
    }, [isSkillFormOpen, skillEditingId, skillForm, setSkillDraft]);

    const filteredSkills = useMemo(() => {
        return skillsList?.filter((skill) => {
            const matchesCategory = skillFilter === 'ALL' || skill.category === skillFilter;
            const matchesSearch =
                !skillSearch ||
                skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
                (skill.comment ?? '').toLowerCase().includes(skillSearch.toLowerCase()) ||
                (skill.skillVersion ?? '').toLowerCase().includes(skillSearch.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [skillsList, skillFilter, skillSearch]);

    const groupedFilteredSkills = useMemo(() => {
        const sorted = [...(filteredSkills ?? [])].sort(
            (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)
        );
        const knownGroups = skillCategoryPresentations
            .map((category) => ({
                category,
                skills: sorted.filter((skill) => skill.category === category.key),
            }))
            .filter((group) => group.skills.length > 0);
        const knownKeys = new Set(skillCategoryPresentations.map((category) => category.key));
        const unknownSkills = sorted.filter((skill) => !knownKeys.has(skill.category));
        if (unknownSkills.length > 0) {
            knownGroups.push({
                category: getSkillCategoryPresentation(unknownSkills[0].category),
                skills: unknownSkills,
            });
        }
        return knownGroups;
    }, [filteredSkills]);

    const filteredSkillSummary = useMemo(() => {
        const items = filteredSkills ?? [];
        return {
            total: items.length,
            core: items.filter((skill) => skill.isCore).length,
            work: items.filter((skill) => skill.usageType === 'WORK_EXPERIENCE').length,
            project: items.filter((skill) => skill.usageType === 'PROJECT_USE').length,
            learning: items.filter((skill) => skill.usageType === 'LEARNING').length,
        };
    }, [filteredSkills]);

    const createSkillMutation = useMutation({
        mutationFn: async (form: SkillForm) => {
            const { studyIds, experienceIds, experienceDetailIds } = form;
            if (form.catalogSkillId === null) {
                throw new Error('공통 기술 카탈로그에서 기술을 선택해 주세요.');
            }
            const skill = await skillApi.workspaceCreate(workspaceSlug, {
                catalogSkillId: form.catalogSkillId,
                skillLevel: form.skillLevel,
                skillVersion: form.skillVersion,
                comment: form.comment,
                usageType: form.usageType,
                isCore: form.isCore,
                displayOrder: form.displayOrder,
            });
            await connectionApi.updateWorkspaceSkill(workspaceSlug, skill.id, {
                studyIds,
                experienceIds,
                experienceDetailIds,
            });
            return skill;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            queryClient.invalidateQueries({ queryKey: ['experiences'] });
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
        },
        onError: handleMutationError,
    });

    const updateSkillMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: number; payload: SkillForm }) => {
            const { studyIds, experienceIds, experienceDetailIds } = payload;
            const skill = await skillApi.workspaceUpdate(workspaceSlug, id, {
                skillLevel: payload.skillLevel,
                skillVersion: payload.skillVersion,
                comment: payload.comment,
                usageType: payload.usageType,
                isCore: payload.isCore,
                displayOrder: payload.displayOrder,
            });
            await connectionApi.updateWorkspaceSkill(workspaceSlug, id, {
                studyIds,
                experienceIds,
                experienceDetailIds,
            });
            return skill;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            queryClient.invalidateQueries({ queryKey: ['studies'] });
            queryClient.invalidateQueries({ queryKey: ['experiences'] });
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
            setSkillEditingId(null);
            setSkillForm(emptySkillForm);
        },
        onError: handleMutationError,
    });

    const toggleCoreSkillMutation = useMutation({
        mutationFn: (skill: Skill) => {
            return skillApi.workspaceUpdate(workspaceSlug, skill.id, {
                skillLevel: skill.skillLevel,
                skillVersion: skill.skillVersion,
                comment: skill.comment,
                usageType: skill.usageType,
                isCore: !skill.isCore,
                displayOrder: skill.displayOrder,
            });
        },
        onMutate: async (skill) => {
            await queryClient.cancelQueries({ queryKey: ['skills'] });
            const previousSkills = queryClient.getQueryData<Skill[]>(['skills']);
            queryClient.setQueryData<Skill[]>(['skills'], (current = []) =>
                current.map((item) =>
                    item.id === skill.id ? { ...item, isCore: !item.isCore } : item
                )
            );
            return { previousSkills };
        },
        onError: (error, _skill, context) => {
            if (context?.previousSkills)
                queryClient.setQueryData(['skills'], context.previousSkills);
            handleMutationError(error);
            window.alert('핵심 기술 설정을 저장하지 못했습니다. 다시 시도해 주세요.');
        },
        onSuccess: (updatedSkill) => {
            queryClient.setQueryData<Skill[]>(['skills'], (current = []) =>
                current.map((item) => (item.id === updatedSkill.id ? updatedSkill : item))
            );
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
        },
    });

    const proposeSkillMutation = useMutation({
        mutationFn: (payload: { name: string; category: string }) =>
            skillProposalApi.propose(workspaceSlug, {
                name: payload.name,
                category: payload.category,
                skillLevel: '중급',
                usageType: 'LEARNING',
                isCore: false,
                displayOrder: 0,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skillProposals', workspaceSlug] });
        },
        onError: (error) => {
            handleMutationError(error);
            window.alert(
                error instanceof ApiError ? error.message : '기술 제안을 등록하지 못했습니다.'
            );
        },
    });

    const deleteSkillMutation = useMutation({
        mutationFn: (id: number) => skillApi.workspaceRemove(workspaceSlug, id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
            setSkillEditingId((current) => (current === id ? null : current));
        },
        onError: handleMutationError,
    });

    const handleSkillEditSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (skillEditingId !== null) {
            updateSkillMutation.mutate({ id: skillEditingId, payload: skillForm });
        }
    };

    const handleQuickAddSkill = (catalogSkill: Skill) => {
        createSkillMutation.mutate({
            ...emptySkillForm,
            catalogSkillId: catalogSkill.id,
            name: catalogSkill.name,
            category: catalogSkill.category,
            badgeKey: catalogSkill.badgeKey,
            badgeColor: catalogSkill.badgeColor,
        });
    };

    const handlePropose = (name: string, category: string) => {
        proposeSkillMutation.mutate({ name, category });
    };

    const handleSkillDelete = (id: number) => {
        if (window.confirm('정말 이 기술 스택을 삭제하시겠습니까?')) {
            deleteSkillMutation.mutate(id);
        }
    };

    const closeSkillPanel = () => {
        setIsSkillFormOpen(false);
        setSkillEditingId(null);
        setSkillForm(emptySkillForm);
    };

    const deselectSkillEditing = () => {
        setSkillEditingId(null);
        setSkillForm(emptySkillForm);
    };

    const openSkillEditor = async (skill: Skill) => {
        try {
            const connections = await connectionApi.getWorkspaceSkill(workspaceSlug, skill.id);
            setSkillEditingId(skill.id);
            setSkillForm({
                catalogSkillId: skill.id,
                name: skill.name,
                category: skill.category,
                skillLevel: skill.skillLevel ?? '',
                skillVersion: skill.skillVersion ?? '',
                comment: skill.comment ?? '',
                usageType: skill.usageType ?? 'LEARNING',
                badgeKey: skill.badgeKey ?? '',
                badgeColor: skill.badgeColor ?? '',
                isCore: skill.isCore,
                displayOrder: skill.displayOrder,
                ...connections,
            });
            setIsSkillFormOpen(true);
        } catch (error) {
            handleMutationError(error);
        }
    };

    return (
        <div className="space-y-4">
            <AdminPageHeader
                eyebrow="Source Record"
                title="내 기술 스택"
                description="공통 기술 카탈로그에서 선택하고 이 Workspace의 실무 경험과 활용 정보를 연결합니다."
                actions={
                    <button
                        onClick={() => {
                            setSkillEditingId(null);
                            setSkillForm(emptySkillForm);
                            setIsSkillFormOpen(true);
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" /> 카탈로그 기술 추가
                    </button>
                }
            />

            <div className="sticky top-14 z-20 flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white/95 p-2.5 rounded-xl border border-slate-200 shadow-sm backdrop-blur-xl animate-fadeIn">
                <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                    {skillCategoryFilters.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSkillFilter(cat)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${skillFilter === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'}`}
                        >
                            {skillCategoryFilterLabels[cat]}
                        </button>
                    ))}
                </div>
                <div className="w-full sm:w-56">
                    <input
                        type="text"
                        placeholder="기술명 검색..."
                        value={skillSearch}
                        onChange={(e) => setSkillSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                    />
                </div>
            </div>

            {isSkillFormOpen && (
                <SkillWorkbenchPanel
                    skillsList={skillsList}
                    availableCatalogSkills={availableCatalogSkills}
                    skillEditingId={skillEditingId}
                    skillForm={skillForm}
                    setSkillForm={setSkillForm}
                    studies={studies}
                    experiencesList={experiencesList}
                    onQuickAdd={handleQuickAddSkill}
                    quickAddPendingId={
                        createSkillMutation.isPending
                            ? (createSkillMutation.variables?.catalogSkillId ?? null)
                            : null
                    }
                    onSelectSkill={(skill) => {
                        void openSkillEditor(skill);
                    }}
                    onDeselect={deselectSkillEditing}
                    onSaveEdit={handleSkillEditSubmit}
                    onDeleteSkill={handleSkillDelete}
                    onClose={closeSkillPanel}
                    isSaving={updateSkillMutation.isPending}
                    proposals={skillProposals}
                    onPropose={handlePropose}
                    isProposing={proposeSkillMutation.isPending}
                />
            )}

            {!isSkillFormOpen && (
                <>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                        <span className="font-black text-slate-400">현재 결과</span>
                        <span className="rounded bg-slate-900 px-2 py-1 font-black text-white">
                            전체 {filteredSkillSummary.total}
                        </span>
                        <span className="border-l border-slate-200 pl-3 font-bold text-slate-600">
                            Core <b className="text-slate-900">{filteredSkillSummary.core}</b>
                        </span>
                        <span className="border-l border-slate-200 pl-3 font-bold text-slate-500">
                            실무 경험 <b className="text-slate-800">{filteredSkillSummary.work}</b>
                        </span>
                        <span className="border-l border-slate-200 pl-3 font-bold text-slate-500">
                            프로젝트 활용{' '}
                            <b className="text-slate-800">{filteredSkillSummary.project}</b>
                        </span>
                        <span className="border-l border-slate-200 pl-3 font-bold text-slate-500">
                            학습 <b className="text-slate-800">{filteredSkillSummary.learning}</b>
                        </span>
                    </div>

                    {groupedFilteredSkills.length > 0 ? (
                        <div className="space-y-4">
                            {groupedFilteredSkills.map(({ category, skills }) => (
                                <SkillGroupSection
                                    key={category.key}
                                    category={category}
                                    skills={skills}
                                    onEdit={(skill) => {
                                        void openSkillEditor(skill);
                                    }}
                                    onDelete={handleSkillDelete}
                                    onToggleCore={(skill) => toggleCoreSkillMutation.mutate(skill)}
                                    updatingCoreSkillId={
                                        toggleCoreSkillMutation.isPending
                                            ? toggleCoreSkillMutation.variables?.id
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                            <p className="text-sm font-black text-slate-600">
                                조건에 맞는 기술이 없습니다.
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                카테고리나 검색어를 변경해보세요.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
