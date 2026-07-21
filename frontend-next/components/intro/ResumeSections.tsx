'use client';

import { useMemo, useState } from 'react';
import type { IntroductionResponse, RelatedExperience } from '@/lib/api/types';
import { buildCareerCards, buildMilestones } from '@/lib/introDerivations';
import { scrollToSection, scrollToElement } from '@/lib/scroll';
import { TimelineSection } from './TimelineSection';
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
    () => [...introData.experiences.filter((exp) => exp.type === 'EDUCATION')].sort((a, b) => b.periodStart.localeCompare(a.periodStart)),
    [introData],
  );
  const certificateExperiences = useMemo(
    () => [...introData.experiences.filter((exp) => exp.type === 'CERTIFICATE')].sort((a, b) => b.periodStart.localeCompare(a.periodStart)),
    [introData],
  );

  const toggleDetail = (id: number) => setExpandedDetailIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const toggleProject = (id: number) => setExpandedProjectIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

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
    <div className="space-y-8">
      <TimelineSection experiences={introData.experiences} onSelectMilestone={setSelectedMilestoneId} />
      <SkillsSection skills={introData.skills} experiences={introData.experiences} milestones={milestones} onSelectMilestone={setSelectedMilestoneId} />
      <CompetenciesSection competencies={introData.competencies} milestones={milestones} onSelectMilestone={setSelectedMilestoneId} />
      <CareerSection
        careerCards={careerCards}
        careerSummary={introData.careerSummary}
        expandedDetailIds={expandedDetailIds}
        onToggleDetail={toggleDetail}
        expandedProjectIds={expandedProjectIds}
        onToggleProject={toggleProject}
        onNavigateRelatedExperience={navigateToRelatedExperience}
      />
      <CredentialsSection educationExperiences={educationExperiences} certificateExperiences={certificateExperiences} />
      <ProjectsSection
        milestones={milestones}
        selectedMilestoneId={selectedMilestoneId}
        onSelectMilestone={setSelectedMilestoneId}
        expandedDetailIds={expandedDetailIds}
        onToggleDetail={toggleDetail}
        onNavigateRelatedExperience={navigateToRelatedExperience}
      />
    </div>
  );
}
