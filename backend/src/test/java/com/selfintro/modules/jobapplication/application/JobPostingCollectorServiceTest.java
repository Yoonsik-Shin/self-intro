package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobapplication.application.JobPostingCollectorService.JobPostingCollectionResult;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingCandidateRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobPostingCollectorServiceTest {

    @Mock private JobPostingCandidateRepository candidateRepository;
    @Mock private SaraminJobPostingClient saraminJobPostingClient;
    @Mock private JobMatchingService matchingService;

    private JobPostingCandidate overdueCandidate() {
        return JobPostingCandidate.create(
                new JobPostingCandidate.Draft(
                        null,
                        "백엔드 개발자",
                        "테스트 회사",
                        "https://example.com/posting",
                        JobPostingSource.URL_INGEST,
                        null,
                        null,
                        null,
                        LocalDate.now().minusDays(1),
                        null),
                LocalDateTime.now());
    }

    private JobPostingCandidate.Draft saraminDraft(String externalId) {
        return new JobPostingCandidate.Draft(
                externalId,
                "백엔드 개발자",
                "사람인 테스트 회사",
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=" + externalId,
                JobPostingSource.SARAMIN,
                "Java, Spring",
                "서울",
                null,
                LocalDate.now().plusDays(30),
                null);
    }

    @Test
    void collectNowSkipsDisabledSourcesAndExpiresOverdueCandidates() {
        JobPostingCollectorService service =
                new JobPostingCollectorService(
                        candidateRepository,
                        saraminJobPostingClient,
                        matchingService,
                        false,
                        false);
        when(candidateRepository.findByStatusInAndDeadlineBefore(any(), any()))
                .thenReturn(List.of(overdueCandidate()));

        JobPostingCollectionResult result = service.collectNow();

        assertThat(result.saraminEnabled()).isFalse();
        assertThat(result.saraminCollected()).isZero();
        assertThat(result.expiredCount()).isEqualTo(1);
        verify(saraminJobPostingClient, never()).fetchPostings();
    }

    @Test
    void collectNowSavesNewSaraminPostingsAndSkipsDuplicates() {
        JobPostingCollectorService service =
                new JobPostingCollectorService(
                        candidateRepository, saraminJobPostingClient, matchingService, true, false);
        when(candidateRepository.findByStatusInAndDeadlineBefore(any(), any()))
                .thenReturn(List.of());
        when(saraminJobPostingClient.fetchPostings())
                .thenReturn(List.of(saraminDraft("1"), saraminDraft("2")));
        when(candidateRepository.existsBySourceAndExternalId(JobPostingSource.SARAMIN, "1"))
                .thenReturn(true);
        when(candidateRepository.existsBySourceAndExternalId(JobPostingSource.SARAMIN, "2"))
                .thenReturn(false);
        when(matchingService.evaluate(any(), any()))
                .thenReturn(JobMatchingService.MatchResult.empty());

        JobPostingCollectionResult result = service.collectNow();

        assertThat(result.saraminCollected()).isEqualTo(1);
        verify(candidateRepository, times(1)).save(any());
    }

    @Test
    void expireOverdueCandidatesMarksThemExpired() {
        JobPostingCollectorService service =
                new JobPostingCollectorService(
                        candidateRepository,
                        saraminJobPostingClient,
                        matchingService,
                        false,
                        false);
        JobPostingCandidate candidate = overdueCandidate();
        when(candidateRepository.findByStatusInAndDeadlineBefore(any(), any()))
                .thenReturn(List.of(candidate));

        int expiredCount = service.expireOverdueCandidates();

        assertThat(expiredCount).isEqualTo(1);
        assertThat(candidate.getStatus())
                .isEqualTo(
                        com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus
                                .EXPIRED);
    }
}
