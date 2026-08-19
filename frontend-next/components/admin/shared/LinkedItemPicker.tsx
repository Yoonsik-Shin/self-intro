'use client';

import { useState, type ReactNode } from 'react';

type LinkedItemPickerProps<T> = {
    items: T[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    getId: (item: T) => number;
    getSearchText: (item: T) => string;
    renderLabel: (item: T) => ReactNode;
    label: string;
    searchPlaceholder: string;
};

// Study/프로젝트·이력/경력 상세 연결 선택에 공통으로 쓰는 검색+체크박스 리스트.
// SkillPicker.tsx와 외부 API 모양은 맞추되, Skill이 아닌 임의의 데이터 타입을 다룬다.
export function LinkedItemPicker<T>({
    items,
    selectedIds,
    onChange,
    getId,
    getSearchText,
    renderLabel,
    label,
    searchPlaceholder,
}: LinkedItemPickerProps<T>) {
    const [search, setSearch] = useState('');
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
        ? items.filter((item) => getSearchText(item).toLowerCase().includes(keyword))
        : items;

    const toggle = (id: number) => {
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((value) => value !== id)
                : [...selectedIds, id]
        );
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                {label} · {selectedIds.length}개
            </label>
            <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-800"
            />
            <div className="max-h-48 space-y-1.5 overflow-auto">
                {filtered.map((item) => {
                    const id = getId(item);
                    return (
                        <label
                            key={id}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(id)}
                                onChange={() => toggle(id)}
                                className="mt-0.5"
                            />
                            <span className="min-w-0 font-semibold text-slate-700">
                                {renderLabel(item)}
                            </span>
                        </label>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="py-4 text-center text-xs font-semibold text-slate-400">
                        검색 결과가 없습니다.
                    </p>
                )}
            </div>
        </div>
    );
}
