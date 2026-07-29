'use client';

type TagInputProps = {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
};

// 쉼표로 구분한 태그 이름 자유 입력. 저장 시 각 폼의 toXxxRequest()에서
// split(',')로 분해해 백엔드로 보낸다(백엔드가 이름 기준 find-or-create 처리).
export function TagInput({
    value,
    onChange,
    label = '태그 (쉼표 구분)',
    placeholder,
}: TagInputProps) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
        </div>
    );
}
