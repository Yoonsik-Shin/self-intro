package com.selfintro.modules.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationStatusEventRepository;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobApplicationRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspacePrivateJobPostingRequest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class WorkspaceJobApplicationPermissionTest {

    private JobPostingRepository jobPostingRepository;
    private WorkspaceJobApplicationRepository workspaceJobApplicationRepository;
    private JobPostingSourceUrlRepository sourceUrlRepository;
    private WorkspaceJobApplicationService service;

    @BeforeEach
    void setUp() {
        jobPostingRepository = mock(JobPostingRepository.class);
        workspaceJobApplicationRepository = mock(WorkspaceJobApplicationRepository.class);
        sourceUrlRepository = mock(JobPostingSourceUrlRepository.class);
        service =
                new WorkspaceJobApplicationService(
                        jobPostingRepository,
                        workspaceJobApplicationRepository,
                        mock(WorkspaceJobApplicationStatusEventRepository.class),
                        sourceUrlRepository,
                        mock(JobPostingPositionChoiceRepository.class),
                        mock(JobPostingSourceImageRepository.class));
        when(workspaceJobApplicationRepository.findAllByWorkspaceIdOrderByUpdatedAtDesc(7L))
                .thenReturn(List.of());
    }

    @Test
    void catalogHidesPostingWithoutRedistributionEvidence() {
        when(jobPostingRepository.findAllByOwnerWorkspaceIdIsNull()).thenReturn(List.of(posting()));

        assertThat(service.catalog(7L, null)).isEmpty();
    }

    @Test
    void catalogReturnsOnlyPostingWithCurrentApprovedEvidence() {
        JobPosting approved = posting();
        LocalDateTime now = LocalDateTime.now();
        approved.reviewSharingPermission(
                JobPostingPermissionReviewStatus.APPROVED,
                JobPostingPermissionBasis.EMPLOYER_DIRECT_SUBMISSION,
                "submission:employer-1",
                "테스트 회사",
                "채용 담당 부서",
                "회원 대상 저장·검색·재노출 허용",
                null,
                "legal@example.com",
                now.plusDays(30),
                1L,
                now);
        when(jobPostingRepository.findAllByOwnerWorkspaceIdIsNull())
                .thenReturn(List.of(posting(), approved));

        assertThat(service.catalog(7L, "테스트"))
                .singleElement()
                .satisfies(result -> assertThat(result.companyName()).isEqualTo("테스트 회사"));
    }

    @Test
    void workspaceCannotSavePostingThatIsStillQuarantined() {
        JobPosting posting = posting();
        when(jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(10L))
                .thenReturn(Optional.of(posting));
        when(workspaceJobApplicationRepository.existsByWorkspaceIdAndJobPostingId(7L, 10L))
                .thenReturn(false);

        assertThatThrownBy(
                        () ->
                                service.save(
                                        7L,
                                        10L,
                                        new WorkspaceJobApplicationRequest(
                                                JobPostingStatus.SAVED, null, null, 3, null, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("재노출 권한");
    }

    @Test
    void privateSourceIsAssignedToCurrentWorkspaceAndNeverNeedsCatalogApproval() {
        when(jobPostingRepository.findByScopeKeyAndPostingUrl(
                        "WORKSPACE:7", "https://example.com/private/1"))
                .thenReturn(Optional.empty());
        when(jobPostingRepository.save(org.mockito.ArgumentMatchers.any(JobPosting.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(workspaceJobApplicationRepository.save(
                        org.mockito.ArgumentMatchers.any(
                                com.selfintro.modules.jobposting.domain.entity
                                        .WorkspaceJobApplication.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.createPrivateSource(7L, privateRequest("https://example.com/private/1"));

        ArgumentCaptor<JobPosting> postingCaptor = ArgumentCaptor.forClass(JobPosting.class);
        verify(jobPostingRepository).save(postingCaptor.capture());
        assertThat(postingCaptor.getValue().getOwnerWorkspaceId()).isEqualTo(7L);
        assertThat(postingCaptor.getValue().getScopeKey()).isEqualTo("WORKSPACE:7");
        assertThat(postingCaptor.getValue().isSharedCatalogEligible(LocalDateTime.now())).isFalse();
    }

    @Test
    void manualUrlAndScreenshotImportsConvergeToWorkspacePrivateSources() {
        when(jobPostingRepository.findByScopeKeyAndPostingUrl(
                        org.mockito.ArgumentMatchers.eq("WORKSPACE:7"),
                        org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(Optional.empty());
        when(jobPostingRepository.save(org.mockito.ArgumentMatchers.any(JobPosting.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(workspaceJobApplicationRepository.save(
                        org.mockito.ArgumentMatchers.any(
                                com.selfintro.modules.jobposting.domain.entity
                                        .WorkspaceJobApplication.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.createPrivateSource(7L, privateRequest(null, JobPostingSource.MANUAL));
        service.createPrivateSource(
                7L,
                privateRequest(
                        "https://example.com/private/url-import", JobPostingSource.URL_INGEST));
        service.createPrivateSource(
                7L,
                privateRequest(
                        "https://example.com/private/screenshot-import",
                        JobPostingSource.IMAGE_INGEST));

        ArgumentCaptor<JobPosting> postingCaptor = ArgumentCaptor.forClass(JobPosting.class);
        verify(jobPostingRepository, org.mockito.Mockito.times(3)).save(postingCaptor.capture());
        assertThat(postingCaptor.getAllValues())
                .extracting(JobPosting::getOwnerWorkspaceId)
                .containsOnly(7L);
        assertThat(postingCaptor.getAllValues())
                .extracting(JobPosting::getCollectionMethod)
                .containsExactly(
                        JobPostingSource.MANUAL,
                        JobPostingSource.URL_INGEST,
                        JobPostingSource.IMAGE_INGEST);

        ArgumentCaptor<JobPostingSourceUrl> sourceUrlCaptor =
                ArgumentCaptor.forClass(JobPostingSourceUrl.class);
        verify(sourceUrlRepository, org.mockito.Mockito.times(2)).save(sourceUrlCaptor.capture());
        assertThat(sourceUrlCaptor.getAllValues())
                .extracting(JobPostingSourceUrl::getScopeKey)
                .containsOnly("WORKSPACE:7");
    }

    @Test
    void manualImportDoesNotCreateSyntheticSourceUrl() {
        when(jobPostingRepository.save(org.mockito.ArgumentMatchers.any(JobPosting.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(workspaceJobApplicationRepository.save(
                        org.mockito.ArgumentMatchers.any(
                                com.selfintro.modules.jobposting.domain.entity
                                        .WorkspaceJobApplication.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.createPrivateSource(7L, privateRequest(null, JobPostingSource.MANUAL));

        verify(sourceUrlRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void removedPrivateSourceCanBeReconnectedWithoutCreatingAnotherCatalogRow() {
        JobPosting privatePosting = posting();
        privatePosting.assignToWorkspace(7L);
        when(jobPostingRepository.findByScopeKeyAndPostingUrl(
                        "WORKSPACE:7", "https://example.com/jobs/1"))
                .thenReturn(Optional.of(privatePosting));
        when(workspaceJobApplicationRepository.existsByWorkspaceIdAndJobPostingId(7L, null))
                .thenReturn(false);
        when(workspaceJobApplicationRepository.save(
                        org.mockito.ArgumentMatchers.any(
                                com.selfintro.modules.jobposting.domain.entity
                                        .WorkspaceJobApplication.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.createPrivateSource(7L, privateRequest("https://example.com/jobs/1"));

        assertThat(privatePosting.getOwnerWorkspaceId()).isEqualTo(7L);
        assertThat(privatePosting.getScopeKey()).isEqualTo("WORKSPACE:7");
        org.mockito.Mockito.verify(jobPostingRepository, org.mockito.Mockito.never())
                .save(org.mockito.ArgumentMatchers.any(JobPosting.class));
    }

    private WorkspacePrivateJobPostingRequest privateRequest(String url) {
        return privateRequest(url, null);
    }

    private WorkspacePrivateJobPostingRequest privateRequest(String url, JobPostingSource source) {
        return new WorkspacePrivateJobPostingRequest(
                "테스트 회사",
                "백엔드 개발자",
                source,
                url,
                LocalDate.now().plusDays(7),
                null,
                false,
                null,
                "서울",
                "정규직",
                "Java",
                "API 개발",
                "경력 무관",
                "Spring 우대",
                null,
                null,
                null,
                JobPostingStatus.SAVED,
                null,
                "검토 메모",
                3,
                null,
                null);
    }

    private JobPosting posting() {
        return JobPosting.collect(
                new JobPosting.Draft(
                        "백엔드 개발자",
                        "테스트 회사",
                        "https://example.com/jobs/1",
                        null,
                        JobPostingSource.URL_INGEST,
                        "URL 수집",
                        null,
                        null,
                        LocalDate.now().plusDays(7),
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
}
