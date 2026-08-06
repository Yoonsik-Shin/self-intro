'use client';

import { AI_MODEL_OPTIONS, PROVIDER_COLOR } from '@/lib/constants/aiModels';
import { useAiModelStore } from '@/store/useAiModelStore';

/**
 * AI 실행 버튼 옆에 붙여서 "지금 이 버튼을 누르면 어떤 모델이 실제로 도는지"를 그 자리에서 바로
 * 보여준다 — 플로팅 위젯에서 고른 모델이 버튼 누르는 시점엔 안 보일 수 있어서(위젯을 다른 데로
 * 옮겼거나 스크롤에 가려졌거나), 모르고 비싼 모델로 실행하는 걸 막기 위한 확인용 표시.
 */
export function AiModelUsageBadge() {
    const modelKey = useAiModelStore((state) => state.modelKey);
    const customModelName = useAiModelStore((state) => state.customModelName);
    const selected = AI_MODEL_OPTIONS.find((option) => option.id === modelKey);

    const label =
        modelKey === 'CUSTOM' && customModelName ? customModelName : (selected?.name ?? modelKey);
    const color = selected ? PROVIDER_COLOR[selected.provider] : PROVIDER_COLOR.custom;

    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold text-white"
            style={{ backgroundColor: color }}
            title={selected ? `${selected.name} · ${selected.price}` : label}
        >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" aria-hidden="true" />
            {label}
        </span>
    );
}
