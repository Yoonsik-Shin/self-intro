package com.selfintro.modules.jobposting.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterItemRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterRevisionRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkspaceJobApplicationCoverLetterServiceTest {

    @Mock private WorkspaceJobApplicationRepository applicationRepository;
    @Mock private JobPostingCoverLetterItemRepository itemRepository;
    @Mock private JobPostingCoverLetterRevisionRepository revisionRepository;

    private WorkspaceJobApplicationCoverLetterService service;

    @BeforeEach
    void setUp() {
        service =
                new WorkspaceJobApplicationCoverLetterService(
                        applicationRepository, itemRepository, revisionRepository);
    }

    @Test
    void anotherWorkspaceCannotReadCoverLettersByPostingId() {
        when(applicationRepository.findByWorkspaceIdAndJobPostingId(22L, 100L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.list(22L, 100L))
                .isInstanceOf(EntityNotFoundException.class);

        verify(itemRepository, never())
                .findAllByWorkspaceJobApplicationIdOrderByDisplayOrderAsc(
                        org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void revisionRequiresItemOwnedBySameWorkspaceApplication() {
        WorkspaceJobApplication application =
                org.mockito.Mockito.mock(WorkspaceJobApplication.class);
        when(application.getId()).thenReturn(33L);
        when(applicationRepository.findByWorkspaceIdAndJobPostingId(11L, 100L))
                .thenReturn(Optional.of(application));
        when(itemRepository.findByIdAndWorkspaceJobApplicationId(77L, 33L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.revisions(11L, 100L, 77L))
                .isInstanceOf(EntityNotFoundException.class);

        verify(revisionRepository, never())
                .findByCoverLetterItemIdOrderByIdAsc(org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void anotherWorkspaceCannotReplaceOrDeleteCoverLetters() {
        when(applicationRepository.findByWorkspaceIdAndJobPostingId(22L, 100L))
                .thenReturn(Optional.empty());
        var request =
                new com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest(
                        List.of());

        assertThatThrownBy(() -> service.replace(22L, 100L, request))
                .isInstanceOf(EntityNotFoundException.class);

        verify(itemRepository, never())
                .deleteAllByWorkspaceJobApplicationId(
                        org.mockito.ArgumentMatchers.anyLong());
    }
}
