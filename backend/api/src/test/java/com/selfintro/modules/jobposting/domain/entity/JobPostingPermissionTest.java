package com.selfintro.modules.jobposting.domain.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class JobPostingPermissionTest {

    private JobPosting posting(LocalDateTime now) {
        return JobPosting.collect(
                new JobPosting.Draft(
                        "백엔드 개발자",
                        "테스트 회사",
                        "https://example.com/jobs/1",
                        null,
                        JobPostingSource.URL_INGEST,
                        "직접 입력",
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
                now);
    }

    @Test
    void unreviewedPostingIsNeverShared() {
        LocalDateTime now = LocalDateTime.now();

        assertThat(posting(now).isSharedCatalogEligible(now)).isFalse();
    }

    @Test
    void privateSourceIsBoundToOneWorkspaceBeforePersistence() {
        JobPosting posting = posting(LocalDateTime.now());

        posting.assignToWorkspace(7L);

        assertThat(posting.isPlatformCatalogSource()).isFalse();
        assertThat(posting.isOwnedByWorkspace(7L)).isTrue();
        assertThat(posting.isOwnedByWorkspace(8L)).isFalse();
        assertThat(posting.getScopeKey()).isEqualTo("WORKSPACE:7");
        assertThatThrownBy(() -> posting.assignToWorkspace(8L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("before persistence");
    }

    @Test
    void approvedPostingRequiresConcreteRedistributionEvidence() {
        LocalDateTime now = LocalDateTime.now();
        JobPosting posting = posting(now);

        posting.reviewSharingPermission(
                JobPostingPermissionReviewStatus.APPROVED,
                JobPostingPermissionBasis.WRITTEN_LICENSE,
                "contract:job-catalog-2026-08",
                "테스트 회사",
                "채용 담당 부서",
                "회원 대상 저장·검색·재노출 허용",
                "2026-08",
                "legal@example.com",
                now.plusDays(30),
                1L,
                now);

        assertThat(posting.isSharedCatalogEligible(now)).isTrue();
        assertThat(posting.isSharedCatalogEligible(now.plusDays(31))).isFalse();
    }

    @Test
    void operatorApprovalWithoutPermissionBasisIsRejected() {
        LocalDateTime now = LocalDateTime.now();
        JobPosting posting = posting(now);

        assertThatThrownBy(
                        () ->
                                posting.reviewSharingPermission(
                                        JobPostingPermissionReviewStatus.APPROVED,
                                        JobPostingPermissionBasis.UNKNOWN,
                                        "memo",
                                        "테스트 회사",
                                        "채용 담당 부서",
                                        "재노출 허용",
                                        null,
                                        null,
                                        null,
                                        1L,
                                        now))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void editingSharedSourceForcesReReview() {
        LocalDateTime now = LocalDateTime.now();
        JobPosting posting = posting(now);
        posting.reviewSharingPermission(
                JobPostingPermissionReviewStatus.APPROVED,
                JobPostingPermissionBasis.EMPLOYER_DIRECT_SUBMISSION,
                "submission:1",
                "테스트 회사",
                "채용 담당 부서",
                "회원 대상 재노출 허용",
                null,
                null,
                null,
                1L,
                now);

        posting.update(
                "테스트 회사",
                "수정된 백엔드 개발자",
                "https://example.com/jobs/1",
                "직접 입력",
                LocalDate.now().plusDays(10),
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
                null,
                now.plusMinutes(1));

        assertThat(posting.getPermissionReviewStatus())
                .isEqualTo(JobPostingPermissionReviewStatus.REVIEW_REQUIRED);
        assertThat(posting.isSharedCatalogEligible(now.plusMinutes(1))).isFalse();
    }
}
