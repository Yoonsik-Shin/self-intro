import { create } from 'zustand';

type IntroState = {
  selectedMilestoneId: string;
  activeCategory: 'ALL' | 'EDUCATION' | 'PROJECT' | 'CERTIFICATE';
  setSelectedMilestoneId: (id: string) => void;
  setActiveCategory: (category: IntroState['activeCategory']) => void;
};

export const useIntroStore = create<IntroState>((set) => ({
  selectedMilestoneId: 'education',
  activeCategory: 'ALL',
  setSelectedMilestoneId: (selectedMilestoneId) => set({ selectedMilestoneId }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
}));
