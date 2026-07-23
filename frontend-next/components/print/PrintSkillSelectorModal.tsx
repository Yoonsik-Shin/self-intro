'use client';

import { useMemo, useState } from 'react';
import { Search, X, Check, Plus, Cpu, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [showAllDbSkills, setShowAllDbSkills] = useState(false);

    const coreGroups = useMemo(() => groupCoreSkills(allSkills), [allSkills]);
    const coreSkillIds = useMemo(
        () => new Set(coreGroups.flatMap((g) => g.skills).map((s) => s.id)),
        [coreGroups]
    );

    const nonCoreSkills = useMemo(
        () => allSkills.filter((s) => !coreSkillIds.has(s.id)),
        [allSkills, coreSkillIds]
    );

    // Currently selected skill ID set (if selectedSkillIds is undefined or null, core skills are selected by default)
    const isAllSelectedByDefault = !selectedSkillIds;
    const selectedSet = useMemo(() => {
        if (isAllSelectedByDefault) {
            return new Set(allSkills.filter((s) => s.isCore).map((s) => s.id));
        }
        return new Set(selectedSkillIds);
    }, [isAllSelectedByDefault, allSkills, selectedSkillIds]);

    const totalSelectedCount = selectedSet.size;

    const queryTrimmed = searchQuery.trim().toLowerCase();

    // When search query is active, search across ALL 60 DB skills!
    const searchResults = useMemo(() => {
        if (!queryTrimmed) return [];
        return allSkills.filter(
            (s) =>
                s.name.toLowerCase().includes(queryTrimmed) ||
                (s.category && s.category.toLowerCase().includes(queryTrimmed))
        );
    }, [allSkills, queryTrimmed]);

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
                                템플릿 인쇄물에 노출할 기술 스택을 선택하세요. ({totalSelectedCount}
                                개 선택됨 / DB 전체 {allSkills.length}개)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
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
                            placeholder="DB 60개 전체 기술스택 검색 (예: FastAPI, PostgreSQL, Vitest...)"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onResetToAll}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-xs cursor-pointer"
                        title="기본 핵심 기술 스택 포함 상태로 초기화"
                    >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                        <span>기본 상태로 초기화</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Search Results Mode */}
                    {queryTrimmed !== '' ? (
                        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
                            <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                                <h4 className="text-xs font-black text-blue-950 flex items-center gap-2">
                                    <Search className="h-3.5 w-3.5 text-blue-600" />
                                    <span>&apos;{searchQuery}&apos; DB 전체 검색 결과</span>
                                </h4>
                                <span className="rounded bg-blue-200/80 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                                    {searchResults.length}개 검색됨
                                </span>
                            </div>

                            {searchResults.length === 0 ? (
                                <p className="py-6 text-center text-xs font-bold text-slate-400">
                                    검색어와 일치하는 DB 기술 스택이 없습니다.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {searchResults.map((skill) => {
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
                            )}
                        </div>
                    ) : (
                        /* Default Core Groups Mode */
                        <>
                            {coreGroups.map((group) => {
                                const groupSkillIds = group.skills.map((s) => s.id);
                                const groupSelectedCount = group.skills.filter((s) =>
                                    selectedSet.has(s.id)
                                ).length;
                                const isAllGroupSelected =
                                    groupSelectedCount === group.skills.length;

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
                                                    onClick={() =>
                                                        onSelectAllInGroup(groupSkillIds)
                                                    }
                                                    disabled={isAllGroupSelected}
                                                    className="rounded px-2 py-0.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition cursor-pointer"
                                                >
                                                    그룹 전체 선택
                                                </button>
                                                <span className="text-slate-300 text-[10px]">
                                                    |
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onDeselectAllInGroup(groupSkillIds)
                                                    }
                                                    disabled={groupSelectedCount === 0}
                                                    className="rounded px-2 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition cursor-pointer"
                                                >
                                                    그룹 전체 제외
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {group.skills.map((skill) => {
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

                            {/* Additional DB Skills Toggle Section */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAllDbSkills(!showAllDbSkills)}
                                    className="flex w-full items-center justify-between text-xs font-black text-slate-700 hover:text-blue-600 transition cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <Cpu className="h-4 w-4 text-blue-600" />
                                        <span>
                                            기타 DB 기술 스택 ({nonCoreSkills.length}개){' '}
                                            {showAllDbSkills ? '접기' : '전체 펼쳐보기'}
                                        </span>
                                    </span>
                                    {showAllDbSkills ? (
                                        <ChevronUp className="h-4 w-4 text-slate-500" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-slate-500" />
                                    )}
                                </button>

                                {showAllDbSkills && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                                        {nonCoreSkills.map((skill) => {
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
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-3.5">
                    <p className="text-xs font-semibold text-slate-500">
                        * 상단 검색창에서 DB의 60개 전체 기술 스택을 자유롭게 검색하여 추가할 수
                        있습니다.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
                    >
                        선택 완료
                    </button>
                </div>
            </div>
        </div>
    );
}
