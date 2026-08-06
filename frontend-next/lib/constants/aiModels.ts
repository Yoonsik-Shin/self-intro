export type AiModelTagTone = 'emerald' | 'indigo' | 'amber' | 'slate';

export type AiModelOption = {
    id: string;
    name: string;
    tag: string;
    tagTone: AiModelTagTone;
    price: string;
};

// 백엔드 LlmDispatcher(backend/ai-worker/.../global/ai/LlmDispatcher.java)가 인식하는 modelKey와
// 정확히 같은 값이어야 한다. 새 모델을 추가/제거할 땐 두 곳을 함께 맞춘다.
export const AI_MODEL_OPTIONS: AiModelOption[] = [
    {
        id: 'CLAUDE_3_5_SONNET',
        name: 'Claude Sonnet 5',
        tag: '자소서 추천',
        tagTone: 'indigo',
        price: '$2 / $10 · 1M 토큰',
    },
    {
        id: 'GEMINI_3_1_FLASH_LITE',
        name: 'Gemini 3.1 Flash-Lite',
        tag: '가성비',
        tagTone: 'amber',
        price: '$0.25 / $1.50 · 1M 토큰',
    },
    {
        id: 'GEMINI_3_6_FLASH',
        name: 'Gemini 3.6 Flash',
        tag: '고성능',
        tagTone: 'indigo',
        price: '$1.50 / $7.50 · 1M 토큰',
    },
    {
        id: 'NVIDIA_NIM',
        name: 'Nvidia NIM (Llama 3.3)',
        tag: '무료',
        tagTone: 'emerald',
        price: '기본 내장',
    },
    {
        id: 'GPT_5_4_NANO',
        name: 'GPT-5.4 Nano',
        tag: '초저가',
        tagTone: 'amber',
        price: '$0.20 / $1.25 · 1M 토큰',
    },
    {
        id: 'GPT_5_4_MINI',
        name: 'GPT-5.4 Mini',
        tag: '균형',
        tagTone: 'slate',
        price: '$0.75 / $4.50 · 1M 토큰',
    },
    {
        id: 'CUSTOM',
        name: '직접 입력',
        tag: '커스텀',
        tagTone: 'slate',
        price: 'API 모델명 지정',
    },
];

export const DEFAULT_AI_MODEL_ID = 'NVIDIA_NIM';
