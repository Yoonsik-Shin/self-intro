import { create } from 'zustand';
import type { SkillForm } from '@/components/admin/skills/SkillsManagement';
import type { AdminExperienceForm } from '@/components/admin/experience/ExperienceManagement';

export type AdminProfileDraft = {
    name: string;
    nameEn: string;
    jobTitle: string;
    bio: string;
    coreStackSummary: string;
    statusBadgeText: string;
    githubUrl: string;
    email: string;
    phone: string;
};

type SkillDraft = { editingId: number | null; form: SkillForm } | null;
type ExperienceDraft = { editingId: number | null; form: AdminExperienceForm } | null;

type AdminPreviewState = {
    profileDraft: AdminProfileDraft | null;
    skillDraft: SkillDraft;
    experienceDraft: ExperienceDraft;
    setProfileDraft: (draft: AdminProfileDraft | null) => void;
    setSkillDraft: (draft: SkillDraft) => void;
    setExperienceDraft: (draft: ExperienceDraft) => void;
};

// 관리자 대시보드의 각 탭(PROFILE/SKILLS/EXPERIENCE)은 저마다 독립된 폼 상태를 갖고 있다.
// 라이브 프리뷰 패널은 "저장 전 초안"을 메인페이지에 반영해야 하므로, 각 탭이 자신의
// 최신 폼 상태를 여기에 얕게 발행(push)하고 AdminDashboardShell이 이를 구독해 미리보기
// payload를 조립한다. 폼 상태 자체의 소유권은 각 탭 컴포넌트에 그대로 남는다.
export const useAdminPreviewStore = create<AdminPreviewState>((set) => ({
    profileDraft: null,
    skillDraft: null,
    experienceDraft: null,
    setProfileDraft: (profileDraft) => set({ profileDraft }),
    setSkillDraft: (skillDraft) => set({ skillDraft }),
    setExperienceDraft: (experienceDraft) => set({ experienceDraft }),
}));
