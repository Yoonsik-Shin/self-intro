export type AiModelOption = {
    id: string;
    name: string;
    badge: string;
    price: string;
};

// 백엔드 LlmDispatcher(backend/ai-worker/.../global/ai/LlmDispatcher.java)가 인식하는 modelKey와
// 정확히 같은 값이어야 한다. 새 모델을 추가/제거할 땐 두 곳을 함께 맞춘다.
export const AI_MODEL_OPTIONS: AiModelOption[] = [
    {
        id: 'CLAUDE_3_5_SONNET',
        name: 'Claude Sonnet 5',
        badge: '자소서 1위 🥇',
        price: '1M 토큰당 $2/$10',
    },
    {
        id: 'GEMINI_3_1_FLASH_LITE',
        name: 'Gemini 3.1 Flash-Lite',
        badge: '가성비 추천 💰',
        price: '1M 토큰당 $0.25/$1.50',
    },
    {
        id: 'GEMINI_3_6_FLASH',
        name: 'Gemini 3.6 Flash',
        badge: '고성능 ⚡',
        price: '1M 토큰당 $1.50/$7.50',
    },
    {
        id: 'NVIDIA_NIM',
        name: 'Nvidia NIM (Llama 3.3)',
        badge: '무료 🟢',
        price: '$0 (기본 내장)',
    },
    {
        id: 'GPT_5_4_NANO',
        name: 'GPT-5.4 Nano',
        badge: '초저가 💰',
        price: '1M 토큰당 $0.20/$1.25',
    },
    {
        id: 'GPT_5_4_MINI',
        name: 'GPT-5.4 Mini',
        badge: '균형 ⚖️',
        price: '1M 토큰당 $0.75/$4.50',
    },
    {
        id: 'CUSTOM',
        name: '직접 모델명 입력',
        badge: '커스텀 ⚙️',
        price: 'API 지정',
    },
];

export const DEFAULT_AI_MODEL_ID = 'NVIDIA_NIM';
