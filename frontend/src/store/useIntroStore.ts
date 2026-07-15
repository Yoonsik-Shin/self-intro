import { create } from 'zustand';

type IntroState = {
  selectedMilestoneId: string;
  activeCategory: string;
  activeMainTab: 'INTRO' | 'PROJECTS' | 'THIS_APP' | 'ARCHIVE';
  activeEssayTab: 'WHY' | 'STRENGTH';
  setSelectedMilestoneId: (id: string) => void;
  setActiveCategory: (category: IntroState['activeCategory']) => void;
  setActiveMainTab: (tab: IntroState['activeMainTab']) => void;
  setActiveEssayTab: (tab: IntroState['activeEssayTab']) => void;
};

export const useIntroStore = create<IntroState>((set) => ({
  selectedMilestoneId: 'project1', // default to first project milestone
  activeCategory: 'ALL',
  activeMainTab: 'INTRO',
  activeEssayTab: 'WHY',
  setSelectedMilestoneId: (selectedMilestoneId) => set({ selectedMilestoneId }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setActiveMainTab: (activeMainTab) => set({ activeMainTab }),
  setActiveEssayTab: (activeEssayTab) => set({ activeEssayTab }),
}));
