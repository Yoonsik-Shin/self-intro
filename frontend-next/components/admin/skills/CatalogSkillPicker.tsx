'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Search, Sparkles } from 'lucide-react';
import type { Skill } from '@/lib/api/types';
import { SkillBadgeIcon } from '@/lib/SkillBadgeIcon';
import { getSkillCategoryPresentation, skillCategoryPresentations } from './skillPresentation';

type CatalogSkillPickerProps = {
    catalogSkills: Skill[];
    pendingId?: number | null;
    onSelect: (skill: Skill) => void;
    onPropose?: (name: string, category: string) => void;
    isProposing?: boolean;
};

const ALL_TAB = 'ALL';

export function CatalogSkillPicker({
    catalogSkills,
    pendingId = null,
    onSelect,
    onPropose,
    isProposing = false,
}: CatalogSkillPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>(ALL_TAB);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const tabs = useMemo(
        () => [
            { key: ALL_TAB, label: '전체', count: catalogSkills.length },
            ...skillCategoryPresentations.map((category) => ({
                key: category.key,
                label: category.label,
                count: catalogSkills.filter((skill) => skill.category === category.key).length,
            })),
        ],
        [catalogSkills]
    );

    const query = searchQuery.trim().toLowerCase();
    const results = useMemo(() => {
        const categoryFiltered =
            activeCategory === ALL_TAB
                ? catalogSkills
                : catalogSkills.filter((skill) => skill.category === activeCategory);
        if (!query) return categoryFiltered;
        return categoryFiltered.filter((skill) => skill.name.toLowerCase().includes(query));
    }, [catalogSkills, activeCategory, query]);

    const [isProposeOpen, setIsProposeOpen] = useState(false);
    const [proposeName, setProposeName] = useState('');
    const [proposeCategoryOverride, setProposeCategoryOverride] = useState<string | null>(null);
    const proposeCategory =
        proposeCategoryOverride ?? (activeCategory === ALL_TAB ? 'ETC' : activeCategory);

    const openProposeForm = () => {
        setProposeName(searchQuery.trim());
        setIsProposeOpen(true);
    };
    const submitPropose = () => {
        const name = proposeName.trim();
        if (!name) return;
        onPropose?.(name, proposeCategory);
        setIsProposeOpen(false);
        setProposeName('');
    };

    const moveTab = (fromIndex: number, direction: 1 | -1) => {
        const nextIndex = (fromIndex + direction + tabs.length) % tabs.length;
        const nextTab = tabs[nextIndex];
        setActiveCategory(nextTab.key);
        tabRefs.current[nextTab.key]?.focus();
    };

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveTab(index, 1);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveTab(index, -1);
        } else if (event.key === 'Home') {
            event.preventDefault();
            setActiveCategory(tabs[0].key);
            tabRefs.current[tabs[0].key]?.focus();
        } else if (event.key === 'End') {
            event.preventDefault();
            const lastTab = tabs[tabs.length - 1];
            setActiveCategory(lastTab.key);
            tabRefs.current[lastTab.key]?.focus();
        }
    };

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={`공통 카탈로그 ${catalogSkills.length}개 검색 (예: TypeScript)`}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
            </div>

            <div role="tablist" aria-label="기술 카테고리" className="flex flex-wrap gap-1.5">
                {tabs.map((tab, index) => (
                    <button
                        key={tab.key}
                        ref={(node) => {
                            tabRefs.current[tab.key] = node;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={activeCategory === tab.key}
                        tabIndex={activeCategory === tab.key ? 0 : -1}
                        onClick={() => setActiveCategory(tab.key)}
                        onKeyDown={(event) => handleTabKeyDown(event, index)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            activeCategory === tab.key
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                        }`}
                    >
                        {tab.label} {tab.count}
                    </button>
                ))}
            </div>

            {results.length === 0 ? (
                <p className="py-8 text-center text-sm font-bold text-slate-400">
                    일치하는 기술이 없습니다.
                </p>
            ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                    {results.map((skill) => {
                        const isPending = skill.id === pendingId;
                        return (
                            <button
                                key={skill.id}
                                type="button"
                                disabled={isPending}
                                onClick={() => onSelect(skill)}
                                className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${
                                    isPending
                                        ? 'cursor-wait border-slate-200 bg-slate-50 opacity-60'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <SkillBadgeIcon
                                    name={skill.name}
                                    badgeKey={skill.badgeKey}
                                    badgeColor={skill.badgeColor}
                                    className="h-7 w-7"
                                />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-black text-slate-900">
                                        {skill.name}
                                    </span>
                                    <span className="block truncate text-[11px] font-semibold text-slate-400">
                                        {getSkillCategoryPresentation(skill.category).label}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {onPropose &&
                (isProposeOpen ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
                        <Sparkles className="h-4 w-4 shrink-0 text-slate-400" />
                        <input
                            type="text"
                            autoFocus
                            value={proposeName}
                            onChange={(event) => setProposeName(event.target.value)}
                            placeholder="제안할 기술 이름"
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-800"
                        />
                        <select
                            value={proposeCategory}
                            onChange={(event) => setProposeCategoryOverride(event.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-800"
                        >
                            {skillCategoryPresentations.map((category) => (
                                <option key={category.key} value={category.key}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setIsProposeOpen(false)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            disabled={isProposing || !proposeName.trim()}
                            onClick={submitPropose}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isProposing ? '제안하는 중…' : '새 기술로 제안'}
                        </button>
                        <p className="w-full text-[11px] font-medium text-slate-400">
                            심사 전에도 이 Workspace에는 바로 추가됩니다.
                        </p>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={openProposeForm}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800"
                    >
                        <Sparkles className="h-3.5 w-3.5" /> 없는 기술 제안하기
                    </button>
                ))}
        </div>
    );
}
