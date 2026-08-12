package com.selfintro.vectorsearch.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService.ReconciliationInspection;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService.ReconciliationResult;
import com.selfintro.vectorsearch.domain.repository.ExperienceVectorRepository;
import com.selfintro.vectorsearch.domain.repository.StudyVectorRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VectorSourceReconciliationServiceTest {

    @Mock private ExperienceVectorRepository experienceVectorRepository;
    @Mock private StudyVectorRepository studyVectorRepository;
    @Mock private ExperienceRepository experienceRepository;
    @Mock private StudyRepository studyRepository;
    @Mock private VectorBatchSyncService vectorBatchSyncService;
    @Mock private CareerProfileDigestBuilder careerProfileDigestBuilder;

    private VectorSourceReconciliationService service;

    @BeforeEach
    void setUp() {
        service =
                new VectorSourceReconciliationService(
                        experienceVectorRepository,
                        studyVectorRepository,
                        experienceRepository,
                        studyRepository,
                        vectorBatchSyncService,
                        careerProfileDigestBuilder);
    }

    @Test
    void removesOnlySourceReferencesMissingFromTheSameWorkspace() {
        var existingExperience = experienceReference(10L, 100L);
        var orphanExperience = experienceReference(20L, 100L);
        var orphanStudy = studyReference(30L, 300L);
        var existingExperienceSource = experienceSourceReference(10L, 100L);
        when(experienceVectorRepository.findDistinctSourceReferences())
                .thenReturn(List.of(existingExperience, orphanExperience));
        when(studyVectorRepository.findDistinctSourceReferences()).thenReturn(List.of(orphanStudy));
        when(experienceRepository.findAllSourceReferences())
                .thenReturn(List.of(existingExperienceSource));
        when(studyRepository.findAllSourceReferences()).thenReturn(List.of());
        when(vectorBatchSyncService.deleteExperienceVector(20L, 100L)).thenReturn(3);
        when(vectorBatchSyncService.deleteStudyVector(30L, 300L)).thenReturn(2);

        ReconciliationResult result = service.removeOrphans();

        assertThat(result.scannedExperienceNamespaces()).isEqualTo(2);
        assertThat(result.deletedExperienceNamespaces()).isEqualTo(1);
        assertThat(result.deletedExperienceChunks()).isEqualTo(3);
        assertThat(result.scannedStudyNamespaces()).isEqualTo(1);
        assertThat(result.deletedStudyNamespaces()).isEqualTo(1);
        assertThat(result.deletedStudyChunks()).isEqualTo(2);
        verify(vectorBatchSyncService, never()).deleteExperienceVector(10L, 100L);
        verify(vectorBatchSyncService).deleteExperienceVector(20L, 100L);
        verify(vectorBatchSyncService).deleteStudyVector(30L, 300L);
    }

    @Test
    void inspectionReportsOrphansWithoutDeletingVectors() {
        var orphanExperience = experienceReference(20L, 100L);
        var missingExperienceSource = experienceSourceReference(40L, 400L);
        var existingStudy = studyReference(30L, 300L);
        var existingStudySource = studySourceReference(30L, 300L);
        when(experienceVectorRepository.findDistinctSourceReferences())
                .thenReturn(List.of(orphanExperience));
        when(studyVectorRepository.findDistinctSourceReferences())
                .thenReturn(List.of(existingStudy));
        when(experienceRepository.findAllSourceReferences())
                .thenReturn(List.of(missingExperienceSource));
        when(studyRepository.findAllSourceReferences()).thenReturn(List.of(existingStudySource));

        ReconciliationInspection inspection = service.inspectOrphans();

        assertThat(inspection.scannedExperienceNamespaces()).isEqualTo(1);
        assertThat(inspection.sourceExperienceNamespaces()).isEqualTo(1);
        assertThat(inspection.orphanExperienceNamespaces()).isEqualTo(1);
        assertThat(inspection.missingExperienceNamespaces()).isEqualTo(1);
        assertThat(inspection.scannedStudyNamespaces()).isEqualTo(1);
        assertThat(inspection.sourceStudyNamespaces()).isEqualTo(1);
        assertThat(inspection.orphanStudyNamespaces()).isZero();
        assertThat(inspection.missingStudyNamespaces()).isZero();
        verify(vectorBatchSyncService, never())
                .deleteExperienceVector(
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        verify(vectorBatchSyncService, never())
                .deleteStudyVector(
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void repairsOnlyMissingNamespacesWithStrictExternalEmbedding() {
        var missingExperienceSource = experienceSourceReference(40L, 400L);
        var missingStudySource = studySourceReference(50L, 500L);
        var experience = mock(Experience.class);
        var study = mock(Study.class);
        when(experienceVectorRepository.findDistinctSourceReferences()).thenReturn(List.of());
        when(studyVectorRepository.findDistinctSourceReferences()).thenReturn(List.of());
        when(experienceRepository.findAllSourceReferences())
                .thenReturn(List.of(missingExperienceSource));
        when(studyRepository.findAllSourceReferences()).thenReturn(List.of(missingStudySource));
        when(experienceRepository.findByIdAndWorkspaceId(400L, 40L))
                .thenReturn(java.util.Optional.of(experience));
        when(studyRepository.findByIdAndWorkspaceId(500L, 50L))
                .thenReturn(java.util.Optional.of(study));
        when(experience.getTitle()).thenReturn("experience");
        when(study.getTitle()).thenReturn("study");
        when(study.getContentMarkdown()).thenReturn("study content");
        when(careerProfileDigestBuilder.buildForExperience(experience)).thenReturn("digest");
        when(vectorBatchSyncService.syncExperienceVectorStrictExternal(
                        40L, 400L, "experience", "digest"))
                .thenReturn(2);
        when(vectorBatchSyncService.syncStudyVectorStrictExternal(
                        50L, 500L, "study", "study content"))
                .thenReturn(3);

        var result = service.repairMissingWithExternalProvider();

        assertThat(result.repairedExperienceNamespaces()).isEqualTo(1);
        assertThat(result.createdExperienceChunks()).isEqualTo(2);
        assertThat(result.repairedStudyNamespaces()).isEqualTo(1);
        assertThat(result.createdStudyChunks()).isEqualTo(3);
        verify(vectorBatchSyncService)
                .syncExperienceVectorStrictExternal(40L, 400L, "experience", "digest");
        verify(vectorBatchSyncService)
                .syncStudyVectorStrictExternal(50L, 500L, "study", "study content");
    }

    private ExperienceVectorRepository.ExperienceVectorReference experienceReference(
            Long workspaceId, Long experienceId) {
        var reference = mock(ExperienceVectorRepository.ExperienceVectorReference.class);
        when(reference.getWorkspaceId()).thenReturn(workspaceId);
        when(reference.getExperienceId()).thenReturn(experienceId);
        return reference;
    }

    private StudyVectorRepository.StudyVectorReference studyReference(
            Long workspaceId, Long studyId) {
        var reference = mock(StudyVectorRepository.StudyVectorReference.class);
        when(reference.getWorkspaceId()).thenReturn(workspaceId);
        when(reference.getStudyId()).thenReturn(studyId);
        return reference;
    }

    private ExperienceRepository.ExperienceSourceReference experienceSourceReference(
            Long workspaceId, Long experienceId) {
        var reference = mock(ExperienceRepository.ExperienceSourceReference.class);
        when(reference.getWorkspaceId()).thenReturn(workspaceId);
        when(reference.getExperienceId()).thenReturn(experienceId);
        return reference;
    }

    private StudyRepository.StudySourceReference studySourceReference(
            Long workspaceId, Long studyId) {
        var reference = mock(StudyRepository.StudySourceReference.class);
        when(reference.getWorkspaceId()).thenReturn(workspaceId);
        when(reference.getStudyId()).thenReturn(studyId);
        return reference;
    }
}
