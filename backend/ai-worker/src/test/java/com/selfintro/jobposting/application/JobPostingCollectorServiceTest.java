package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.JobPostingCollectorService.JobPostingCollectionResult;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSettingRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class JobPostingCollectorServiceTest {

    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private JobPostingSettingRepository settingRepository;
    @Mock private SaraminJobPostingClient saraminJobPostingClient;
    @Mock private JobPostingDedupService dedupService;

    private JobPostingCollectorService newService() {
        return new JobPostingCollectorService(
                jobPostingRepository, settingRepository, saraminJobPostingClient, dedupService);
    }

    private JobPostingSetting settingWithSaraminEnabled(boolean saraminEnabled) {
        JobPostingSetting setting = JobPostingSetting.defaults(LocalDateTime.now());
        setting.update(
                saraminEnabled,
                null,
                20,
                "pd",
                null,
                null,
                null,
                false,
                2,
                "0 0 8 * * *",
                LocalDateTime.now());
        return setting;
    }

    private JobPosting overdueCandidate() {
        return JobPosting.collect(
                new JobPosting.Draft(
                        "백엔드 개발자",
                        "테스트 회사",
                        "https://example.com/posting",
                        null,
                        JobPostingSource.URL_INGEST,
                        null,
                        null,
                        null,
                        LocalDate.now().minusDays(1),
                        false,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null),
                LocalDateTime.now());
    }

    private JobPosting.Draft saraminDraft(String externalId) {
        return new JobPosting.Draft(
                "백엔드 개발자",
                "사람인 테스트 회사",
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=" + externalId,
                externalId,
                JobPostingSource.SARAMIN,
                "Java, Spring",
                "서울",
                null,
                LocalDate.now().plusDays(30),
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    @Test
    void collectNowSkipsDisabledSourcesAndExpiresOverdueCandidates() {
        JobPostingCollectorService service = newService();
        when(settingRepository.getOrCreateDefault()).thenReturn(settingWithSaraminEnabled(false));
        when(jobPostingRepository.findByOwnerWorkspaceIdIsNullAndStatusInAndDeadlineBefore(
                        any(), any()))
                .thenReturn(List.of(overdueCandidate()));

        JobPostingCollectionResult result = service.collectNow();

        assertThat(result.saraminEnabled()).isFalse();
        assertThat(result.saraminCollected()).isZero();
        assertThat(result.expiredCount()).isEqualTo(1);
        verify(saraminJobPostingClient, never()).fetchPostings();
    }

    @Test
    void collectNowSavesNewSaraminPostingsAndSkipsDuplicates() {
        JobPostingCollectorService service = newService();
        when(settingRepository.getOrCreateDefault()).thenReturn(settingWithSaraminEnabled(true));
        when(jobPostingRepository.findByOwnerWorkspaceIdIsNullAndStatusInAndDeadlineBefore(
                        any(), any()))
                .thenReturn(List.of());
        when(saraminJobPostingClient.fetchPostings())
                .thenReturn(List.of(saraminDraft("1"), saraminDraft("2")));
        when(jobPostingRepository.existsByOwnerWorkspaceIdIsNullAndCollectionMethodAndExternalId(
                        JobPostingSource.SARAMIN, "1"))
                .thenReturn(true);
        when(jobPostingRepository.existsByOwnerWorkspaceIdIsNullAndCollectionMethodAndExternalId(
                        JobPostingSource.SARAMIN, "2"))
                .thenReturn(false);
        when(dedupService.findExistingMatch(any(), any())).thenReturn(Optional.empty());
        when(dedupService.createNew(any(), any(), any(), any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        JobPostingCollectionResult result = service.collectNow();

        assertThat(result.saraminCollected()).isEqualTo(1);
        verify(dedupService, times(1)).createNew(any(), any(), any(), any());
    }

    @Test
    void collectNowAttachesSaraminUrlToExistingMatchInsteadOfCreatingNewRow() {
        JobPostingCollectorService service = newService();
        when(settingRepository.getOrCreateDefault()).thenReturn(settingWithSaraminEnabled(true));
        when(jobPostingRepository.findByOwnerWorkspaceIdIsNullAndStatusInAndDeadlineBefore(
                        any(), any()))
                .thenReturn(List.of());
        when(saraminJobPostingClient.fetchPostings()).thenReturn(List.of(saraminDraft("1")));
        when(jobPostingRepository.existsByOwnerWorkspaceIdIsNullAndCollectionMethodAndExternalId(
                        JobPostingSource.SARAMIN, "1"))
                .thenReturn(false);
        JobPosting existing = overdueCandidate();
        ReflectionTestUtils.setField(existing, "id", 42L);
        when(dedupService.findExistingMatch("사람인 테스트 회사", "백엔드 개발자"))
                .thenReturn(Optional.of(existing));

        JobPostingCollectionResult result = service.collectNow();

        assertThat(result.saraminCollected()).isZero();
        verify(dedupService).attachAdditionalUrl(eq(42L), any(), any(), any());
        verify(dedupService, never()).createNew(any(), any(), any(), any());
    }

    @Test
    void expireOverdueCandidatesMarksThemExpired() {
        JobPostingCollectorService service = newService();
        JobPosting candidate = overdueCandidate();
        when(jobPostingRepository.findByOwnerWorkspaceIdIsNullAndStatusInAndDeadlineBefore(
                        any(), any()))
                .thenReturn(List.of(candidate));

        int expiredCount = service.expireOverdueCandidates();

        assertThat(expiredCount).isEqualTo(1);
        assertThat(candidate.getStatus()).isEqualTo(JobPostingStatus.EXPIRED);
    }
}
