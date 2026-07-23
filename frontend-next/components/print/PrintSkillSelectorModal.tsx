'use client';

import { useMemo, useState } from 'react';
import { Search, X, Check, Plus, Cpu, RotateCcw } from 'lucide-react';
import type { Skill } from '@/lib/api/types';
import { groupCoreSkills } from '@/lib/introDerivations';

type Props = {
    allSkills: Skill[];
    selectedSkillIds?: number[] | null;
    onToggleSkill: (skillId: number) => void;
    onSelectAllInGroup: (skillIds: number[]) => void;
    onDeselectAllInGroup: (skillIds: number[]) => void;
    onResetToAll: () => void;
    onClose: () => void;
};

export function PrintSkillSelectorModal({
    allSkills,
    selectedSkillIds,
    onToggleSkill,
    onSelectAllInGroup,
    onDeselectAllInGroup,
    onResetToAll,
    onClose,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');

    const groupedSkills = useMemo(() => groupCoreSkills(allSkills), [allSkills]);

    // Currently selected skill ID set (if selectedSkillIds is undefined or null, all skills are selected by default)
    const isAllSelectedByDefault = !selectedSkillIds;
    const selectedSet = useMemo(() => {
        if (isAllSelectedByDefault) {
            return new Set(allSkills.map((s) => s.id));
        }
        return new Set(selectedSkillIds);
    }, [isAllSelectedByDefault, allSkills, selectedSkillIds]);

    const totalSelectedCount = selectedSet.size;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm print:hidden"
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <Cpu className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">
                                DB 기술 스택 선택 및 관리
                            </h3>
                            <p className="text-xs font-semibold text-slate-500">
                                템플릿 인쇄물에 노출할 기술 스택을 선택하세요. ({totalSelectedCount}{' '}
                                / {allSkills.length}개 선택됨)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Filter and Global Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="기술 스택 이름 검색 (예: Java, React, Docker...)"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onResetToAll}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-xs"
                        title="모든 기술 스택 전체 포함(기본 상태)으로 초기화"
                    >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                        <span>전체 포함으로 초기화</span>
                    </button>
                </div>

                {/* Content: Skill Groups */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {groupedSkills.map((group) => {
                        const filteredSkills = group.skills.filter((s) =>
                            s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
                        );

                        if (filteredSkills.length === 0 && searchQuery.trim() !== '') return null;

                        const groupSkillIds = group.skills.map((s) => s.id);
                        const groupSelectedCount = group.skills.filter((s) =>
                            selectedSet.has(s.id)
                        ).length;
                        const isAllGroupSelected = groupSelectedCount === group.skills.length;

                        return (
                            <div
                                key={group.value}
                                className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/40 p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-1 rounded-full bg-blue-600" />
                                        <h4 className="text-xs font-black text-slate-900">
                                            {group.label}
                                        </h4>
                                        <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                                            {groupSelectedCount} / {group.skills.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onSelectAllInGroup(groupSkillIds)}
                                            disabled={isAllGroupSelected}
                                            className="rounded px-2 py-0.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition"
                                        >
                                            그룹 전체 선택
                                        </button>
                                        <span className="text-slate-300 text-[10px]">|</span>
                                        <button
                                            type="button"
                                            onClick={() => onDeselectAllInGroup(groupSkillIds)}
                                            disabled={groupSelectedCount === 0}
                                            className="rounded px-2 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition"
                                        >
                                            그룹 전체 제외
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    {filteredSkills.map((skill) => {
                                        const isSelected = selectedSet.has(skill.id);
                                        return (
                                            <button
                                                type="button"
                                                key={skill.id}
                                                onClick={() => onToggleSkill(skill.id)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-black transition cursor-pointer ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-xs ring-2 ring-blue-400/40 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-900'
                                                        : 'border-dashed border-slate-300 bg-white text-slate-400 line-through opacity-70 hover:border-blue-400 hover:text-blue-600 hover:opacity-100'
                                                }`}
                                                title={
                                                    isSelected
                                                        ? `'${skill.name}' 템플릿에서 제외하기 (클릭)`
                                                        : `'${skill.name}' 템플릿에 포함하기 (클릭)`
                                                }
                                            >
                                                <span>{skill.name}</span>
                                                {skill.skillVersion && (
                                                    <span
                                                        className={`rounded px-1 py-0.2 text-[9px] font-bold ${
                                                            isSelected
                                                                ? 'bg-blue-200/80 text-blue-800'
                                                                : 'bg-slate-200 text-slate-400'
                                                        }`}
                                                    >
                                                        v{skill.skillVersion}
                                                    </span>
                                                )}
                                                <span
                                                    className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-black ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-200 text-slate-500'
                                                    }`}
                                                >
                                                    {isSelected ? (
                                                        <Check className="h-2.5 w-2.5" />
                                                    ) : (
                                                        <Plus className="h-2.5 w-2.5" />
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-3.5">
                    <p className="text-xs font-semibold text-slate-500">
                        * 체크 해제된 기술 스택은 인쇄 미리보기 및 PDF 결과물에서 제외됩니다.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                    >
                        선택 완료
                    </button>
                </div>
            </div>
        </div>
    );
}
