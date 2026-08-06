import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_AI_MODEL_ID } from '@/lib/constants/aiModels';

export type WidgetPosition = { x: number; y: number };

type AiModelState = {
    modelKey: string;
    customModelName: string;
    // 플로팅 위젯을 드래그해서 옮긴 화면 좌표(뷰포트 기준 left/top). null이면 위젯이 마운트되면서
    // 기본 위치(우하단)로 스스로 채워 넣는다.
    widgetPosition: WidgetPosition | null;
    setModelKey: (modelKey: string) => void;
    setCustomModelName: (customModelName: string) => void;
    setWidgetPosition: (position: WidgetPosition) => void;
};

// 자소서 초안 생성에서만 있던 "LLM provider 자유 선택"을 어필분석/보완프로젝트추천/학습계획/PDF초안까지
// 넓히면서, 관리자 대시보드 어디서나 떠 있는 플로팅 위젯에서 고른 모델을 브라우저에 저장해 모든 AI
// 기능의 기본값으로 쓴다. 서버 DB에 저장하지 않고 이 브라우저에서만 유지된다(다른 기기/브라우저는
// 기본값 NVIDIA_NIM으로 시작). 각 화면은 이 기본값을 초기값으로만 쓰고, 그 화면 안에서 로컬로
// 덮어써서 실행해도 이 전역 값은 바뀌지 않는다.
export const useAiModelStore = create<AiModelState>()(
    persist(
        (set) => ({
            modelKey: DEFAULT_AI_MODEL_ID,
            customModelName: '',
            widgetPosition: null,
            setModelKey: (modelKey) => set({ modelKey }),
            setCustomModelName: (customModelName) => set({ customModelName }),
            setWidgetPosition: (widgetPosition) => set({ widgetPosition }),
        }),
        { name: 'ai-model-preference' }
    )
);
