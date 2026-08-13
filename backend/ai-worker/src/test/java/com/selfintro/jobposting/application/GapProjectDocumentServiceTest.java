package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.LlmDispatcher;
import com.selfintro.jobposting.domain.repository.GapProjectDocumentRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService;
import jakarta.persistence.EntityNotFoundException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GapProjectDocumentServiceTest {

    @Mock private GapProjectDocumentRepository repository;
    @Mock private WorkspaceJobApplicationRepository applicationRepository;
    @Mock private JobPostingSourceUrlRepository sourceUrlRepository;
    @Mock private JobPostingPositionChoiceRepository positionChoiceRepository;
    @Mock private JobPostingSourceImageRepository sourceImageRepository;
    @Mock private RelevantProfileDigestService relevantProfileDigestService;
    @Mock private LlmDispatcher llmDispatcher;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private GapProjectDocumentService service;

    @Test
    void anotherWorkspaceCannotListGapDocumentsByPostingId() {
        when(applicationRepository.findByWorkspaceIdAndJobPostingId(22L, 100L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.list(22L, 100L))
                .isInstanceOf(EntityNotFoundException.class);

        verify(repository, never())
                .findAllByWorkspaceJobApplicationIdOrderByVersionDesc(
                        org.mockito.ArgumentMatchers.anyLong());
    }
}
