package com.selfintro.vectorsearch.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort.WorkspaceVectorInventory;
import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort.WorkspaceVectorPurgeResult;
import com.selfintro.vectorsearch.domain.repository.ExperienceVectorRepository;
import com.selfintro.vectorsearch.domain.repository.StudyVectorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspaceVectorPurgeServiceTest {

    @Mock private ExperienceVectorRepository experienceVectorRepository;
    @Mock private StudyVectorRepository studyVectorRepository;

    private WorkspaceVectorPurgeService service;

    @BeforeEach
    void setUp() {
        service =
                new WorkspaceVectorPurgeService(experienceVectorRepository, studyVectorRepository);
    }

    @Test
    void inspectCountsOnlyWorkspaceOwnedVectorTables() {
        when(experienceVectorRepository.countByWorkspaceId(42L)).thenReturn(3L);
        when(studyVectorRepository.countByWorkspaceId(42L)).thenReturn(5L);

        WorkspaceVectorInventory inventory = service.inspect(42L);

        assertThat(inventory.experienceVectorCount()).isEqualTo(3);
        assertThat(inventory.studyVectorCount()).isEqualTo(5);
        assertThat(inventory.totalCandidateCount()).isEqualTo(8);
    }

    @Test
    void purgeFailsClosedWhileDeleteFlagIsDisabled() {
        ReflectionTestUtils.setField(service, "vectorDeleteEnabled", false);

        assertThatThrownBy(() -> service.purge(42L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("비활성화");
    }

    @Test
    void purgeDeletesExperienceAndStudyVectorsAndVerifiesEmpty() {
        ReflectionTestUtils.setField(service, "vectorDeleteEnabled", true);
        when(experienceVectorRepository.deleteAllByWorkspaceId(42L)).thenReturn(3);
        when(studyVectorRepository.deleteAllByWorkspaceId(42L)).thenReturn(5);
        when(experienceVectorRepository.countByWorkspaceId(42L)).thenReturn(0L);
        when(studyVectorRepository.countByWorkspaceId(42L)).thenReturn(0L);

        WorkspaceVectorPurgeResult result = service.purge(42L);

        assertThat(result.deletedExperienceVectorCount()).isEqualTo(3);
        assertThat(result.deletedStudyVectorCount()).isEqualTo(5);
        assertThat(result.totalDeletedCount()).isEqualTo(8);
        verify(experienceVectorRepository).deleteAllByWorkspaceId(42L);
        verify(studyVectorRepository).deleteAllByWorkspaceId(42L);
    }

    @Test
    void purgeFailsWhenRowsRemainAfterDelete() {
        ReflectionTestUtils.setField(service, "vectorDeleteEnabled", true);
        when(experienceVectorRepository.countByWorkspaceId(42L)).thenReturn(1L);

        assertThatThrownBy(() -> service.purge(42L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("잔여 데이터");
    }

    @Test
    void rejectsNonPositiveWorkspaceId() {
        assertThatThrownBy(() -> service.inspect(0L)).isInstanceOf(IllegalArgumentException.class);
    }
}
