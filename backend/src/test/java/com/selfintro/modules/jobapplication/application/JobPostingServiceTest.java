package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingCandidateRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingCandidateResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class JobPostingServiceTest {

    @Mock private JobPostingCandidateRepository candidateRepository;
    @Mock private JobApplicationService jobApplicationService;
    @Mock private JobApplicationUrlParseService urlParseService;
    @Mock private JobMatchingService matchingService;

    private JobPostingService jobPostingService;

    @BeforeEach
    void setUp() {
        jobPostingService =
                new JobPostingService(
                        candidateRepository,
                        jobApplicationService,
                        urlParseService,
                        matchingService);
    }

    private JobPostingCandidate newCandidate() {
        JobPostingCandidate candidate =
                JobPostingCandidate.create(
                        new JobPostingCandidate.Draft(
                                null,
                                "백엔드 개발자",
                                "테스트 회사",
                                "https://example.com/posting",
                                JobPostingSource.URL_INGEST,
                                null,
                                null,
                                null,
                                LocalDate.now().plusDays(10),
                                "협의"),
                        LocalDateTime.now());
        ReflectionTestUtils.setField(candidate, "id", 1L);
        return candidate;
    }

    @Test
    void ingestUrlRejectsAlreadyCollectedUrl() {
        when(candidateRepository.existsByUrl("https://example.com/posting")).thenReturn(true);

        assertThatThrownBy(() -> jobPostingService.ingestUrl("https://example.com/posting"))
                .isInstanceOf(ResponseStatusException.class);

        verify(urlParseService, never()).parse(any());
    }

    @Test
    void ingestUrlRejectsWhenAiCannotExtractCoreFields() {
        when(candidateRepository.existsByUrl(any())).thenReturn(false);
        when(urlParseService.parse(any()))
                .thenReturn(
                        new JobApplicationUrlParseResponse(
                                null, null, null, null, null, "https://example.com/posting"));

        assertThatThrownBy(() -> jobPostingService.ingestUrl("https://example.com/posting"))
                .isInstanceOf(ResponseStatusException.class);

        verify(candidateRepository, never()).save(any());
    }

    @Test
    void ingestUrlSavesNewCandidateOnSuccess() {
        when(candidateRepository.existsByUrl(any())).thenReturn(false);
        when(urlParseService.parse(any()))
                .thenReturn(
                        new JobApplicationUrlParseResponse(
                                "테스트 회사",
                                "백엔드 개발자",
                                "사람인",
                                LocalDate.now().plusDays(5),
                                "협의",
                                "https://example.com/posting"));
        when(candidateRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(matchingService.evaluate(any(), any()))
                .thenReturn(new JobMatchingService.MatchResult(80, "보유 기술과 일치도가 높습니다."));

        JobPostingCandidateResponse response =
                jobPostingService.ingestUrl("https://example.com/posting");

        assertThat(response.companyName()).isEqualTo("테스트 회사");
        assertThat(response.status()).isEqualTo(JobPostingCandidateStatus.NEW);
        assertThat(response.matchScore()).isEqualTo(80);
    }

    @Test
    void saveMovesNewCandidateToSavedStatus() {
        JobPostingCandidate candidate = newCandidate();
        when(candidateRepository.findById(1L)).thenReturn(Optional.of(candidate));

        jobPostingService.save(1L);

        assertThat(candidate.getStatus()).isEqualTo(JobPostingCandidateStatus.SAVED);
    }

    @Test
    void convertToApplicationCreatesApplicationAndMarksCandidateConverted() {
        JobPostingCandidate candidate = newCandidate();
        when(candidateRepository.findById(1L)).thenReturn(Optional.of(candidate));
        when(jobApplicationService.create(any(JobApplicationRequest.class), eq(1L)))
                .thenReturn(
                        new JobApplicationResponse(
                                10L,
                                "테스트 회사",
                                "백엔드 개발자",
                                "https://example.com/posting",
                                "URL 수집",
                                LocalDate.now(),
                                candidate.getDeadline(),
                                com.selfintro.modules.jobapplication.domain.enums
                                        .JobApplicationStage.APPLIED,
                                "협의",
                                null,
                                LocalDateTime.now(),
                                LocalDateTime.now()));

        JobApplicationResponse response = jobPostingService.convertToApplication(1L);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(candidate.getStatus()).isEqualTo(JobPostingCandidateStatus.CONVERTED);

        ArgumentCaptor<JobApplicationRequest> requestCaptor =
                ArgumentCaptor.forClass(JobApplicationRequest.class);
        verify(jobApplicationService).create(requestCaptor.capture(), eq(1L));
        assertThat(requestCaptor.getValue().companyName()).isEqualTo("테스트 회사");
        assertThat(requestCaptor.getValue().source()).isEqualTo("URL 수집");
    }

    @Test
    void dismissThrowsWhenCandidateDoesNotExist() {
        when(candidateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobPostingService.dismiss(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
