import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_AI_MODEL_ID } from '@/lib/constants/aiModels';

type AiModelState = {
    modelKey: string;
    customModelName: string;
    setModelKey: (modelKey: string) => void;
    setCustomModelName: (customModelName: string) => void;
};

// 자소서 초안 생성에서만 있던 "LLM provider 자유 선택"을 어필분석/보완프로젝트추천/학습계획/PDF초안까지
// 넓히면서, 관리자 대시보드 헤더에서 고른 모델을 브라우저에 저장해 모든 AI 기능의 기본값으로 쓴다.
// 서버 DB에 저장하지 않고 이 브라우저에서만 유지된다(다른 기기/브라우저는 기본값 NVIDIA_NIM으로 시작).
// 각 화면은 이 기본값을 초기값으로만 쓰고, 그 화면 안에서 로컬로 덮어써서 실행해도 이 전역 값은 바뀌지 않는다.
export const useAiModelStore = create<AiModelState>()(
    persist(
        (set) => ({
            modelKey: DEFAULT_AI_MODEL_ID,
            customModelName: '',
            setModelKey: (modelKey) => set({ modelKey }),
            setCustomModelName: (customModelName) => set({ customModelName }),
        }),
        { name: 'ai-model-preference' }
    )
);
