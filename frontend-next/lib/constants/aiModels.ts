import { Bot, Settings2, type LucideIcon } from 'lucide-react';
import { siAnthropic, siGooglegemini, siNvidia } from 'simple-icons';

export type AiModelTagTone = 'emerald' | 'indigo' | 'amber' | 'slate';

export type AiModelProvider = 'claude' | 'gemini' | 'nvidia' | 'gpt' | 'custom';

export type AiModelOption = {
    id: string;
    name: string;
    provider: AiModelProvider;
    /** 플로팅 위젯 원 안 모서리에 붙는 아주 짧은 버전 배지(2~3글자). */
    versionBadge: string;
    tag: string;
    tagTone: AiModelTagTone;
    price: string;
};

// 실제 회사 로고(simple-icons SVG path) — Anthropic/Google Gemini/NVIDIA는 공식 브랜드 마크가
// 있어서 그대로 쓴다. OpenAI는 simple-icons에 로고가 등록돼 있지 않고(상표 요청으로 빠짐),
// GPT/커스텀은 애초에 특정 회사 하나를 가리키는 게 아니라서 lucide 아이콘으로 대체한다.
export const PROVIDER_BRAND_PATH: Record<AiModelProvider, string | null> = {
    claude: siAnthropic.path,
    gemini: siGooglegemini.path,
    nvidia: siNvidia.path,
    gpt: null,
    custom: null,
};

export const PROVIDER_FALLBACK_ICON: Partial<Record<AiModelProvider, LucideIcon>> = {
    gpt: Bot,
    custom: Settings2,
};

// 원형 위젯 배경색 — Anthropic/Gemini/NVIDIA는 공식 브랜드 컬러, GPT/커스텀은 로고가 없어
// 중립적인 진한 톤으로 대체한다.
export const PROVIDER_COLOR: Record<AiModelProvider, string> = {
    claude: `#${siAnthropic.hex}`,
    gemini: `#${siGooglegemini.hex}`,
    nvidia: `#${siNvidia.hex}`,
    gpt: '#0f172a',
    custom: '#64748b',
};

// 백엔드 LlmDispatcher(backend/ai-worker/.../global/ai/LlmDispatcher.java)가 인식하는 modelKey와
// 정확히 같은 값이어야 한다. 새 모델을 추가/제거할 땐 두 곳을 함께 맞춘다.
export const AI_MODEL_OPTIONS: AiModelOption[] = [
    {
        id: 'CLAUDE_3_5_SONNET',
        name: 'Claude Sonnet 5',
        provider: 'claude',
        versionBadge: '5',
        tag: '자소서 추천',
        tagTone: 'indigo',
        price: '$2 / $10 · 1M 토큰',
    },
    {
        id: 'GEMINI_3_1_FLASH_LITE',
        name: 'Gemini 3.1 Flash-Lite',
        provider: 'gemini',
        versionBadge: '3.1',
        tag: '가성비',
        tagTone: 'amber',
        price: '$0.25 / $1.50 · 1M 토큰',
    },
    {
        id: 'GEMINI_3_6_FLASH',
        name: 'Gemini 3.6 Flash',
        provider: 'gemini',
        versionBadge: '3.6',
        tag: '고성능',
        tagTone: 'indigo',
        price: '$1.50 / $7.50 · 1M 토큰',
    },
    {
        id: 'NVIDIA_NIM',
        name: 'Nvidia NIM (Llama 3.3)',
        provider: 'nvidia',
        versionBadge: '3.3',
        tag: '무료',
        tagTone: 'emerald',
        price: '기본 내장',
    },
    {
        id: 'GPT_5_4_NANO',
        name: 'GPT-5.4 Nano',
        provider: 'gpt',
        versionBadge: 'Na',
        tag: '초저가',
        tagTone: 'amber',
        price: '$0.20 / $1.25 · 1M 토큰',
    },
    {
        id: 'GPT_5_4_MINI',
        name: 'GPT-5.4 Mini',
        provider: 'gpt',
        versionBadge: 'Mi',
        tag: '균형',
        tagTone: 'slate',
        price: '$0.75 / $4.50 · 1M 토큰',
    },
    {
        id: 'CUSTOM',
        name: '직접 입력',
        provider: 'custom',
        versionBadge: '?',
        tag: '커스텀',
        tagTone: 'slate',
        price: 'API 모델명 지정',
    },
];

export const DEFAULT_AI_MODEL_ID = 'NVIDIA_NIM';
