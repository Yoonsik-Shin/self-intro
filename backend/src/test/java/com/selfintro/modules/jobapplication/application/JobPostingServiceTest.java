package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingCandidateRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingCandidateResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingResponse;
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
    @Mock private JobPostingSettingRepository settingRepository;
    @Mock private JobApplicationService jobApplicationService;
    @Mock private JobApplicationUrlParseService urlParseService;
    @Mock private JobMatchingService matchingService;

    private JobPostingService jobPostingService;

    @BeforeEach
    void setUp() {
        jobPostingService =
                new JobPostingService(
                        candidateRepository,
                        settingRepository,
                        jobApplicationService,
                        urlParseService,
                        matchingService,
                        new ObjectMapper());
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
                                "협의",
                                null,
                                null,
                                null,
                                null,
                                null,
                                null),
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
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                "https://example.com/posting"));

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
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
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
    void unsaveMovesSavedCandidateBackToNewStatus() {
        JobPostingCandidate candidate = newCandidate();
        candidate.save(LocalDateTime.now());
        when(candidateRepository.findById(1L)).thenReturn(Optional.of(candidate));

        jobPostingService.unsave(1L);

        assertThat(candidate.getStatus()).isEqualTo(JobPostingCandidateStatus.NEW);
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
                                null,
                                null,
                                null,
                                null,
                                null,
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

    @Test
    void updateSettingsPersistsAllFieldsOnTheSingletonRow() {
        JobPostingSetting setting = JobPostingSetting.defaults(LocalDateTime.now());
        when(settingRepository.getOrCreateDefault()).thenReturn(setting);
        JobPostingSettingRequest request =
                new JobPostingSettingRequest(
                        true,
                        "Java Spring",
                        30,
                        "rc",
                        "101000",
                        "84",
                        "10",
                        true,
                        3,
                        "0 0 9 * * *");

        JobPostingSettingResponse response = jobPostingService.updateSettings(request);

        assertThat(response.saraminEnabled()).isTrue();
        assertThat(response.searchKeywords()).isEqualTo("Java Spring");
        assertThat(response.searchCount()).isEqualTo(30);
        assertThat(response.searchSort()).isEqualTo("rc");
        assertThat(response.collectorScheduledEnabled()).isTrue();
        assertThat(response.matchingKeywordThreshold()).isEqualTo(3);
        assertThat(response.collectorCron()).isEqualTo("0 0 9 * * *");
    }

    @Test
    void updateSettingsRejectsInvalidCronExpression() {
        JobPostingSettingRequest request =
                new JobPostingSettingRequest(
                        true, "Java Spring", 30, "rc", "101000", "84", "10", true, 3, "not a cron");

        assertThatThrownBy(() -> jobPostingService.updateSettings(request))
                .isInstanceOf(ResponseStatusException.class);
    }
}
