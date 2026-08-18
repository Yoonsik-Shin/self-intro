package com.selfintro.modules.dashboard.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.dashboard.presentation.dto.WorkspaceDashboardSummaryResponse;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.identity.publication.application.WorkspacePublicationService;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationStatusResponse;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkspaceDashboardSummaryServiceTest {

    @Mock private ExperienceRepository experienceRepository;
    @Mock private StudyRepository studyRepository;
    @Mock private WorkspaceSkillRepository workspaceSkillRepository;
    @Mock private CompetencyRepository competencyRepository;
    @Mock private WorkspaceJobApplicationRepository workspaceJobApplicationRepository;
    @Mock private WorkspacePublicationService workspacePublicationService;

    private WorkspaceDashboardSummaryService service;

    @BeforeEach
    void setUp() {
        service =
                new WorkspaceDashboardSummaryService(
                        experienceRepository,
                        studyRepository,
                        workspaceSkillRepository,
                        competencyRepository,
                        workspaceJobApplicationRepository,
                        workspacePublicationService);
    }

    @Test
    void aggregatesCountsAndPublicationStatus() {
        Long workspaceId = 1L;
        when(experienceRepository.countByWorkspaceId(workspaceId)).thenReturn(5L);
        when(studyRepository.countByWorkspaceId(workspaceId)).thenReturn(12L);
        when(workspaceSkillRepository.countByWorkspaceId(workspaceId)).thenReturn(8L);
        when(competencyRepository.countByWorkspaceId(workspaceId)).thenReturn(4L);
        when(workspaceJobApplicationRepository.countByWorkspaceId(workspaceId)).thenReturn(3L);
        when(workspacePublicationService.status(workspaceId))
                .thenReturn(
                        new WorkspacePublicationStatusResponse(
                                "PUBLISHED", 1, LocalDateTime.now(), true));

        WorkspaceDashboardSummaryResponse response = service.getSummary(workspaceId);

        assertThat(response.experienceCount()).isEqualTo(5L);
        assertThat(response.studyCount()).isEqualTo(12L);
        assertThat(response.skillCount()).isEqualTo(8L);
        assertThat(response.competencyCount()).isEqualTo(4L);
        assertThat(response.jobApplicationCount()).isEqualTo(3L);
        assertThat(response.publicationStatus().publicationStatus()).isEqualTo("PUBLISHED");
    }
}
