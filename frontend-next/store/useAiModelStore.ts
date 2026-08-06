import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_AI_MODEL_ID } from '@/lib/constants/aiModels';

type AiModelState = {
    modelKey: string;
    customModelName: string;
    // 자기만의 모델 선택 UI를 이미 갖고 있는 화면(예: 자소서 드로어)이 열려 있는 동안, 같은 화면에
    // 전역 플로팅 위젯까지 겹쳐 보이면 "어느 쪽이 우선이냐"가 헷갈린다는 피드백으로 추가 — 그런
    // 화면이 열려 있을 땐 플로팅 위젯을 잠깐 숨긴다. 세션 상태일 뿐이라 저장하지 않는다.
    suppressFloatingWidget: boolean;
    setModelKey: (modelKey: string) => void;
    setCustomModelName: (customModelName: string) => void;
    setSuppressFloatingWidget: (suppress: boolean) => void;
};

// 자소서 초안 생성에서만 있던 "LLM provider 자유 선택"을 어필분석/보완프로젝트추천/학습계획/PDF초안까지
// 넓히면서, 관리자 대시보드 어디서나 떠 있는 플로팅 위젯에서 고른 모델을 브라우저에 저장해 모든 AI
// 기능의 기본값으로 쓴다. 서버 DB에 저장하지 않고 이 브라우저에서만 유지된다(다른 기기/브라우저는
// 기본값 NVIDIA_NIM으로 시작). 각 화면은 이 기본값을 초기값으로만 쓰고, 그 화면 안에서 로컬로
// 덮어써서 실행해도 이 전역 값은 바뀌지 않는다.
//
// 위젯의 화면 좌표는 여기서 관리하지 않는다 — 기본 위치는 헤더의 고정 슬롯이고, 드래그로 옮긴
// 위치는 "숨겨졌다 다시 보이면 제자리로 돌아온다"는 요구사항 때문에 세션 넘어 유지할 필요가
// 없어서 컴포넌트 로컬 상태로 둔다(AiModelFloatingWidget 참고).
export const useAiModelStore = create<AiModelState>()(
    persist(
        (set) => ({
            modelKey: DEFAULT_AI_MODEL_ID,
            customModelName: '',
            suppressFloatingWidget: false,
            setModelKey: (modelKey) => set({ modelKey }),
            setCustomModelName: (customModelName) => set({ customModelName }),
            setSuppressFloatingWidget: (suppressFloatingWidget) => set({ suppressFloatingWidget }),
        }),
        {
            name: 'ai-model-preference',
            partialize: (state) => ({
                modelKey: state.modelKey,
                customModelName: state.customModelName,
            }),
        }
    )
);
