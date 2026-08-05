package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Semaphore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class JobPostingServiceTest {

    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private JobPostingSourceUrlRepository sourceUrlRepository;
    @Mock private JobApplicationUrlParseService urlParseService;
    @Mock private JobMatchingService matchingService;
    @Mock private JobPostingDedupService dedupService;

    private JobPostingService jobPostingService;

    @BeforeEach
    void setUp() {
        jobPostingService =
                new JobPostingService(
                        jobPostingRepository,
                        sourceUrlRepository,
                        urlParseService,
                        matchingService,
                        dedupService,
                        new ObjectMapper());
    }

    @Test
    void configuresPerInstanceIngestConcurrency() {
        jobPostingService.configureIngestConcurrency(5);

        Semaphore semaphore =
                (Semaphore) ReflectionTestUtils.getField(jobPostingService, "ingestSemaphore");
        assertThat(semaphore).isNotNull();
        assertThat(semaphore.availablePermits()).isEqualTo(5);
        assertThat(semaphore.isFair()).isTrue();
    }

    @Test
    void rejectsInvalidIngestConcurrency() {
        assertThatThrownBy(() -> jobPostingService.configureIngestConcurrency(0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1 이상");
    }

    private JobPosting newCandidate() {
        JobPosting candidate =
                JobPosting.collect(
                        new JobPosting.Draft(
                                "백엔드 개발자",
                                "테스트 회사",
                                "https://example.com/posting",
                                null,
                                JobPostingSource.URL_INGEST,
                                null,
                                null,
                                null,
                                LocalDate.now().plusDays(10),
                                false,
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
        when(sourceUrlRepository.existsByUrl("https://example.com/posting")).thenReturn(true);

        assertThatThrownBy(() -> jobPostingService.ingestUrl("https://example.com/posting"))
                .isInstanceOf(ResponseStatusException.class);

        verify(urlParseService, never()).parse(any());
    }

    @Test
    void ingestUrlRejectsWhenAiCannotExtractCoreFields() {
        when(sourceUrlRepository.existsByUrl(any())).thenReturn(false);
        when(urlParseService.parse(any()))
                .thenReturn(
                        new JobApplicationUrlParseResponse(
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
                                null,
                                null,
                                null,
                                "https://example.com/posting"));

        assertThatThrownBy(() -> jobPostingService.ingestUrl("https://example.com/posting"))
                .isInstanceOf(ResponseStatusException.class);

        verify(jobPostingRepository, never()).save(any());
    }

    @Test
    void ingestUrlSavesNewCandidateOnSuccess() {
        when(sourceUrlRepository.existsByUrl(any())).thenReturn(false);
        when(urlParseService.parse(any()))
                .thenReturn(
                        new JobApplicationUrlParseResponse(
                                "테스트 회사",
                                "백엔드 개발자",
                                "사람인",
                                LocalDate.now().plusDays(5),
                                false,
                                "협의",
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                "https://example.com/posting"));
        when(dedupService.findExistingMatch(any(), any())).thenReturn(Optional.empty());
        when(dedupService.createNew(any(), any(), any(), any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(matchingService.evaluate(any(), any()))
                .thenReturn(new JobMatchingService.MatchResult(80, "보유 기술과 일치도가 높습니다."));

        JobPostingResponse response = jobPostingService.ingestUrl("https://example.com/posting");

        assertThat(response.companyName()).isEqualTo("테스트 회사");
        assertThat(response.status()).isEqualTo(JobPostingStatus.NEW);
        assertThat(response.matchScore()).isEqualTo(80);
    }

    @Test
    void ingestUrlAttachesToExistingMatchInsteadOfCreatingNewRow() {
        when(sourceUrlRepository.existsByUrl(any())).thenReturn(false);
        when(urlParseService.parse(any()))
                .thenReturn(
                        new JobApplicationUrlParseResponse(
                                "테스트 회사",
                                "백엔드 개발자",
                                "잡코리아",
                                null,
                                false,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                "https://www.jobkorea.co.kr/Recruit/GI_Read/1"));
        JobPosting existing = newCandidate();
        when(dedupService.findExistingMatch("테스트 회사", "백엔드 개발자"))
                .thenReturn(Optional.of(existing));
        when(dedupService.attachAdditionalUrl(eq(1L), any(), any(), any())).thenReturn(existing);

        JobPostingResponse response =
                jobPostingService.ingestUrl("https://www.jobkorea.co.kr/Recruit/GI_Read/1");

        assertThat(response.id()).isEqualTo(1L);
        verify(dedupService, never()).createNew(any(), any(), any(), any());
        verify(jobPostingRepository, never()).save(any());
    }

    @Test
    void ingestUrlRetriesAsAttachWhenConcurrentIngestWinsTheRace() {
        when(sourceUrlRepository.existsByUrl(any())).thenReturn(false);
        when(urlParseService.parse(any()))
                .thenReturn(
                        new JobApplicationUrlParseResponse(
                                "테스트 회사",
                                "백엔드 개발자",
                                "잡코리아",
                                null,
                                false,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                "https://www.jobkorea.co.kr/Recruit/GI_Read/1"));
        when(matchingService.evaluate(any(), any()))
                .thenReturn(new JobMatchingService.MatchResult(80, "보유 기술과 일치도가 높습니다."));
        JobPosting winner = newCandidate();

        // 첫 조회 시점엔 아직 동시 요청이 커밋 전이라 매칭되는 게 없다가, createNew 시도가
        // 유니크 제약 위반으로 실패한 뒤 재조회하면 그새 커밋된 승자가 보인다.
        when(dedupService.findExistingMatch("테스트 회사", "백엔드 개발자"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(winner));
        when(dedupService.createNew(any(), any(), any(), any()))
                .thenThrow(new DataIntegrityViolationException("동시 삽입 충돌"));
        when(dedupService.attachAdditionalUrl(eq(1L), any(), any(), any())).thenReturn(winner);

        JobPostingResponse response =
                jobPostingService.ingestUrl("https://www.jobkorea.co.kr/Recruit/GI_Read/1");

        assertThat(response.id()).isEqualTo(1L);
        verify(dedupService).attachAdditionalUrl(eq(1L), any(), any(), any());
    }

    @Test
    void refreshRejectsWhenPostingHasNoUrl() {
        JobPosting candidate = newCandidate();
        ReflectionTestUtils.setField(candidate, "postingUrl", null);
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));

        assertThatThrownBy(() -> jobPostingService.refresh(1L))
                .isInstanceOf(ResponseStatusException.class);

        verify(urlParseService, never()).parse(any());
    }

    @Test
    void refreshOverwritesDeadlineAndDetailFieldsButKeepsIdentityFields() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));
        LocalDate freshDeadline = LocalDate.now().plusDays(3);
        when(urlParseService.parse("https://example.com/posting"))
                .thenReturn(
                        new JobApplicationUrlParseResponse(
                                "다른 회사로 오독된 이름",
                                "다른 직무명으로 오독됨",
                                "사람인",
                                freshDeadline,
                                false,
                                "협의",
                                "서울 종로구",
                                "정규직",
                                "새 직무 상세",
                                "새 지원자격",
                                null,
                                null,
                                null,
                                null,
                                "https://example.com/posting"));

        JobPostingResponse response = jobPostingService.refresh(1L);

        assertThat(response.deadline()).isEqualTo(freshDeadline);
        assertThat(response.alwaysOpen()).isFalse();
        assertThat(response.location()).isEqualTo("서울 종로구");
        assertThat(response.jobDescription()).isEqualTo("새 직무 상세");
        assertThat(response.requiredQualifications()).isEqualTo("새 지원자격");
        assertThat(response.companyName()).isEqualTo("테스트 회사");
        assertThat(response.positionTitle()).isEqualTo("백엔드 개발자");
    }

    @Test
    void refreshKeepsExistingDeadlineWhenFreshParseCannotDetermineIt() {
        JobPosting candidate = newCandidate();
        LocalDate originalDeadline = candidate.getDeadline();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));
        when(urlParseService.parse("https://example.com/posting"))
                .thenReturn(
                        new JobApplicationUrlParseResponse(
                                "테스트 회사",
                                "백엔드 개발자",
                                "사람인",
                                null,
                                false,
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

        JobPostingResponse response = jobPostingService.refresh(1L);

        assertThat(response.deadline()).isEqualTo(originalDeadline);
    }

    @Test
    void rematchRecalculatesScoreEvenWhenAlreadyPresent() {
        JobPosting candidate = newCandidate();
        candidate.applyMatch(40, "이전 점수", LocalDateTime.now());
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));
        when(matchingService.evaluate(any(), any()))
                .thenReturn(new JobMatchingService.MatchResult(90, "보유 기술과 일치도가 높습니다."));

        JobPostingResponse response = jobPostingService.rematch(1L);

        assertThat(response.matchScore()).isEqualTo(90);
        assertThat(response.matchReason()).isEqualTo("보유 기술과 일치도가 높습니다.");
    }

    @Test
    void rematchThrowsWhenPostingDoesNotExist() {
        when(jobPostingRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobPostingService.rematch(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void ingestUrlsStreamThrowsExceptionWhenUrlsEmpty() {
        assertThatThrownBy(() -> jobPostingService.ingestUrlsStream(List.of("  ", "")))
                .isInstanceOf(ResponseStatusException.class);
    }
}
