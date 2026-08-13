package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class JobPostingAppealServiceTest {

    @Mock private WorkspaceJobApplicationRepository applicationRepository;
    @Mock private JobPostingSourceUrlRepository sourceUrlRepository;
    @Mock private JobPostingPositionChoiceRepository positionChoiceRepository;
    @Mock private JobPostingSourceImageRepository sourceImageRepository;
    @Mock private CareerAppealAnalyzer careerAppealAnalyzer;

    @Test
    void analyzeAppealStoresResultOnlyOnRequestedWorkspaceApplication() {
        JobPosting posting =
                JobPosting.collect(
                        new JobPosting.Draft(
                                "백엔드 개발자",
                                "(주)테스트",
                                "https://example.com",
                                null,
                                JobPostingSource.URL_INGEST,
                                null,
                                "서울",
                                "정규직",
                                null,
                                false,
                                null,
                                "백엔드 개발 업무",
                                "Java 경험",
                                null,
                                null,
                                null,
                                null),
                        LocalDateTime.now());
        ReflectionTestUtils.setField(posting, "id", 1L);
        WorkspaceJobApplication application =
                WorkspaceJobApplication.create(
                        7L, posting, JobPostingStatus.SAVED, null, null, null, LocalDateTime.now());

        when(applicationRepository.findByWorkspaceIdAndJobPostingId(7L, 1L))
                .thenReturn(Optional.of(application));
        when(careerAppealAnalyzer.analyze(
                        eq(7L),
                        nullable(String.class),
                        nullable(String.class),
                        nullable(String.class),
                        nullable(String.class),
                        nullable(String.class),
                        nullable(String.class),
                        nullable(String.class)))
                .thenReturn("어필 포인트 분석 내용");

        JobPostingAppealService service =
                new JobPostingAppealService(
                        applicationRepository,
                        sourceUrlRepository,
                        positionChoiceRepository,
                        sourceImageRepository,
                        careerAppealAnalyzer);

        JobPostingResponse response = service.analyzeAppeal(7L, 1L, null, null);

        assertThat(response.appealAnalysis()).isEqualTo("어필 포인트 분석 내용");
        assertThat(application.getAppealAnalysis()).isEqualTo("어필 포인트 분석 내용");
        assertThat(posting.getAppealAnalysis()).isNull();
    }

    @Test
    void rejectsAnotherWorkspaceApplicationBeforeCallingAi() {
        when(applicationRepository.findByWorkspaceIdAndJobPostingId(8L, 1L))
                .thenReturn(Optional.empty());
        JobPostingAppealService service =
                new JobPostingAppealService(
                        applicationRepository,
                        sourceUrlRepository,
                        positionChoiceRepository,
                        sourceImageRepository,
                        careerAppealAnalyzer);

        assertThatThrownBy(() -> service.analyzeAppeal(8L, 1L, null, null))
                .isInstanceOf(EntityNotFoundException.class);

        verifyNoInteractions(careerAppealAnalyzer);
    }
}
