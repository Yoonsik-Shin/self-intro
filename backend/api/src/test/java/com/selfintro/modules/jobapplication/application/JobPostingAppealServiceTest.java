package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingResponse;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobPostingAppealServiceTest {

    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private JobPostingSourceUrlRepository sourceUrlRepository;
    @Mock private CareerAppealAnalyzer careerAppealAnalyzer;
    @Mock private JobMatchingService jobMatchingService;

    @Test
    void analyzeAppealFillsMatchScoreIfNull() {
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

        assertThat(posting.getMatchScore()).isNull();

        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(posting));
        when(careerAppealAnalyzer.analyze(
                        nullable(String.class),
                        nullable(String.class),
                        nullable(String.class),
                        nullable(String.class),
                        nullable(String.class)))
                .thenReturn("어필 포인트 분석 내용");
        when(jobMatchingService.evaluate(nullable(String.class), nullable(String.class)))
                .thenReturn(new JobMatchingService.MatchResult(75, "75점 매칭 근거"));

        JobPostingAppealService service =
                new JobPostingAppealService(
                        jobPostingRepository,
                        sourceUrlRepository,
                        careerAppealAnalyzer,
                        jobMatchingService);

        JobPostingResponse response = service.analyzeAppeal(1L);

        assertThat(response.appealAnalysis()).isEqualTo("어필 포인트 분석 내용");
        assertThat(response.matchScore()).isEqualTo(75);
        assertThat(response.matchReason()).isEqualTo("75점 매칭 근거");
        verify(jobMatchingService).evaluate(nullable(String.class), nullable(String.class));
    }
}
