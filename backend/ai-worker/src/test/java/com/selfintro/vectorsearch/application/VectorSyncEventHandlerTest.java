package com.selfintro.vectorsearch.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.experience.event.ExperienceUpdatedEvent;
import com.selfintro.modules.study.event.StudyUpdatedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VectorSyncEventHandlerTest {

    @Mock private VectorBatchSyncService vectorBatchSyncService;

    private VectorSyncEventHandler handler;

    @BeforeEach
    void setUp() {
        handler = new VectorSyncEventHandler(vectorBatchSyncService);
    }

    @Test
    void deletesOnlyTheExperienceVectorNamespaceFromDeleteEvent() {
        handler.handleExperienceUpdated(ExperienceUpdatedEvent.deleted(42L, 7L));

        verify(vectorBatchSyncService).deleteExperienceVector(42L, 7L);
        verifyNoMoreInteractions(vectorBatchSyncService);
    }

    @Test
    void deletesOnlyTheStudyVectorNamespaceFromDeleteEvent() {
        handler.handleStudyUpdated(StudyUpdatedEvent.deleted(42L, 8L));

        verify(vectorBatchSyncService).deleteStudyVector(42L, 8L);
        verifyNoMoreInteractions(vectorBatchSyncService);
    }

    @Test
    void keepsExistingUpdateEventContractCompatible() {
        handler.handleExperienceUpdated(new ExperienceUpdatedEvent(42L, 7L, "제목", "본문"));
        handler.handleStudyUpdated(new StudyUpdatedEvent(42L, 8L, "제목", "본문"));

        verify(vectorBatchSyncService).syncExperienceVector(42L, 7L, "제목", "본문");
        verify(vectorBatchSyncService).syncStudyVector(42L, 8L, "제목", "본문");
    }

    @Test
    void propagatesFailureSoListenerRetryAndDlqCanHandleIt() {
        ExperienceUpdatedEvent event = new ExperienceUpdatedEvent(42L, 7L, "제목", "본문");
        when(vectorBatchSyncService.syncExperienceVector(42L, 7L, "제목", "본문"))
                .thenThrow(new IllegalStateException("vector provider unavailable"));

        assertThatThrownBy(() -> handler.handleExperienceUpdated(event))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("unavailable");
    }
}
