'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { ApiError, skillApi, connectionApi, studyApi, experienceApi } from '@/lib/api';
import type { Skill } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';
import { SkillBadgeIcon } from '@/lib/SkillBadgeIcon';
import { SkillGroupSection } from './SkillGroupSection';
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

const skillUsageOptions = [
    { value: 'LEARNING', label: '학습' },
    { value: 'WORK_EXPERIENCE', label: '실무 경험' },
    { value: 'PROJECT_USE', label: '프로젝트 활용' },
];

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

    const [skillFilter, setSkillFilter] = useState('ALL');
    const [skillSearch, setSkillSearch] = useState('');
    const [skillStudySearch, setSkillStudySearch] = useState('');
    const [skillExperienceSearch, setSkillExperienceSearch] = useState('');
    const [skillDetailSearch, setSkillDetailSearch] = useState('');
    const [skillEditingId, setSkillEditingId] = useState<number | null>(null);
    const [skillForm, setSkillForm] = useState<SkillForm>(emptySkillForm);
    const [isSkillFormOpen, setIsSkillFormOpen] = useState(false);
    const setSkillDraft = useAdminPreviewStore((s) => s.setSkillDraft);
    const selectedCatalogSkill = catalogSkills.find(
        (catalogSkill) => catalogSkill.id === skillForm.catalogSkillId
    );

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

    const connectionStudies = (studies ?? []).filter(
        (study) =>
            !skillStudySearch || study.title.toLowerCase().includes(skillStudySearch.toLowerCase())
    );
    const connectionExperiences = (experiencesList ?? []).filter(
        (experience) =>
            !skillExperienceSearch ||
            experience.title.toLowerCase().includes(skillExperienceSearch.toLowerCase()) ||
            experience.type.toLowerCase().includes(skillExperienceSearch.toLowerCase())
    );
    const connectionDetails = (experiencesList ?? [])
        .flatMap((experience) =>
            experience.details.map((detail) => ({ ...detail, experienceTitle: experience.title }))
        )
        .filter(
            (detail) =>
                !skillDetailSearch ||
                detail.content.toLowerCase().includes(skillDetailSearch.toLowerCase()) ||
                detail.experienceTitle.toLowerCase().includes(skillDetailSearch.toLowerCase())
        );

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
            setSkillForm(emptySkillForm);
            setIsSkillFormOpen(false);
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
            setIsSkillFormOpen(false);
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

    const deleteSkillMutation = useMutation({
        mutationFn: (id: number) => skillApi.workspaceRemove(workspaceSlug, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
        },
        onError: handleMutationError,
    });

    const handleSkillSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (skillEditingId !== null) {
            updateSkillMutation.mutate({ id: skillEditingId, payload: skillForm });
        } else {
            createSkillMutation.mutate(skillForm);
        }
    };

    const handleSkillDelete = (id: number) => {
        if (window.confirm('정말 이 기술 스택을 삭제하시겠습니까?')) {
            deleteSkillMutation.mutate(id);
        }
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
        <div className="space-y-6">
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

            <div className="sticky top-14 z-20 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/95 p-4 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-xl animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                    {skillCategoryFilters.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSkillFilter(cat)}
                            className={`px-3 py-1.5 text-sm font-bold rounded-lg transition ${skillFilter === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'}`}
                        >
                            {skillCategoryFilterLabels[cat]}
                        </button>
                    ))}
                </div>
                <div className="w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="기술명 검색..."
                        value={skillSearch}
                        onChange={(e) => setSkillSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                    />
                </div>
            </div>

            {isSkillFormOpen && (
                <form
                    onSubmit={handleSkillSubmit}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h3 className="text-base font-black text-slate-800">
                        {skillEditingId !== null
                            ? 'Workspace 기술 정보 수정'
                            : '카탈로그 기술 추가'}
                    </h3>
                    <div>
                        {skillEditingId === null ? (
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                    공통 기술 카탈로그
                                </label>
                                <select
                                    required
                                    value={skillForm.catalogSkillId ?? ''}
                                    onChange={(event) => {
                                        if (!event.target.value) {
                                            setSkillForm((current) => ({
                                                ...current,
                                                catalogSkillId: null,
                                                name: '',
                                                category: 'ETC',
                                                badgeKey: '',
                                                badgeColor: '',
                                            }));
                                            return;
                                        }
                                        const catalogSkillId = Number(event.target.value);
                                        const catalogSkill = catalogSkills.find(
                                            (skill) => skill.id === catalogSkillId
                                        );
                                        setSkillForm((current) => ({
                                            ...current,
                                            catalogSkillId,
                                            name: catalogSkill?.name ?? '',
                                            category: catalogSkill?.category ?? 'ETC',
                                            badgeKey: catalogSkill?.badgeKey ?? '',
                                            badgeColor: catalogSkill?.badgeColor ?? '',
                                        }));
                                    }}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                >
                                    <option value="">기술을 선택해 주세요</option>
                                    {availableCatalogSkills.map((skill) => (
                                        <option key={skill.id} value={skill.id}>
                                            {skill.name} ·{' '}
                                            {getSkillCategoryPresentation(skill.category).label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        {selectedCatalogSkill ? (
                            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <SkillBadgeIcon
                                    name={selectedCatalogSkill.name}
                                    badgeKey={selectedCatalogSkill.badgeKey}
                                    badgeColor={selectedCatalogSkill.badgeColor}
                                    className="h-9 w-9"
                                />
                                <div className="min-w-0">
                                    <p className="font-black text-slate-900">
                                        {selectedCatalogSkill.name}
                                    </p>
                                    <p className="text-xs font-semibold text-slate-500">
                                        {
                                            getSkillCategoryPresentation(
                                                selectedCatalogSkill.category
                                            ).label
                                        }
                                    </p>
                                </div>
                            </div>
                        ) : null}
                        <p className="mt-2 text-xs font-medium text-slate-500">
                            이름·분류·뱃지는 플랫폼 공통 카탈로그 정의입니다. 이 Workspace에서는
                            실무 수준, 사용 맥락과 경험 메모만 관리합니다.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                실무 수준
                            </label>
                            <input
                                type="text"
                                value={skillForm.skillLevel}
                                placeholder="예: 중급, 고급, 상"
                                onChange={(e) =>
                                    setSkillForm({ ...skillForm, skillLevel: e.target.value })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                사용 버전
                            </label>
                            <input
                                type="text"
                                value={skillForm.skillVersion}
                                placeholder="예: 21, 3.3, 19"
                                onChange={(e) =>
                                    setSkillForm({ ...skillForm, skillVersion: e.target.value })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                활용 맥락
                            </label>
                            <select
                                value={skillForm.usageType}
                                onChange={(e) =>
                                    setSkillForm({ ...skillForm, usageType: e.target.value })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                {skillUsageOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                정렬 순서
                            </label>
                            <input
                                type="number"
                                required
                                value={skillForm.displayOrder}
                                onChange={(e) =>
                                    setSkillForm({
                                        ...skillForm,
                                        displayOrder: Number(e.target.value),
                                    })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={skillForm.isCore}
                                    onChange={(e) =>
                                        setSkillForm({ ...skillForm, isCore: e.target.checked })
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                                />
                                <span className="text-xs font-bold text-slate-600 uppercase">
                                    핵심기술로 표시
                                </span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            경험 메모
                        </label>
                        <textarea
                            rows={3}
                            value={skillForm.comment}
                            placeholder="이 기술을 어느 수준으로, 어디에 활용했는지 짧게 남깁니다."
                            onChange={(e) =>
                                setSkillForm({ ...skillForm, comment: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                관련 Study · {skillForm.studyIds.length}개
                            </label>
                            <input
                                type="search"
                                value={skillStudySearch}
                                onChange={(event) => setSkillStudySearch(event.target.value)}
                                placeholder="Study 제목 검색"
                                className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-800"
                            />
                            <div className="max-h-48 space-y-1.5 overflow-auto">
                                {connectionStudies.map((study) => (
                                    <label
                                        key={study.id}
                                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={skillForm.studyIds.includes(study.id)}
                                            onChange={() =>
                                                setSkillForm((current) => ({
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

                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                관련 프로젝트·이력 · {skillForm.experienceIds.length}개
                            </label>
                            <input
                                type="search"
                                value={skillExperienceSearch}
                                onChange={(event) => setSkillExperienceSearch(event.target.value)}
                                placeholder="제목 또는 유형 검색"
                                className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-800"
                            />
                            <div className="max-h-48 space-y-1.5 overflow-auto">
                                {connectionExperiences.map((experience) => (
                                    <label
                                        key={experience.id}
                                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={skillForm.experienceIds.includes(
                                                experience.id
                                            )}
                                            onChange={() =>
                                                setSkillForm((current) => ({
                                                    ...current,
                                                    experienceIds: current.experienceIds.includes(
                                                        experience.id
                                                    )
                                                        ? current.experienceIds.filter(
                                                              (id) => id !== experience.id
                                                          )
                                                        : [...current.experienceIds, experience.id],
                                                }))
                                            }
                                            className="mt-0.5"
                                        />
                                        <span>
                                            <b className="mr-1 text-slate-400">{experience.type}</b>
                                            {experience.title}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                관련 경력 상세 · {skillForm.experienceDetailIds.length}개
                            </label>
                            <input
                                type="search"
                                value={skillDetailSearch}
                                onChange={(event) => setSkillDetailSearch(event.target.value)}
                                placeholder="경력 또는 상세 내용 검색"
                                className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-800"
                            />
                            <div className="max-h-48 space-y-1.5 overflow-auto">
                                {connectionDetails.map((detail) => (
                                    <label
                                        key={detail.id}
                                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={skillForm.experienceDetailIds.includes(
                                                detail.id
                                            )}
                                            onChange={() =>
                                                setSkillForm((current) => ({
                                                    ...current,
                                                    experienceDetailIds:
                                                        current.experienceDetailIds.includes(
                                                            detail.id
                                                        )
                                                            ? current.experienceDetailIds.filter(
                                                                  (id) => id !== detail.id
                                                              )
                                                            : [
                                                                  ...current.experienceDetailIds,
                                                                  detail.id,
                                                              ],
                                                }))
                                            }
                                            className="mt-0.5"
                                        />
                                        <span>
                                            <b className="block text-slate-400">
                                                {detail.experienceTitle}
                                            </b>
                                            {detail.content}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsSkillFormOpen(false)}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={
                                createSkillMutation.isPending || updateSkillMutation.isPending
                            }
                            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                        >
                            {skillEditingId !== null ? '수정 완료' : '추가 완료'}
                        </button>
                    </div>
                </form>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm">
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
                    프로젝트 활용 <b className="text-slate-800">{filteredSkillSummary.project}</b>
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
                    <p className="mt-1 text-xs text-slate-400">카테고리나 검색어를 변경해보세요.</p>
                </div>
            )}
        </div>
    );
}
