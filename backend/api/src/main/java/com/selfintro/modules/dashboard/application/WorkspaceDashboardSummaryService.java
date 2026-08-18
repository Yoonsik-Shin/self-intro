package com.selfintro.modules.dashboard.application;

import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.dashboard.presentation.dto.WorkspaceDashboardSummaryResponse;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.identity.publication.application.WorkspacePublicationService;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationStatusResponse;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceDashboardSummaryService {

    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;
    private final WorkspaceSkillRepository workspaceSkillRepository;
    private final CompetencyRepository competencyRepository;
    private final WorkspaceJobApplicationRepository workspaceJobApplicationRepository;
    private final WorkspacePublicationService workspacePublicationService;

    public WorkspaceDashboardSummaryResponse getSummary(Long workspaceId) {
        long experienceCount = experienceRepository.countByWorkspaceId(workspaceId);
        long studyCount = studyRepository.countByWorkspaceId(workspaceId);
        long skillCount = workspaceSkillRepository.countByWorkspaceId(workspaceId);
        long competencyCount = competencyRepository.countByWorkspaceId(workspaceId);
        long jobApplicationCount =
                workspaceJobApplicationRepository.countByWorkspaceId(workspaceId);
        WorkspacePublicationStatusResponse publicationStatus =
                workspacePublicationService.status(workspaceId);

        return new WorkspaceDashboardSummaryResponse(
                experienceCount,
                studyCount,
                skillCount,
                competencyCount,
                jobApplicationCount,
                publicationStatus);
    }
}
