package com.selfintro.vectorsearch.application;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VectorBackfillOrchestratorTest {

    @Mock private VectorBatchSyncService vectorBatchSyncService;
    @Mock private ExperienceRepository experienceRepository;
    @Mock private StudyRepository studyRepository;
    @Mock private CareerProfileDigestBuilder careerProfileDigestBuilder;
    @Mock private VectorSourceReconciliationService vectorSourceReconciliationService;

    private VectorBackfillOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        orchestrator =
                new VectorBackfillOrchestrator(
                        vectorBatchSyncService,
                        experienceRepository,
                        studyRepository,
                        careerProfileDigestBuilder,
                        vectorSourceReconciliationService);
    }

    @Test
    void reconcilesOrphansBeforeBackfillingWorkspaceScopedSources() {
        Experience experience = mock(Experience.class);
        Study study = mock(Study.class);
        when(experience.getWorkspaceId()).thenReturn(10L);
        when(experience.getId()).thenReturn(100L);
        when(experience.getTitle()).thenReturn("experience");
        when(study.getWorkspaceId()).thenReturn(20L);
        when(study.getId()).thenReturn(200L);
        when(study.getTitle()).thenReturn("study");
        when(study.getContentMarkdown()).thenReturn("content");
        when(experienceRepository.findAllByOrderByDisplayOrderAsc())
                .thenReturn(List.of(experience));
        when(studyRepository.findAll()).thenReturn(List.of(study));
        when(careerProfileDigestBuilder.buildForExperience(experience)).thenReturn("digest");

        orchestrator.backfillAll();

        InOrder order =
                inOrder(
                        vectorSourceReconciliationService,
                        vectorBatchSyncService,
                        experienceRepository,
                        studyRepository);
        order.verify(vectorSourceReconciliationService).removeOrphans();
        order.verify(experienceRepository).findAllByOrderByDisplayOrderAsc();
        order.verify(vectorBatchSyncService)
                .syncExperienceVector(10L, 100L, "experience", "digest");
        order.verify(studyRepository).findAll();
        order.verify(vectorBatchSyncService)
                .syncStudyVector(20L, 200L, "study", "content");
        verify(vectorBatchSyncService)
                .syncExperienceVector(10L, 100L, "experience", "digest");
        verify(vectorBatchSyncService).syncStudyVector(20L, 200L, "study", "content");
    }
}
