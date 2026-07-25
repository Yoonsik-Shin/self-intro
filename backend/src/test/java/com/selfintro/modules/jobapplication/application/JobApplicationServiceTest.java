package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobapplication.domain.entity.JobApplication;
import com.selfintro.modules.jobapplication.domain.entity.JobApplicationStageEvent;
import com.selfintro.modules.jobapplication.domain.enums.JobApplicationStage;
import com.selfintro.modules.jobapplication.domain.repository.JobApplicationRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobApplicationStageEventRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {

    @Mock private JobApplicationRepository jobApplicationRepository;
    @Mock private JobApplicationStageEventRepository stageEventRepository;

    private JobApplicationService jobApplicationService;

    @BeforeEach
    void setUp() {
        jobApplicationService =
                new JobApplicationService(jobApplicationRepository, stageEventRepository);
    }

    private JobApplication newJobApplication() {
        JobApplication jobApplication =
                JobApplication.create(
                        "테스트 회사",
                        "백엔드 개발자",
                        "https://example.com/posting",
                        "사람인",
                        LocalDate.of(2026, 7, 1),
                        LocalDate.of(2026, 7, 31),
                        "협의 후 결정",
                        "메모",
                        LocalDate.of(2026, 7, 1).atStartOfDay());
        ReflectionTestUtils.setField(jobApplication, "id", 1L);
        return jobApplication;
    }

    @Test
    void createPersistsApplicationAndRecordsAppliedStageEvent() {
        when(jobApplicationRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            JobApplication argument = invocation.getArgument(0);
                            ReflectionTestUtils.setField(argument, "id", 1L);
                            return argument;
                        });

        JobApplicationRequest request =
                new JobApplicationRequest(
                        "테스트 회사",
                        "백엔드 개발자",
                        "https://example.com/posting",
                        "사람인",
                        LocalDate.of(2026, 7, 1),
                        LocalDate.of(2026, 7, 31),
                        "협의 후 결정",
                        "메모");

        JobApplicationResponse response = jobApplicationService.create(request);

        assertThat(response.companyName()).isEqualTo("테스트 회사");
        assertThat(response.currentStage()).isEqualTo(JobApplicationStage.APPLIED);

        ArgumentCaptor<JobApplicationStageEvent> eventCaptor =
                ArgumentCaptor.forClass(JobApplicationStageEvent.class);
        verify(stageEventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getStage()).isEqualTo(JobApplicationStage.APPLIED);
        assertThat(eventCaptor.getValue().getJobApplicationId()).isEqualTo(1L);
    }

    @Test
    void changeStageUpdatesCurrentStageAndAppendsHistoryEvent() {
        JobApplication jobApplication = newJobApplication();
        when(jobApplicationRepository.findById(1L)).thenReturn(Optional.of(jobApplication));

        JobApplicationResponse response =
                jobApplicationService.changeStage(1L, JobApplicationStage.CODING_TEST, "서류 통과");

        assertThat(response.currentStage()).isEqualTo(JobApplicationStage.CODING_TEST);

        ArgumentCaptor<JobApplicationStageEvent> eventCaptor =
                ArgumentCaptor.forClass(JobApplicationStageEvent.class);
        verify(stageEventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getStage()).isEqualTo(JobApplicationStage.CODING_TEST);
        assertThat(eventCaptor.getValue().getMemo()).isEqualTo("서류 통과");
    }

    @Test
    void changeStageThrowsWhenApplicationDoesNotExist() {
        when(jobApplicationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                jobApplicationService.changeStage(
                                        99L, JobApplicationStage.OFFER, null))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void stageEventsReturnsHistoryOrderedByChangedAt() {
        JobApplication jobApplication = newJobApplication();
        when(jobApplicationRepository.findById(1L)).thenReturn(Optional.of(jobApplication));
        JobApplicationStageEvent appliedEvent =
                JobApplicationStageEvent.of(
                        1L,
                        JobApplicationStage.APPLIED,
                        "지원 등록",
                        LocalDate.of(2026, 7, 1).atStartOfDay());
        when(stageEventRepository.findByJobApplicationIdOrderByChangedAtAsc(1L))
                .thenReturn(List.of(appliedEvent));

        List<com.selfintro.modules.jobapplication.presentation.dto.JobApplicationStageEventResponse>
                events = jobApplicationService.stageEvents(1L);

        assertThat(events).hasSize(1);
        assertThat(events.get(0).stage()).isEqualTo(JobApplicationStage.APPLIED);
    }
}
