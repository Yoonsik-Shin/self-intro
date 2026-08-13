package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JobPostingDedupServiceTest {

    private JobPostingRepository jobPostingRepository;
    private JobPostingSourceUrlRepository sourceUrlRepository;
    private JobPostingDedupService dedupService;

    @BeforeEach
    void setUp() {
        jobPostingRepository = mock(JobPostingRepository.class);
        sourceUrlRepository = mock(JobPostingSourceUrlRepository.class);
        dedupService = new JobPostingDedupService(jobPostingRepository, sourceUrlRepository);
    }

    @Test
    @DisplayName("서로 다른 플랫폼의 타이틀 차이(사람인: AI 개발 엔지니어 vs 잡코리아: AI 개발 엔지니어(신입/Java개발))를 동일 공고로 매칭한다")
    void matchesCrossPlatformPostingsWithTitleDifferences() {
        JobPosting existing =
                JobPosting.collect(
                        new JobPosting.Draft(
                                "AI 개발 엔지니어",
                                "(주)스카이웨어",
                                "https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=54566467",
                                null,
                                JobPostingSource.URL_INGEST,
                                null,
                                null,
                                null,
                                null,
                                null,
                                false,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null),
                        LocalDateTime.now());

        when(jobPostingRepository
                        .findByOwnerWorkspaceIdIsNullAndCompanyNameNormalizedAndPositionTitleNormalized(
                                "스카이웨어", "AI 개발 엔지니어(신입/JAVA개발)"))
                .thenReturn(Optional.empty());
        when(jobPostingRepository.findByOwnerWorkspaceIdIsNullAndCompanyNameNormalized("스카이웨어"))
                .thenReturn(List.of(existing));

        Optional<JobPosting> match =
                dedupService.findExistingMatch("(주)스카이웨어", "AI 개발 엔지니어(신입/Java개발)");

        assertThat(match).isPresent();
        assertThat(match.get().getPositionTitle()).isEqualTo("AI 개발 엔지니어");
    }

    @Test
    @DisplayName("추적 파라미터가 포함된 동일 사람인 URL을 정규화하여 중복 저장을 막는다")
    void normalizesUrlBeforeCheckingExistenceInAttachAdditionalUrl() {
        Long postingId = 1L;
        JobPosting posting = mock(JobPosting.class);
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(postingId))
                .thenReturn(Optional.of(posting));

        String mailUrl =
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54566467&utm_source=person_clone_scrap_close&utm_medium=mail#seq=0";
        String expectedCanonical = "https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=54566467";

        when(sourceUrlRepository.existsByScopeKeyAndUrl(
                        JobPosting.PLATFORM_SCOPE, expectedCanonical))
                .thenReturn(true);

        dedupService.attachAdditionalUrl(
                postingId, mailUrl, JobPostingPlatform.SARAMIN, LocalDateTime.now());

        verify(sourceUrlRepository)
                .existsByScopeKeyAndUrl(JobPosting.PLATFORM_SCOPE, expectedCanonical);
    }
}
