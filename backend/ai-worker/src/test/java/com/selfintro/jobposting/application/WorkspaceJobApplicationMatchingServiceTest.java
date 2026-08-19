package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspaceJobApplicationMatchingServiceTest {

    @Mock private WorkspaceJobApplicationRepository applicationRepository;
    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private JobMatchingService matchingService;
    @Mock private JobPostingSourceUrlRepository sourceUrlRepository;
    @Mock private JobPostingPositionChoiceRepository positionChoiceRepository;
    @Mock private JobPostingSourceImageRepository sourceImageRepository;

    private WorkspaceJobApplicationMatchingService service() {
        return new WorkspaceJobApplicationMatchingService(
                applicationRepository,
                jobPostingRepository,
                matchingService,
                sourceUrlRepository,
                positionChoiceRepository,
                sourceImageRepository);
    }

    private JobPosting posting(Long id) {
        JobPosting posting =
                JobPosting.collect(
                        new JobPosting.Draft(
                                "백엔드 개발자",
                                "테스트 회사",
                                "https://example.com/jobs/1",
                                null,
                                JobPostingSource.URL_INGEST,
                                "Java Spring",
                                "서울",
                                null,
                                null,
                                false,
                                null,
                                "서비스 개발",
                                "Java 경험",
                                "Spring 경험",
                                null,
                                null,
                                null),
                        LocalDateTime.now());
        ReflectionTestUtils.setField(posting, "id", id);
        return posting;
    }

    @Test
    void storesMatchOnlyOnTheRequestedWorkspaceApplication() {
        Long workspaceId = 21L;
        JobPosting posting = posting(101L);
        WorkspaceJobApplication application =
                WorkspaceJobApplication.create(
                        workspaceId,
                        posting,
                        JobPostingStatus.SAVED,
                        null,
                        null,
                        3,
                        LocalDateTime.now());
        when(applicationRepository.findByWorkspaceIdAndJobPostingId(workspaceId, 101L))
                .thenReturn(Optional.of(application));
        when(matchingService.evaluate(eq(workspaceId), eq("백엔드 개발자"), anyString()))
                .thenReturn(new JobMatchingService.MatchResult(87, "현재 Workspace 기술과 일치합니다."));
        when(sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(101L))
                .thenReturn(List.of());
        when(positionChoiceRepository.findByJobPostingIdOrderByRankOrderAsc(101L))
                .thenReturn(List.of());
        when(sourceImageRepository.findByJobPostingIdOrderByDisplayOrderAsc(101L))
                .thenReturn(List.of());

        JobPostingResponse response = service().rematch(workspaceId, 101L);

        assertThat(response.matchScore()).isEqualTo(87);
        assertThat(response.matchReason()).contains("현재 Workspace");
        assertThat(posting.getMatchScore()).isNull();
        verify(matchingService).evaluate(eq(workspaceId), eq("백엔드 개발자"), anyString());
    }

    @Test
    void createsApplicationAndMatchesWhenNotAlreadySavedInWorkspace() {
        Long workspaceId = 21L;
        JobPosting posting = posting(101L);
        when(applicationRepository.findByWorkspaceIdAndJobPostingId(workspaceId, 101L))
                .thenReturn(Optional.empty());
        when(jobPostingRepository.findById(101L)).thenReturn(Optional.of(posting));
        when(applicationRepository.save(any(WorkspaceJobApplication.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(matchingService.evaluate(eq(workspaceId), eq("백엔드 개발자"), anyString()))
                .thenReturn(new JobMatchingService.MatchResult(90, "적합합니다."));
        when(sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(101L))
                .thenReturn(List.of());
        when(positionChoiceRepository.findByJobPostingIdOrderByRankOrderAsc(101L))
                .thenReturn(List.of());
        when(sourceImageRepository.findByJobPostingIdOrderByDisplayOrderAsc(101L))
                .thenReturn(List.of());

        JobPostingResponse response = service().rematch(workspaceId, 101L);

        assertThat(response.matchScore()).isEqualTo(90);
        verify(applicationRepository).save(any(WorkspaceJobApplication.class));
    }

    @Test
    void rejectsAJobApplicationThatBelongsToAnotherWorkspaceBeforeMatching() {
        when(applicationRepository.findByWorkspaceIdAndJobPostingId(22L, 101L))
                .thenReturn(Optional.empty());
        when(jobPostingRepository.findById(101L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().rematch(22L, 101L))
                .isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(matchingService);
    }
}
