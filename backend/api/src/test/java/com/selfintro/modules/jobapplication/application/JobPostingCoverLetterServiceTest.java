package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.domain.entity.JobPostingCoverLetterItem;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterItemRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterRevisionRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterItemRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobPostingCoverLetterServiceTest {

    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private JobPostingCoverLetterItemRepository coverLetterItemRepository;
    @Mock private JobPostingCoverLetterRevisionRepository revisionRepository;

    private JobPostingCoverLetterService service;

    @BeforeEach
    void setUp() {
        service = new JobPostingCoverLetterService(
                jobPostingRepository, coverLetterItemRepository, revisionRepository);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void replaceDeletesOldItemsAndSavesQuestionsAndAnswersInRequestOrder() {
        when(jobPostingRepository.existsById(1L)).thenReturn(true);
        when(coverLetterItemRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        var request =
                new JobPostingCoverLetterSaveRequest(
                        List.of(
                                new JobPostingCoverLetterItemRequest(
                                        "  지원 동기는?  ", "  최종 답변 1  ", 500),
                                new JobPostingCoverLetterItemRequest(
                                        "입사 후 포부는?", "최종 답변 2", null)));

        var result = service.replace(1L, request);

        verify(coverLetterItemRepository).deleteAllByJobPostingId(1L);
        verify(coverLetterItemRepository).flush();
        ArgumentCaptor<List<JobPostingCoverLetterItem>> captor =
                ArgumentCaptor.forClass((Class) List.class);
        verify(coverLetterItemRepository).saveAll(captor.capture());
        List<JobPostingCoverLetterItem> saved = captor.getValue();
        assertThat(saved)
                .extracting(JobPostingCoverLetterItem::getDisplayOrder)
                .containsExactly(0, 1);
        assertThat(saved)
                .extracting(JobPostingCoverLetterItem::getQuestion)
                .containsExactly("지원 동기는?", "입사 후 포부는?");
        assertThat(saved)
                .extracting(JobPostingCoverLetterItem::getCharacterLimit)
                .containsExactly(500, null);
        assertThat(result)
                .extracting(response -> response.answer())
                .containsExactly("  최종 답변 1  ", "최종 답변 2");
    }

    @Test
    void replaceAllowsQuestionWithoutAnswer() {
        when(jobPostingRepository.existsById(1L)).thenReturn(true);
        when(coverLetterItemRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        var request =
                new JobPostingCoverLetterSaveRequest(
                        List.of(new JobPostingCoverLetterItemRequest("지원 동기는?", "", 1000)));

        var result = service.replace(1L, request);

        assertThat(result).singleElement().extracting(response -> response.answer()).isEqualTo("");
    }

    @Test
    void replaceWithEmptyListClearsAllItems() {
        when(jobPostingRepository.existsById(1L)).thenReturn(true);

        var result = service.replace(1L, new JobPostingCoverLetterSaveRequest(List.of()));

        assertThat(result).isEmpty();
        verify(coverLetterItemRepository).deleteAllByJobPostingId(1L);
        verify(coverLetterItemRepository, never()).saveAll(anyList());
    }

    @Test
    void listRejectsUnknownPosting() {
        when(jobPostingRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.list(99L)).isInstanceOf(EntityNotFoundException.class);
        verify(coverLetterItemRepository, never()).findAllByJobPostingIdOrderByDisplayOrderAsc(99L);
    }
}
