'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { JobPostingPositionChoiceRequest } from '@/lib/api/types';

type PositionChoicePickerProps = {
    /** 자동 감지된 나머지 모집부문(1지망 제외). 체크하면 순서대로 2지망부터 순위가 매겨진다. */
    detected?: string[];
    value: JobPostingPositionChoiceRequest[];
    onChange: (choices: JobPostingPositionChoiceRequest[]) => void;
};

/**
 * 2지망 이상을 고르는 위젯. 자동 감지된 후보는 체크박스로, 감지되지 않은 지망은 직접 추가로
 * 받는다. 체크/추가된 순서대로 랭크(2지망, 3지망, ...)가 자동 배정되고, 화살표로 순서를 바꿀 수
 * 있다.
 */
export function PositionChoicePicker({
    detected = [],
    value,
    onChange,
}: PositionChoicePickerProps) {
    const [manualInput, setManualInput] = useState('');

    const withRanks = (titles: string[]): JobPostingPositionChoiceRequest[] =>
        titles.map((positionTitle, index) => ({ rank: index + 2, positionTitle }));

    const titles = value.map((choice) => choice.positionTitle);

    const toggleDetected = (title: string) => {
        onChange(
            withRanks(
                titles.includes(title) ? titles.filter((t) => t !== title) : [...titles, title]
            )
        );
    };

    const addManual = () => {
        const trimmed = manualInput.trim();
        if (!trimmed || titles.includes(trimmed)) return;
        onChange(withRanks([...titles, trimmed]));
        setManualInput('');
    };

    const remove = (index: number) => {
        onChange(withRanks(titles.filter((_, i) => i !== index)));
    };

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= titles.length) return;
        const next = [...titles];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(withRanks(next));
    };

    return (
        <div className="space-y-3">
            {detected.length > 0 && (
                <div>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                        감지된 모집부문
                    </p>
                    <div className="space-y-1 rounded-xl border border-slate-200 p-2">
                        {detected.map((title) => (
                            <label
                                key={title}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={titles.includes(title)}
                                    onChange={() => toggleDetected(title)}
                                />
                                {title}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    확정된 지망 · {value.length + 1}개
                </p>
                <ol className="space-y-1.5">
                    <li className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        <span className="font-bold text-slate-700">1지망</span>
                        <span className="text-xs">(위 직무명 입력란과 동일)</span>
                    </li>
                    {value.map((choice, index) => (
                        <li
                            key={`${choice.positionTitle}-${index}`}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                            <span className="font-bold text-slate-700">{choice.rank}지망</span>
                            <span className="flex-1 truncate">{choice.positionTitle}</span>
                            <button
                                type="button"
                                onClick={() => move(index, -1)}
                                disabled={index === 0}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                            >
                                <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => move(index, 1)}
                                disabled={index === value.length - 1}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                            >
                                <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="rounded p-1 text-red-400 hover:bg-red-50"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    ))}
                </ol>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={manualInput}
                    onChange={(event) => setManualInput(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            addManual();
                        }
                    }}
                    placeholder="지망 직무명 직접 입력"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
                <button
                    type="button"
                    onClick={addManual}
                    disabled={!manualInput.trim()}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                    <Plus className="h-3.5 w-3.5" />
                    추가
                </button>
            </div>
        </div>
    );
}
