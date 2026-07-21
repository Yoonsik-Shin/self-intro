'use client';

import { useMemo, useState } from 'react';
import type { IntroductionResponse, RelatedExperience } from '@/lib/api/types';
import { buildCareerCards, buildMilestones } from '@/lib/introDerivations';
import { scrollToSection, scrollToElement } from '@/lib/scroll';
import { SkillsSection } from './SkillsSection';
import { CompetenciesSection } from './CompetenciesSection';
import { CareerSection } from './CareerSection';
import { ProjectsSection } from './ProjectsSection';
import { CredentialsSection } from './CredentialsSection';

type Props = {
    introData: IntroductionResponse;
};

export function ResumeSections({ introData }: Props) {
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
    const [expandedDetailIds, setExpandedDetailIds] = useState<number[]>([]);
    const [expandedProjectIds, setExpandedProjectIds] = useState<number[]>([]);

    const milestones = useMemo(() => buildMilestones(introData), [introData]);
    const careerCards = useMemo(() => buildCareerCards(introData.experiences), [introData]);
    const educationExperiences = useMemo(
        () =>
            [...introData.experiences.filter((exp) => exp.type === 'EDUCATION')].sort((a, b) =>
                b.periodStart.localeCompare(a.periodStart)
            ),
        [introData]
    );
    const certificateExperiences = useMemo(
        () =>
            [...introData.experiences.filter((exp) => exp.type === 'CERTIFICATE')].sort((a, b) =>
                b.periodStart.localeCompare(a.periodStart)
            ),
        [introData]
    );

    const toggleDetail = (id: number) =>
        setExpandedDetailIds((current) =>
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
        );
    const toggleProject = (id: number) =>
        setExpandedProjectIds((current) =>
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
        );

    const navigateToRelatedExperience = (experience: RelatedExperience) => {
        if (experience.type === 'PROJECT') {
            const milestone = milestones.find((item) => item.experienceId === experience.id);
            if (milestone) setSelectedMilestoneId(milestone.id);
            scrollToElement(`project-experience-${experience.id}`);
            return;
        }
        scrollToSection(experience.type === 'CAREER' ? 'career' : 'credentials');
    };

    return (
        <div className="flex flex-col gap-12">
            <SkillsSection
                skills={introData.skills}
                experiences={introData.experiences}
                milestones={milestones}
                onSelectMilestone={setSelectedMilestoneId}
            />
            <CompetenciesSection
                competencies={introData.competencies}
                milestones={milestones}
                onSelectMilestone={setSelectedMilestoneId}
            />
            <CareerSection
                careerCards={careerCards}
                careerSummary={introData.careerSummary}
                expandedDetailIds={expandedDetailIds}
                onToggleDetail={toggleDetail}
                onSetExpandedDetailIds={setExpandedDetailIds}
                expandedProjectIds={expandedProjectIds}
                onToggleProject={toggleProject}
                onSetExpandedProjectIds={setExpandedProjectIds}
                onNavigateRelatedExperience={navigateToRelatedExperience}
            />
            {/* 원본은 DOM 순서상 credentials가 projects보다 먼저 오지만 CSS order-1/order-2로
          화면에서는 projects를 먼저 보여준다(부모가 flex 컨테이너였기 때문). 여기서는 그 순서를
          그대로 JSX 순서로 반영해 별도의 order 유틸리티 없이 동일한 결과를 낸다. */}
            <ProjectsSection
                milestones={milestones}
                selectedMilestoneId={selectedMilestoneId}
                onSelectMilestone={setSelectedMilestoneId}
                expandedDetailIds={expandedDetailIds}
                onToggleDetail={toggleDetail}
                onSetExpandedDetailIds={setExpandedDetailIds}
                onNavigateRelatedExperience={navigateToRelatedExperience}
            />
            <CredentialsSection
                educationExperiences={educationExperiences}
                certificateExperiences={certificateExperiences}
            />
        </div>
    );
}
