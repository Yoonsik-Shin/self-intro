package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingPermissionReviewEvent;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingStatusEvent;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPermissionReviewEventRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingStatusEventRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingPermissionReviewRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingSettingRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingSettingResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingStatusEventResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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
class JobPostingCrudServiceTest {

    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private JobPostingSourceUrlRepository sourceUrlRepository;
    @Mock private JobPostingPositionChoiceRepository positionChoiceRepository;
    @Mock private JobPostingSourceImageRepository sourceImageRepository;
    @Mock private JobPostingStatusEventRepository statusEventRepository;
    @Mock private JobPostingSettingRepository settingRepository;
    @Mock private JobPostingPermissionReviewEventRepository permissionReviewEventRepository;

    private JobPostingCrudService jobPostingService;

    @BeforeEach
    void setUp() {
        jobPostingService =
                new JobPostingCrudService(
                        jobPostingRepository,
                        sourceUrlRepository,
                        positionChoiceRepository,
                        sourceImageRepository,
                        statusEventRepository,
                        settingRepository,
                        permissionReviewEventRepository);
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
    void updateOverwritesEditableFieldsWithoutTouchingStatus() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(candidate));
        JobPostingRequest request =
                new JobPostingRequest(
                        "수정된 회사",
                        "수정된 직무명",
                        "https://example.com/posting",
                        "URL 수집",
                        null,
                        LocalDate.now().plusDays(20),
                        null,
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
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(candidate));

        JobPostingResponse response = jobPostingService.updateMemo(1L, "새로운 상세 메모 작성");

        assertThat(response.memo()).isEqualTo("새로운 상세 메모 작성");
    }

    @Test
    void saveMovesNewCandidateToSavedStatus() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(candidate));

        jobPostingService.save(1L);

        assertThat(candidate.getStatus()).isEqualTo(JobPostingStatus.SAVED);
    }

    @Test
    void unsaveMovesSavedCandidateBackToNewStatus() {
        JobPosting candidate = newCandidate();
        candidate.save(LocalDateTime.now());
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(candidate));

        jobPostingService.unsave(1L);

        assertThat(candidate.getStatus()).isEqualTo(JobPostingStatus.NEW);
    }

    @Test
    void applyTransitionsCandidateToAppliedStatusInPlace() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(candidate));

        JobPostingResponse response = jobPostingService.apply(1L);

        assertThat(response.status()).isEqualTo(JobPostingStatus.APPLIED);
        assertThat(response.appliedAt()).isEqualTo(LocalDate.now());
        verify(statusEventRepository).save(any(JobPostingStatusEvent.class));
    }

    @Test
    void unapplyRevertsAppliedPostingBackToNewStatusAndClearsAppliedAt() {
        JobPosting posting = newCandidate();
        posting.apply(LocalDate.now(), LocalDateTime.now());
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(posting));

        JobPostingResponse response = jobPostingService.unapply(1L);

        assertThat(response.status()).isEqualTo(JobPostingStatus.NEW);
        assertThat(response.appliedAt()).isNull();
        verify(statusEventRepository).save(any(JobPostingStatusEvent.class));
    }

    @Test
    void undismissMovesDismissedCandidateBackToNewStatus() {
        JobPosting candidate = newCandidate();
        candidate.dismiss(LocalDateTime.now());
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(candidate));

        jobPostingService.undismiss(1L);

        assertThat(candidate.getStatus()).isEqualTo(JobPostingStatus.NEW);
    }

    @Test
    void dismissThrowsWhenPostingDoesNotExist() {
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobPostingService.dismiss(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void deleteRemovesPosting() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(candidate));

        jobPostingService.delete(1L);

        verify(jobPostingRepository).delete(candidate);
    }

    @Test
    void reviewSharingPermissionStoresImmutableReviewSnapshot() {
        JobPosting candidate = newCandidate();
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(candidate));
        JobPostingPermissionReviewRequest request =
                new JobPostingPermissionReviewRequest(
                        JobPostingPermissionReviewStatus.APPROVED,
                        JobPostingPermissionBasis.WRITTEN_LICENSE,
                        "object://permission-evidence/job-1/license.pdf",
                        "테스트 회사 채용 담당자",
                        "채용 공고 재사용 허가 권한 확인",
                        "비공개 베타 회원 대상 저장·검색·원본 링크 재노출",
                        "license-2026-08",
                        "legal@example.com",
                        LocalDateTime.now().plusMonths(6));

        JobPostingResponse response =
                jobPostingService.reviewSharingPermission(1L, 42L, request);

        assertThat(response.permissionReviewStatus())
                .isEqualTo(JobPostingPermissionReviewStatus.APPROVED);
        assertThat(response.permissionBasis()).isEqualTo(JobPostingPermissionBasis.WRITTEN_LICENSE);
        ArgumentCaptor<JobPostingPermissionReviewEvent> eventCaptor =
                ArgumentCaptor.forClass(JobPostingPermissionReviewEvent.class);
        verify(permissionReviewEventRepository).save(eventCaptor.capture());
        JobPostingPermissionReviewEvent event = eventCaptor.getValue();
        assertThat(event.getJobPostingId()).isEqualTo(1L);
        assertThat(event.getReviewStatus()).isEqualTo(JobPostingPermissionReviewStatus.APPROVED);
        assertThat(event.getPermissionBasis()).isEqualTo(JobPostingPermissionBasis.WRITTEN_LICENSE);
        assertThat(event.getReviewedByUserId()).isEqualTo(42L);
        assertThat(event.getEvidenceReference())
                .isEqualTo("object://permission-evidence/job-1/license.pdf");
    }

    @Test
    void permissionReviewRejectsWorkspaceOwnedPosting() {
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(99L))
                .thenReturn(Optional.empty());
        JobPostingPermissionReviewRequest request =
                new JobPostingPermissionReviewRequest(
                        JobPostingPermissionReviewStatus.REJECTED,
                        JobPostingPermissionBasis.UNKNOWN,
                        null,
                        null,
                        null,
                        "재노출 권한 근거 없음",
                        null,
                        null,
                        null);

        assertThatThrownBy(() -> jobPostingService.reviewSharingPermission(99L, 42L, request))
                .isInstanceOf(EntityNotFoundException.class);
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
                        null,
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
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(application));

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
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobPostingService.changeStatus(99L, JobPostingStatus.OFFER, null))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void statusEventsReturnsHistoryOrderedByChangedAt() {
        JobPosting application = newApplication();
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(application));
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
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(1L))
                .thenReturn(Optional.of(application));

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
                        "0 0 9 * * *",
                        null,
                        null,
                        null);

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
                        true,
                        "Java Spring",
                        30,
                        "rc",
                        "101000",
                        "84",
                        "10",
                        true,
                        3,
                        "not a cron",
                        null,
                        null,
                        null);

        assertThatThrownBy(() -> jobPostingService.updateSettings(request))
                .isInstanceOf(ResponseStatusException.class);
    }
}
