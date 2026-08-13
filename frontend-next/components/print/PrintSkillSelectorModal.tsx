'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, Cpu, Plus, RotateCcw, Search, X } from 'lucide-react';
import type { PrintTemplateContentOverrides, Skill } from '@/lib/api/types';
import { getSkillOutputGroup, type SkillOutputGroup } from '@/lib/introDerivations';

type Props = {
    workspaceSkills: Skill[];
    catalogSkills: Skill[];
    selectedSkillIds?: number[] | null;
    skillGroupOverrides?: PrintTemplateContentOverrides['skillGroupOverrides'];
    addingCatalogSkillId?: number | null;
    onToggleSkill: (skillId: number) => void;
    onMoveSkill: (skillId: number, group: SkillOutputGroup) => void;
    onAddCatalogSkill: (skill: Skill, group: SkillOutputGroup) => Promise<void>;
    onResetToDefault: () => void;
    onClose: () => void;
};

const GROUPS: Array<{ value: SkillOutputGroup; label: string; description: string }> = [
    {
        value: 'CORE',
        label: '핵심 기술',
        description: '직무의 중심이 되는 실무 기술',
    },
    {
        value: 'PROJECT_LEARNING',
        label: '프로젝트·학습',
        description: '프로젝트에서 활용했거나 학습 중인 기술',
    },
];

type SelectorView = 'SELECTED' | 'CATALOG';

export function PrintSkillSelectorModal({
    workspaceSkills,
    catalogSkills,
    selectedSkillIds,
    skillGroupOverrides,
    addingCatalogSkillId = null,
    onToggleSkill,
    onMoveSkill,
    onAddCatalogSkill,
    onResetToDefault,
    onClose,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<SelectorView>('SELECTED');
    const selectedSet = useMemo(
        () =>
            new Set(
                selectedSkillIds ??
                    workspaceSkills.filter((skill) => skill.isCore).map((skill) => skill.id)
            ),
        [selectedSkillIds, workspaceSkills]
    );
    const outputGroup = (skill: Skill): SkillOutputGroup =>
        skillGroupOverrides?.[String(skill.id)] ?? getSkillOutputGroup(skill);
    const query = searchQuery.trim().toLocaleLowerCase();
    const searchResults = useMemo(() => {
        if (!query) return catalogSkills;
        return catalogSkills.filter(
            (skill) =>
                skill.name.toLocaleLowerCase().includes(query) ||
                skill.category.toLocaleLowerCase().includes(query)
        );
    }, [catalogSkills, query]);
    const unselectedWorkspaceSkills = workspaceSkills.filter((skill) => !selectedSet.has(skill.id));
    const includeWorkspaceSkill = (skill: Skill, group: SkillOutputGroup) => {
        onMoveSkill(skill.id, group);
        if (!selectedSet.has(skill.id)) {
            onToggleSkill(skill.id);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm print:hidden"
            onClick={onClose}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                            <Cpu className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-900">
                                출력 기술 스택 구성
                            </h3>
                            <p className="text-xs font-semibold text-slate-500">
                                {selectedSet.size}개 노출 · Workspace 원본 {workspaceSkills.length}
                                개 · 공용 카탈로그 {catalogSkills.length}개
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                        aria-label="기술 스택 구성 닫기"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="border-b border-slate-100 px-6 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div
                            className="flex rounded-xl bg-slate-100 p-1"
                            role="tablist"
                            aria-label="기술 스택 구성 화면"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeView === 'SELECTED'}
                                onClick={() => setActiveView('SELECTED')}
                                className={`rounded-lg px-3 py-2 text-xs font-black transition ${activeView === 'SELECTED' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
                            >
                                선택된 기술 {selectedSet.size}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeView === 'CATALOG'}
                                onClick={() => setActiveView('CATALOG')}
                                className={`rounded-lg px-3 py-2 text-xs font-black transition ${activeView === 'CATALOG' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
                            >
                                카탈로그에서 추가 {catalogSkills.length}
                            </button>
                        </div>
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={onResetToDefault}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                        >
                            <RotateCcw className="h-4 w-4" /> 원본 기본값으로 초기화
                        </button>
                    </div>
                    {activeView === 'CATALOG' && (
                        <div className="relative mt-3">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder={`공용 카탈로그 ${catalogSkills.length}개 검색 (예: TypeScript)`}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    )}
                </div>

                <main className="flex-1 space-y-5 overflow-y-auto p-6">
                    {activeView === 'CATALOG' ? (
                        <section className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4">
                            <div className="mb-3 flex items-center justify-between border-b border-blue-100 pb-3">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900">
                                        {query ? '공용 카탈로그 검색 결과' : '공용 기술 카탈로그'}
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Workspace에 없는 기술은 원본에 먼저 추가한 뒤 현재 템플릿에
                                        배치합니다.
                                    </p>
                                </div>
                                <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                                    {searchResults.length}개
                                </span>
                            </div>
                            {searchResults.length === 0 ? (
                                <p className="py-8 text-center text-sm font-bold text-slate-400">
                                    일치하는 기술이 없습니다.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {searchResults.map((catalogSkill) => {
                                        const workspaceSkill = workspaceSkills.find(
                                            (skill) => skill.id === catalogSkill.id
                                        );
                                        const isSelected = workspaceSkill
                                            ? selectedSet.has(workspaceSkill.id)
                                            : false;
                                        return (
                                            <div
                                                key={catalogSkill.id}
                                                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
                                            >
                                                <div className="min-w-[150px] flex-1">
                                                    <p className="text-sm font-black text-slate-900">
                                                        {catalogSkill.name}
                                                    </p>
                                                    <p className="text-[11px] font-semibold text-slate-400">
                                                        {catalogSkill.category}
                                                    </p>
                                                </div>
                                                {workspaceSkill ? (
                                                    <>
                                                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                                            원본에 있음
                                                        </span>
                                                        {isSelected ? (
                                                            <>
                                                                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                                                                    {GROUPS.find(
                                                                        (group) =>
                                                                            group.value ===
                                                                            outputGroup(
                                                                                workspaceSkill
                                                                            )
                                                                    )?.label ?? '출력 중'}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onMoveSkill(
                                                                            workspaceSkill.id,
                                                                            outputGroup(
                                                                                workspaceSkill
                                                                            ) === 'CORE'
                                                                                ? 'PROJECT_LEARNING'
                                                                                : 'CORE'
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                                                                >
                                                                    영역 이동
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onToggleSkill(
                                                                            workspaceSkill.id
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                                                                >
                                                                    출력 제외
                                                                </button>
                                                            </>
                                                        ) : (
                                                            GROUPS.map((group) => (
                                                                <button
                                                                    type="button"
                                                                    key={group.value}
                                                                    onClick={() =>
                                                                        includeWorkspaceSkill(
                                                                            workspaceSkill,
                                                                            group.value
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                                                                >
                                                                    {group.label}에 포함
                                                                </button>
                                                            ))
                                                        )}
                                                    </>
                                                ) : (
                                                    GROUPS.map((group) => (
                                                        <button
                                                            type="button"
                                                            key={group.value}
                                                            disabled={
                                                                addingCatalogSkillId ===
                                                                catalogSkill.id
                                                            }
                                                            onClick={() =>
                                                                void onAddCatalogSkill(
                                                                    catalogSkill,
                                                                    group.value
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />{' '}
                                                            {group.label}에 추가
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                {GROUPS.map((group) => {
                                    const skills = workspaceSkills.filter(
                                        (skill) =>
                                            selectedSet.has(skill.id) &&
                                            outputGroup(skill) === group.value
                                    );
                                    const otherGroup = GROUPS.find(
                                        (candidate) => candidate.value !== group.value
                                    )!;
                                    return (
                                        <section
                                            key={group.value}
                                            className="min-h-44 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                                        >
                                            <div className="mb-3 border-b border-slate-200 pb-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-black text-slate-900">
                                                        {group.label}
                                                    </h4>
                                                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">
                                                        {skills.length}개
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                                    {group.description}
                                                </p>
                                            </div>
                                            {skills.length === 0 ? (
                                                <p className="py-6 text-center text-xs font-bold text-slate-400">
                                                    배치된 기술이 없습니다.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {skills.map((skill) => (
                                                        <div
                                                            key={skill.id}
                                                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5"
                                                        >
                                                            <span className="min-w-0 flex-1 truncate text-xs font-black text-slate-800">
                                                                {skill.name}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onMoveSkill(
                                                                        skill.id,
                                                                        otherGroup.value
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200"
                                                                title={`${otherGroup.label}으로 이동`}
                                                            >
                                                                <ArrowLeftRight className="h-3 w-3" />{' '}
                                                                이동
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onToggleSkill(skill.id)
                                                                }
                                                                className="rounded-md px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50"
                                                            >
                                                                제외
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
                            </div>

                            {unselectedWorkspaceSkills.length > 0 && (
                                <section className="rounded-2xl border border-slate-200 p-4">
                                    <h4 className="text-sm font-black text-slate-900">
                                        Workspace 원본의 미노출 기술
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-500">
                                        클릭하면 원본의 활용 구분에 맞는 위치로 추가됩니다.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {unselectedWorkspaceSkills.map((skill) => (
                                            <button
                                                type="button"
                                                key={skill.id}
                                                onClick={() => onToggleSkill(skill.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                                            >
                                                <Plus className="h-3.5 w-3.5" /> {skill.name}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </main>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-3.5">
                    <p className="text-xs font-semibold text-slate-500">
                        <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-600" /> 배치 변경은
                        현재 출력 템플릿에만 적용됩니다.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                    >
                        구성 완료
                    </button>
                </footer>
            </div>
        </div>
    );
}
