'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Skill } from '@/lib/api/types';

type SkillPickerProps = {
    skills: Skill[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    label?: string;
    searchPlaceholder?: string;
    // 'plain': Study 관리 화면의 원래 스타일(테두리 없는 hover row)
    // 'boxed': 학습 자료 관리 화면의 원래 스타일(카드형 흰 박스 row) — 옆의 관련자료 선택 박스와 톤을 맞춤
    variant?: 'plain' | 'boxed';
};

// 스킬 검색 + 다중 선택 체크박스 목록. Study/LearningResource 관리 폼에서
// 동일한 로직으로 중복 구현되어 있던 것을 공용화했다.
export function SkillPicker({
    skills,
    selectedIds,
    onChange,
    label = '기술 스택',
    searchPlaceholder = '기술명 또는 분류 검색',
    variant = 'plain',
}: SkillPickerProps) {
    const [search, setSearch] = useState('');
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
        ? skills.filter(
              (skill) =>
                  skill.name.toLowerCase().includes(keyword) ||
                  skill.category.toLowerCase().includes(keyword)
          )
        : skills;

    const toggle = (id: number) => {
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((value) => value !== id)
                : [...selectedIds, id]
        );
    };

    return (
        <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                {label} · {selectedIds.length}개
            </label>
            <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
            </div>
            <div
                className={
                    variant === 'boxed'
                        ? 'max-h-48 space-y-1.5 overflow-auto'
                        : 'max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3'
                }
            >
                {filtered.map((skill) =>
                    variant === 'boxed' ? (
                        <label
                            key={skill.id}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(skill.id)}
                                onChange={() => toggle(skill.id)}
                                className="mt-0.5"
                            />
                            <span className="font-semibold text-slate-700">{skill.name}</span>
                        </label>
                    ) : (
                        <label
                            key={skill.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(skill.id)}
                                onChange={() => toggle(skill.id)}
                            />
                            {skill.name}
                        </label>
                    )
                )}
                {filtered.length === 0 && (
                    <p className="py-4 text-center text-xs font-semibold text-slate-400">
                        검색 결과가 없습니다.
                    </p>
                )}
            </div>
        </div>
    );
}
