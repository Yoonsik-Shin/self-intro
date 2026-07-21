import { Briefcase, Cpu, GraduationCap, Sparkles, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PrintSection = {
  id: string;
  label: string;
  icon: LucideIcon;
};

/** 인쇄 대상 섹션 (타임라인은 인쇄에서 제외) */
export const printableSections: PrintSection[] = [
  { id: 'intro-profile', label: '프로필', icon: User },
  { id: 'skills', label: '기술 스택', icon: Cpu },
  { id: 'competencies', label: '핵심 역량', icon: Sparkles },
  { id: 'career', label: '직장 경력', icon: Briefcase },
  { id: 'projects', label: '핵심 프로젝트', icon: Briefcase },
  { id: 'credentials', label: '학력·교육 및 자격증', icon: GraduationCap },
];

/** 프로필은 인쇄 프리뷰에서 제외/이동이 불가능하게 고정된다 */
export const LOCKED_PRINT_SECTION_ID = 'intro-profile';

export const reorderablePrintSections = printableSections.filter((s) => s.id !== LOCKED_PRINT_SECTION_ID);
