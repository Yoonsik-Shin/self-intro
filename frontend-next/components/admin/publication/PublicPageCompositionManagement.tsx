'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Save } from 'lucide-react';
import {
    publicPageApi,
    taxonomySchemeApi,
    type PublicExperienceDraft,
    type PublicProfileDraft,
    type PublicStudyDraft,
    type TaxonomyScheme,
} from '@/lib/api';

type Section = 'profile' | 'experience' | 'study';
type PublicDraft = PublicProfileDraft | PublicExperienceDraft | PublicStudyDraft;

const SECTION_COPY: Record<Section, { eyebrow: string; title: string; description: string }> = {
    profile: {
        eyebrow: 'PUBLIC PROFILE DRAFT',
        title: '프로필 구성',
        description: '원본 프로필을 바꾸지 않고 공개할 필드·기술·역량만 선택합니다.',
    },
    experience: {
        eyebrow: 'PUBLIC EXPERIENCE DRAFT',
        title: '경험 구성',
        description:
            '경험과 세부 성과, 타임라인, 대표 배치와 포트폴리오 노출을 한곳에서 구성합니다.',
    },
    study: {
        eyebrow: 'PUBLIC STUDY DRAFT',
        title: '학습 구성',
        description: '공개할 학습 기록과 방문자 탐색에 사용할 카테고리를 선택합니다.',
    },
};

export function PublicPageCompositionManagement({
    workspaceSlug,
    section,
}: {
    workspaceSlug: string;
    section: Section;
}) {
    const queryClient = useQueryClient();
    const queryKey = ['workspace', workspaceSlug, 'public-page-draft', section];
    const query = useQuery<PublicDraft>({
        queryKey,
        queryFn: async (): Promise<PublicDraft> => {
            if (section === 'profile') return publicPageApi.profile(workspaceSlug);
            if (section === 'experience') return publicPageApi.experience(workspaceSlug);
            return publicPageApi.study(workspaceSlug);
        },
    });
    const [localDraft, setLocalDraft] = useState<PublicDraft | null>(null);
    const draft = localDraft ?? query.data ?? null;

    const mutation = useMutation({
        mutationFn: async () => {
            if (!draft) throw new Error('저장할 공개 구성이 없습니다.');
            if (section === 'profile') {
                return publicPageApi.updateProfile(workspaceSlug, draft as PublicProfileDraft);
            }
            if (section === 'experience') {
                return publicPageApi.updateExperience(
                    workspaceSlug,
                    draft as PublicExperienceDraft
                );
            }
            return publicPageApi.updateStudy(workspaceSlug, draft as PublicStudyDraft);
        },
        onSuccess: (saved) => {
            queryClient.setQueryData(queryKey, saved);
            setLocalDraft(saved);
        },
    });

    const copy = SECTION_COPY[section];
    if (query.isLoading || !draft) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
                구성 불러오는 중…
            </div>
        );
    }
    if (query.isError) {
        return (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
                공개 구성을 불러오지 못했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <p className="text-xs font-black tracking-[0.18em] text-indigo-600">
                        {copy.eyebrow}
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-slate-950">{copy.title}</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">{copy.description}</p>
                </div>
                <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50"
                >
                    <Save size={17} /> {mutation.isPending ? '저장 중…' : '초안 저장'}
                </button>
            </header>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm font-semibold text-indigo-900">
                여기서 저장한 내용은 초안입니다. 방문자 화면은 ‘전체 공개본 발행’을 실행할 때만
                바뀝니다.
            </div>

            {section === 'profile' && (
                <ProfileEditor
                    draft={draft as PublicProfileDraft}
                    onChange={(next) => setLocalDraft(next)}
                />
            )}
            {section === 'experience' && (
                <ExperienceEditor
                    draft={draft as PublicExperienceDraft}
                    onChange={(next) => setLocalDraft(next)}
                />
            )}
            {section === 'study' && (
                <StudyEditor
                    workspaceSlug={workspaceSlug}
                    draft={draft as PublicStudyDraft}
                    onChange={(next) => setLocalDraft(next)}
                />
            )}

            {mutation.isSuccess && (
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <Check size={16} /> 공개 구성 초안을 저장했습니다.
                </p>
            )}
            {mutation.isError && (
                <p className="text-sm font-bold text-red-700">초안을 저장하지 못했습니다.</p>
            )}
        </div>
    );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-slate-900">{title}</h3>
            <div className="divide-y divide-slate-100">{children}</div>
        </section>
    );
}

function ToggleRow({
    label,
    checked,
    onChange,
    detail,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    detail?: string;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 py-3.5">
            <span>
                <span className="block text-sm font-bold text-slate-800">{label}</span>
                {detail && <span className="mt-1 block text-xs text-slate-500">{detail}</span>}
            </span>
            <span className="flex items-center gap-2 text-xs font-black text-slate-500">
                {checked ? <Eye size={17} /> : <EyeOff size={17} />}
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onChange(event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 accent-slate-950"
                />
            </span>
        </label>
    );
}

function ProfileEditor({
    draft,
    onChange,
}: {
    draft: PublicProfileDraft;
    onChange: (draft: PublicProfileDraft) => void;
}) {
    const fields: Array<[keyof PublicProfileDraft, string]> = [
        ['showName', '이름'],
        ['showNameEn', '영문 이름'],
        ['showJobTitle', '직무 제목'],
        ['showBio', '소개'],
        ['showCoreStackSummary', '핵심 기술 요약'],
        ['showStatusBadge', '현재 상태 배지'],
        ['showGithub', 'GitHub'],
        ['showEmail', '이메일'],
        ['showPhone', '전화번호'],
    ];
    return (
        <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="프로필 필드">
                {fields.map(([key, label]) => (
                    <ToggleRow
                        key={key}
                        label={label}
                        checked={draft[key] as boolean}
                        onChange={(checked) => onChange({ ...draft, [key]: checked })}
                    />
                ))}
            </SectionCard>
            <div className="space-y-6">
                <SectionCard title="공개 기술">
                    {draft.skills.map((item, index) => (
                        <ToggleRow
                            key={item.id}
                            label={item.label}
                            checked={item.enabled}
                            detail={item.featured ? '대표 기술' : undefined}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    skills: draft.skills.map((value, itemIndex) =>
                                        itemIndex === index ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
                <SectionCard title="대표 역량">
                    {draft.competencies.map((item, index) => (
                        <ToggleRow
                            key={item.id}
                            label={item.label}
                            checked={item.enabled}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    competencies: draft.competencies.map((value, itemIndex) =>
                                        itemIndex === index ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
            </div>
        </div>
    );
}

function ExperienceEditor({
    draft,
    onChange,
}: {
    draft: PublicExperienceDraft;
    onChange: (draft: PublicExperienceDraft) => void;
}) {
    return (
        <div className="space-y-6">
            <SectionCard title="공개 경험·타임라인">
                {draft.experiences.map((item, index) => (
                    <div key={item.id} className="py-4">
                        <ToggleRow
                            label={item.title}
                            checked={item.enabled}
                            detail={item.showOnTimeline ? '타임라인 노출' : '타임라인 숨김'}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    experiences: draft.experiences.map((value, itemIndex) =>
                                        itemIndex === index ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                        <label className="ml-4 flex items-center gap-2 text-xs font-bold text-slate-600">
                            <input
                                type="checkbox"
                                checked={item.showOnTimeline}
                                onChange={(event) =>
                                    onChange({
                                        ...draft,
                                        experiences: draft.experiences.map((value, itemIndex) =>
                                            itemIndex === index
                                                ? { ...value, showOnTimeline: event.target.checked }
                                                : value
                                        ),
                                    })
                                }
                            />
                            공개 타임라인에 표시
                        </label>
                    </div>
                ))}
            </SectionCard>
            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="세부 성과">
                    {draft.details.map((item, index) => (
                        <ToggleRow
                            key={item.id}
                            label={item.label}
                            checked={item.enabled}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    details: draft.details.map((value, itemIndex) =>
                                        itemIndex === index ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
                <SectionCard title="포트폴리오 사례">
                    {draft.portfolios.length === 0 && (
                        <p className="py-4 text-sm text-slate-500">
                            작성된 포트폴리오 사례가 없습니다.
                        </p>
                    )}
                    {draft.portfolios.map((item, index) => (
                        <ToggleRow
                            key={item.id}
                            label={item.title}
                            checked={item.enabled}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    portfolios: draft.portfolios.map((value, itemIndex) =>
                                        itemIndex === index ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
            </div>
            <SectionCard title="대표 프로젝트">
                {draft.placements.map((item, index) => {
                    const experience = draft.experiences.find(
                        (candidate) => candidate.id === item.experienceId
                    );
                    return (
                        <ToggleRow
                            key={`${item.experienceId}-${item.placementType}`}
                            label={experience?.title ?? `경험 #${item.experienceId}`}
                            checked={item.enabled}
                            detail="공개 페이지 대표 프로젝트 영역"
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    placements: draft.placements.map((value, itemIndex) =>
                                        itemIndex === index ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    );
                })}
            </SectionCard>
        </div>
    );
}

function StudyEditor({
    workspaceSlug,
    draft,
    onChange,
}: {
    workspaceSlug: string;
    draft: PublicStudyDraft;
    onChange: (draft: PublicStudyDraft) => void;
}) {
    const queryClient = useQueryClient();
    const catalog = useQuery({
        queryKey: ['workspace', workspaceSlug, 'taxonomy-schemes', 'catalog'],
        queryFn: () => taxonomySchemeApi.catalog(workspaceSlug),
    });
    const subscriptions = useQuery({
        queryKey: ['workspace', workspaceSlug, 'taxonomy-schemes', 'subscriptions'],
        queryFn: () => taxonomySchemeApi.subscriptions(workspaceSlug),
    });
    const [selectedSchemeIds, setSelectedSchemeIds] = useState<number[] | null>(null);
    const [primarySchemeId, setPrimarySchemeId] = useState<number | null>(null);
    const effectiveSchemeIds =
        selectedSchemeIds ?? subscriptions.data?.map((scheme) => scheme.id) ?? [];
    const effectivePrimarySchemeId =
        primarySchemeId ??
        subscriptions.data?.find((scheme) => scheme.primaryScheme)?.id ??
        effectiveSchemeIds[0] ??
        null;
    const schemeMutation = useMutation({
        mutationFn: () => {
            if (effectiveSchemeIds.length === 0 || effectivePrimarySchemeId === null) {
                throw new Error('분류 체계를 하나 이상 선택해 주세요.');
            }
            return taxonomySchemeApi.replace(
                workspaceSlug,
                effectiveSchemeIds,
                effectivePrimarySchemeId
            );
        },
        onSuccess: async () => {
            setSelectedSchemeIds(null);
            setPrimarySchemeId(null);
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['workspace', workspaceSlug, 'taxonomy-schemes'],
                }),
                queryClient.invalidateQueries({
                    queryKey: ['workspace', workspaceSlug, 'public-page-draft', 'study'],
                }),
            ]);
        },
    });

    const toggleScheme = (scheme: TaxonomyScheme) => {
        const next = effectiveSchemeIds.includes(scheme.id)
            ? effectiveSchemeIds.filter((id) => id !== scheme.id)
            : [...effectiveSchemeIds, scheme.id];
        if (next.length === 0) return;
        setSelectedSchemeIds(next);
        if (!next.includes(effectivePrimarySchemeId ?? -1)) setPrimarySchemeId(next[0]);
    };

    return (
        <div className="space-y-6">
            <SectionCard title="학습 분류 체계">
                <p className="py-3 text-sm text-slate-500">
                    직군에 맞는 분류 체계를 선택합니다. 여러 체계를 함께 쓸 수 있으며 대표 체계는
                    공개 학습 탐색의 기본 분류가 됩니다.
                </p>
                {(catalog.data ?? []).map((scheme) => {
                    const selected = effectiveSchemeIds.includes(scheme.id);
                    return (
                        <div
                            key={scheme.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                        >
                            <label className="flex min-w-0 cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleScheme(scheme)}
                                    className="mt-1 h-5 w-5 rounded border-slate-300 accent-slate-950"
                                />
                                <span>
                                    <span className="block text-sm font-black text-slate-800">
                                        {scheme.name}{' '}
                                        <span className="text-slate-400">v{scheme.version}</span>
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-500">
                                        {scheme.description}
                                    </span>
                                </span>
                            </label>
                            {selected && (
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <input
                                        type="radio"
                                        name="primary-taxonomy-scheme"
                                        checked={effectivePrimarySchemeId === scheme.id}
                                        onChange={() => setPrimarySchemeId(scheme.id)}
                                    />
                                    대표 체계
                                </label>
                            )}
                        </div>
                    );
                })}
                <div className="flex items-center justify-end gap-3 py-3">
                    {schemeMutation.isError && (
                        <span className="text-xs font-bold text-red-700">
                            분류 체계를 저장하지 못했습니다.
                        </span>
                    )}
                    <button
                        type="button"
                        disabled={selectedSchemeIds === null || schemeMutation.isPending}
                        onClick={() => schemeMutation.mutate()}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                    >
                        분류 체계 적용
                    </button>
                </div>
            </SectionCard>
            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="공개 학습 기록">
                    {draft.studies.map((item, index) => (
                        <ToggleRow
                            key={item.id}
                            label={item.title}
                            checked={item.enabled}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    studies: draft.studies.map((value, itemIndex) =>
                                        itemIndex === index ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
                <SectionCard title="공개 탐색 카테고리">
                    {draft.taxonomy.map((item, index) => (
                        <ToggleRow
                            key={item.id}
                            label={item.displayLabel || item.label}
                            checked={item.enabled}
                            detail={`분류 체계 #${item.schemeId}`}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    taxonomy: draft.taxonomy.map((value, itemIndex) =>
                                        itemIndex === index ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
            </div>
        </div>
    );
}
