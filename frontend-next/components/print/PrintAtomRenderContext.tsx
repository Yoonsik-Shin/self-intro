'use client';

import { createContext, useContext, type PointerEvent as ReactPointerEvent } from 'react';
import type {
    IntroductionResponse,
    JobPostingCoverLetterItem,
    PrintTemplateContentOverrides,
} from '@/lib/api/types';
import type {
    buildCareerCards,
    buildMilestones,
    buildOrderedCredentials,
    groupSkillsByUsage,
} from '@/lib/introDerivations';

type CustomPrintSection = NonNullable<PrintTemplateContentOverrides['customSections']>[number];

export type PrintAtomRenderContextValue = {
    introData: IntroductionResponse;
    inlineEditMode: boolean;
    contentOverrides: PrintTemplateContentOverrides;
    profile: IntroductionResponse['profile'];
    careerSummary: string;
    groupedCoreSkills: ReturnType<typeof groupSkillsByUsage>;
    orderedCareerCards: ReturnType<typeof buildCareerCards>;
    visibleCompetencies: IntroductionResponse['competencies'];
    orderedMilestones: ReturnType<typeof buildMilestones>;
    orderedCredentialExperiences: ReturnType<typeof buildOrderedCredentials>;
    coverLetterItems: JobPostingCoverLetterItem[];
    orderedCoverLetterItems: JobPostingCoverLetterItem[];
    coverLetterSectionTitle: string;
    setCoverLetterSectionTitle: (value: string) => void;
    setProfileOverride: (
        field: 'jobTitle' | 'bio' | 'coreStackSummary',
        val: string | undefined
    ) => void;
    setExperienceOverride: (
        expId: number,
        field: 'title' | 'summary' | 'role' | 'takeaway',
        val: string | undefined,
        baseVal: string
    ) => void;
    setCompetencyOverride: (
        compId: number,
        field: 'title' | 'summary',
        val: string | undefined,
        baseVal: string
    ) => void;
    setDetailOverride: (
        detailId: number,
        field: 'content' | 'narrative',
        val: string | undefined,
        baseVal: string
    ) => void;
    setCoverLetterOverride: (
        itemId: number,
        field: 'question' | 'answer',
        val: string | undefined,
        baseVal: string
    ) => void;
    addCoverLetterItem: () => void;
    updateAddedCoverLetterItem: (
        itemId: number,
        field: 'question' | 'answer',
        val: string | undefined
    ) => void;
    removeAddedCoverLetterItem: (itemId: number) => void;
    updateCustomSection: (
        sectionId: string,
        updater: (section: CustomPrintSection) => CustomPrintSection
    ) => void;
    removeCustomSection: (sectionId: string) => void;
    addCustomSectionItem: (sectionId: string) => void;
    updateCustomSectionItem: (
        sectionId: string,
        itemId: string,
        field: 'title' | 'content',
        value: string | undefined
    ) => void;
    removeCustomSectionItem: (sectionId: string, itemId: string) => void;
    toggleSkillSelection: (skillId: number) => void;
    setSkillSelectorModalOpen: (open: boolean) => void;
    atomPageMap: Map<string, number>;
    effectivePageMap: Map<string, number>;
    pageBreakBoundaryAtomIds: Set<string>;
    getAtomDisplayTitle: (atomId: string) => string;
    startGapDrag: (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => void;
    getForcePageAssociatedAtomIds: (id: string) => string[];
    forceMoveToPage: (ids: string[], pageIndex: number) => void;
    isPageBreakBannerVisible: (id: string) => boolean;
    isForcedViaGroupOwner: (id: string) => boolean;
};

export const PrintAtomRenderContext = createContext<PrintAtomRenderContextValue | null>(null);

export function usePrintAtomRenderContext(): PrintAtomRenderContextValue {
    const ctx = useContext(PrintAtomRenderContext);
    if (!ctx) {
        throw new Error(
            'usePrintAtomRenderContext must be used within PrintAtomRenderContext.Provider'
        );
    }
    return ctx;
}
