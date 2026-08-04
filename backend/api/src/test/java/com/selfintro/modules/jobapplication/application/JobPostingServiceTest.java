package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingStatusEvent;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingStatusEventRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingStatusEventResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Semaphore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class JobPostingServiceTest {

    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private JobPostingSourceUrlRepository sourceUrlRepository;
    @Mock private JobPostingStatusEventRepository statusEventRepository;
    @Mock private JobPostingSettingRepository settingRepository;
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
                        statusEventRepository,
                        settingRepository,
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

    private JobPosting newApplication() {
        JobPosting application =
                JobPosting.registerApplied(
                        "테스트 회사",
                        "백엔드 개발자",
                        "https://example.com/posting",
                        "사람인",
                        LocalDate.of(2026, 7, 1),
                        LocalDate.of(2026, 7, 31),
                        false,
                        "협의 후 결정",
                        null,
                        null,
                        "메모",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 7, 1).atStartOfDay());
        ReflectionTestUtils.setField(application, "id", 1L);
        return application;
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
    void updateOverwritesEditableFieldsWithoutTouchingStatus() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));
        JobPostingRequest request =
                new JobPostingRequest(
                        "수정된 회사",
                        "수정된 직무명",
                        "https://example.com/posting",
                        "URL 수집",
                        null,
                        LocalDate.now().plusDays(20),
                        false,
                        "연봉 4000만원",
                        "서울 종로구",
                        "정규직",
                        null,
                        "직무 상세",
                        "지원자격",
                        "우대사항",
                        "전형절차",
                        "지원방법",
                        "처우조건");

        JobPostingResponse response = jobPostingService.update(1L, request);

        assertThat(response.positionTitle()).isEqualTo("수정된 직무명");
        assertThat(response.companyName()).isEqualTo("수정된 회사");
        assertThat(response.location()).isEqualTo("서울 종로구");
        assertThat(response.employmentType()).isEqualTo("정규직");
        assertThat(response.requiredQualifications()).isEqualTo("지원자격");
        assertThat(response.status()).isEqualTo(JobPostingStatus.NEW);
    }

    @Test
    void updateMemoUpdatesMemoSuccessfully() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));

        JobPostingResponse response = jobPostingService.updateMemo(1L, "새로운 상세 메모 작성");

        assertThat(response.memo()).isEqualTo("새로운 상세 메모 작성");
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
    void saveMovesNewCandidateToSavedStatus() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));

        jobPostingService.save(1L);

        assertThat(candidate.getStatus()).isEqualTo(JobPostingStatus.SAVED);
    }

    @Test
    void unsaveMovesSavedCandidateBackToNewStatus() {
        JobPosting candidate = newCandidate();
        candidate.save(LocalDateTime.now());
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));

        jobPostingService.unsave(1L);

        assertThat(candidate.getStatus()).isEqualTo(JobPostingStatus.NEW);
    }

    @Test
    void applyTransitionsCandidateToAppliedStatusInPlace() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));

        JobPostingResponse response = jobPostingService.apply(1L);

        assertThat(response.status()).isEqualTo(JobPostingStatus.APPLIED);
        assertThat(response.appliedAt()).isEqualTo(LocalDate.now());
        verify(statusEventRepository).save(any(JobPostingStatusEvent.class));
    }

    @Test
    void unapplyRevertsAppliedPostingBackToNewStatusAndClearsAppliedAt() {
        JobPosting posting = newCandidate();
        posting.apply(LocalDate.now(), LocalDateTime.now());
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(posting));

        JobPostingResponse response = jobPostingService.unapply(1L);

        assertThat(response.status()).isEqualTo(JobPostingStatus.NEW);
        assertThat(response.appliedAt()).isNull();
        verify(statusEventRepository).save(any(JobPostingStatusEvent.class));
    }

    @Test
    void undismissMovesDismissedCandidateBackToNewStatus() {
        JobPosting candidate = newCandidate();
        candidate.dismiss(LocalDateTime.now());
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));

        jobPostingService.undismiss(1L);

        assertThat(candidate.getStatus()).isEqualTo(JobPostingStatus.NEW);
    }

    @Test
    void dismissThrowsWhenPostingDoesNotExist() {
        when(jobPostingRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobPostingService.dismiss(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void deleteRemovesPosting() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(candidate));

        jobPostingService.delete(1L);

        verify(jobPostingRepository).delete(candidate);
    }

    @Test
    void createPersistsApplicationAndRecordsAppliedStatusEvent() {
        when(jobPostingRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            JobPosting argument = invocation.getArgument(0);
                            ReflectionTestUtils.setField(argument, "id", 1L);
                            return argument;
                        });

        JobPostingRequest request =
                new JobPostingRequest(
                        "테스트 회사",
                        "백엔드 개발자",
                        "https://example.com/posting",
                        "사람인",
                        LocalDate.of(2026, 7, 1),
                        LocalDate.of(2026, 7, 31),
                        false,
                        "협의 후 결정",
                        null,
                        null,
                        "메모",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null);

        JobPostingResponse response = jobPostingService.create(request);

        assertThat(response.companyName()).isEqualTo("테스트 회사");
        assertThat(response.status()).isEqualTo(JobPostingStatus.APPLIED);

        ArgumentCaptor<JobPostingStatusEvent> eventCaptor =
                ArgumentCaptor.forClass(JobPostingStatusEvent.class);
        verify(statusEventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getStatus()).isEqualTo(JobPostingStatus.APPLIED);
        assertThat(eventCaptor.getValue().getJobPostingId()).isEqualTo(1L);
    }

    @Test
    void changeStatusUpdatesStatusAndAppendsHistoryEvent() {
        JobPosting application = newApplication();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(application));

        JobPostingResponse response =
                jobPostingService.changeStatus(1L, JobPostingStatus.CODING_TEST, "서류 통과");

        assertThat(response.status()).isEqualTo(JobPostingStatus.CODING_TEST);

        ArgumentCaptor<JobPostingStatusEvent> eventCaptor =
                ArgumentCaptor.forClass(JobPostingStatusEvent.class);
        verify(statusEventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getStatus()).isEqualTo(JobPostingStatus.CODING_TEST);
        assertThat(eventCaptor.getValue().getMemo()).isEqualTo("서류 통과");
    }

    @Test
    void changeStatusThrowsWhenPostingDoesNotExist() {
        when(jobPostingRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobPostingService.changeStatus(99L, JobPostingStatus.OFFER, null))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void statusEventsReturnsHistoryOrderedByChangedAt() {
        JobPosting application = newApplication();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(application));
        JobPostingStatusEvent appliedEvent =
                JobPostingStatusEvent.of(
                        1L,
                        JobPostingStatus.APPLIED,
                        "지원 등록",
                        LocalDate.of(2026, 7, 1).atStartOfDay());
        when(statusEventRepository.findByJobPostingIdOrderByChangedAtAsc(1L))
                .thenReturn(List.of(appliedEvent));

        List<JobPostingStatusEventResponse> events = jobPostingService.statusEvents(1L);

        assertThat(events).hasSize(1);
        assertThat(events.get(0).status()).isEqualTo(JobPostingStatus.APPLIED);
    }

    @Test
    void deleteStatusEventDeletesEventAndUpdatesPostingStatusToLatestRemaining() {
        JobPosting application = newApplication();
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(application));

        JobPostingStatusEvent event1 =
                JobPostingStatusEvent.of(
                        1L,
                        JobPostingStatus.APPLIED,
                        "지원 등록",
                        LocalDate.of(2026, 7, 1).atStartOfDay());
        JobPostingStatusEvent event2 =
                JobPostingStatusEvent.of(
                        1L,
                        JobPostingStatus.WITHDRAWN,
                        "실수 포기",
                        LocalDate.of(2026, 7, 2).atStartOfDay());
        JobPostingStatusEvent event3 =
                JobPostingStatusEvent.of(
                        1L,
                        JobPostingStatus.REJECTED,
                        "불합격",
                        LocalDate.of(2026, 7, 3).atStartOfDay());

        when(statusEventRepository.findById(200L)).thenReturn(Optional.of(event2));
        when(statusEventRepository.findByJobPostingIdOrderByChangedAtAsc(1L))
                .thenReturn(List.of(event1, event3));

        JobPostingResponse response = jobPostingService.deleteStatusEvent(1L, 200L);

        verify(statusEventRepository).delete(event2);
        assertThat(response.status()).isEqualTo(JobPostingStatus.REJECTED);
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

    @Test
    void ingestUrlsStreamThrowsExceptionWhenUrlsEmpty() {
        assertThatThrownBy(() -> jobPostingService.ingestUrlsStream(List.of("  ", "")))
                .isInstanceOf(ResponseStatusException.class);
    }
}
