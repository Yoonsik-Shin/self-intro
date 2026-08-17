package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingPositionChoice;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceImage;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record JobPostingResponse(
        Long id,
        Long ownerWorkspaceId,
        String companyName,
        String positionTitle,
        String postingUrl,
        List<SourceUrl> sourceUrls,
        List<PositionChoice> positionChoices,
        List<SourceImage> sourceImages,
        String externalId,
        JobPostingSource collectionMethod,
        String source,
        JobPostingStatus status,
        LocalDate appliedAt,
        LocalDate deadline,
        LocalTime deadlineTime,
        boolean alwaysOpen,
        String salaryNote,
        String location,
        BigDecimal latitude,
        BigDecimal longitude,
        String employmentType,
        String memo,
        Integer interestLevel,
        String jobDescription,
        String requiredQualifications,
        String preferredQualifications,
        String hiringProcess,
        String applicationMethod,
        String compensationDetail,
        Integer matchScore,
        String matchReason,
        String appealAnalysis,
        LocalDateTime appealAnalyzedAt,
        BigDecimal jobplanetRating,
        Integer jobplanetReviewCount,
        String jobplanetCompanyName,
        String jobplanetCompanyUrl,
        LocalDateTime jobplanetCheckedAt,
        JobPostingPermissionBasis permissionBasis,
        JobPostingPermissionReviewStatus permissionReviewStatus,
        String permissionEvidenceReference,
        String permissionGrantorName,
        String permissionGrantorAuthority,
        String permissionScopeNote,
        String permissionTermsVersion,
        String permissionRevocationContact,
        LocalDateTime permissionExpiresAt,
        Long permissionReviewedByUserId,
        LocalDateTime permissionReviewedAt,
        boolean sharedCatalogEligible,
        LocalDateTime statusChangedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    /** 회사+직무가 같아 병합된 공고에 등록된 URL 하나. 프론트 "원본 보기" 팝오버가 그대로 나열한다. */
    public record SourceUrl(Long id, String url, JobPostingPlatform platform, boolean primary) {
        public static SourceUrl from(JobPostingSourceUrl entity) {
            return new SourceUrl(
                    entity.getId(), entity.getUrl(), entity.getPlatform(), entity.isPrimary());
        }
    }

    /** 2지망 이상. 1지망은 positionTitle 자신이 담당한다. */
    public record PositionChoice(Long id, int rank, String positionTitle) {
        public static PositionChoice from(JobPostingPositionChoice entity) {
            return new PositionChoice(
                    entity.getId(), entity.getRankOrder(), entity.getPositionTitle());
        }
    }

    /** JD 스크린샷으로 등록된 공고의 원본 이미지. 상세 드로어 "원본 이미지 보기"가 그대로 나열한다. */
    public record SourceImage(Long id, String url, int displayOrder) {
        public static SourceImage from(JobPostingSourceImage entity) {
            return new SourceImage(entity.getId(), entity.getImageUrl(), entity.getDisplayOrder());
        }
    }

    public static JobPostingResponse from(
            JobPosting entity,
            List<JobPostingSourceUrl> sourceUrls,
            List<JobPostingPositionChoice> positionChoices,
            List<JobPostingSourceImage> sourceImages) {
        return new JobPostingResponse(
                entity.getId(),
                entity.getOwnerWorkspaceId(),
                entity.getCompanyName(),
                entity.getPositionTitle(),
                entity.getPostingUrl(),
                sourceUrls.stream().map(SourceUrl::from).toList(),
                positionChoices.stream().map(PositionChoice::from).toList(),
                sourceImages.stream().map(SourceImage::from).toList(),
                entity.getExternalId(),
                entity.getCollectionMethod(),
                entity.getSource(),
                entity.getStatus(),
                entity.getAppliedAt(),
                entity.getDeadline(),
                entity.getDeadlineTime(),
                entity.isAlwaysOpen(),
                entity.getSalaryNote(),
                entity.getLocation(),
                entity.getLatitude(),
                entity.getLongitude(),
                entity.getEmploymentType(),
                entity.getMemo(),
                null,
                entity.getJobDescription(),
                entity.getRequiredQualifications(),
                entity.getPreferredQualifications(),
                entity.getHiringProcess(),
                entity.getApplicationMethod(),
                entity.getCompensationDetail(),
                entity.getMatchScore(),
                entity.getMatchReason(),
                entity.getAppealAnalysis(),
                entity.getAppealAnalyzedAt(),
                entity.getJobplanetRating(),
                entity.getJobplanetReviewCount(),
                entity.getJobplanetCompanyName(),
                entity.getJobplanetCompanyUrl(),
                entity.getJobplanetCheckedAt(),
                entity.getPermissionBasis(),
                entity.getPermissionReviewStatus(),
                entity.getPermissionEvidenceReference(),
                entity.getPermissionGrantorName(),
                entity.getPermissionGrantorAuthority(),
                entity.getPermissionScopeNote(),
                entity.getPermissionTermsVersion(),
                entity.getPermissionRevocationContact(),
                entity.getPermissionExpiresAt(),
                entity.getPermissionReviewedByUserId(),
                entity.getPermissionReviewedAt(),
                entity.isSharedCatalogEligible(LocalDateTime.now()),
                entity.getStatusChangedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    public static JobPostingResponse from(
            JobPosting entity,
            WorkspaceJobApplication application,
            List<JobPostingSourceUrl> sourceUrls,
            List<JobPostingPositionChoice> positionChoices,
            List<JobPostingSourceImage> sourceImages) {
        return new JobPostingResponse(
                entity.getId(),
                entity.getOwnerWorkspaceId(),
                entity.getCompanyName(),
                entity.getPositionTitle(),
                entity.getPostingUrl(),
                sourceUrls.stream().map(SourceUrl::from).toList(),
                positionChoices.stream().map(PositionChoice::from).toList(),
                sourceImages.stream().map(SourceImage::from).toList(),
                entity.getExternalId(),
                entity.getCollectionMethod(),
                entity.getSource(),
                application.getStatus(),
                application.getAppliedAt(),
                entity.getDeadline(),
                entity.getDeadlineTime(),
                entity.isAlwaysOpen(),
                entity.getSalaryNote(),
                entity.getLocation(),
                entity.getLatitude(),
                entity.getLongitude(),
                entity.getEmploymentType(),
                application.getMemo(),
                application.getInterestLevel(),
                entity.getJobDescription(),
                entity.getRequiredQualifications(),
                entity.getPreferredQualifications(),
                entity.getHiringProcess(),
                entity.getApplicationMethod(),
                entity.getCompensationDetail(),
                application.getMatchScore(),
                application.getMatchReason(),
                application.getAppealAnalysis(),
                application.getAppealAnalyzedAt(),
                entity.getJobplanetRating(),
                entity.getJobplanetReviewCount(),
                entity.getJobplanetCompanyName(),
                entity.getJobplanetCompanyUrl(),
                entity.getJobplanetCheckedAt(),
                entity.getPermissionBasis(),
                entity.getPermissionReviewStatus(),
                entity.getPermissionEvidenceReference(),
                entity.getPermissionGrantorName(),
                entity.getPermissionGrantorAuthority(),
                entity.getPermissionScopeNote(),
                entity.getPermissionTermsVersion(),
                entity.getPermissionRevocationContact(),
                entity.getPermissionExpiresAt(),
                entity.getPermissionReviewedByUserId(),
                entity.getPermissionReviewedAt(),
                entity.isSharedCatalogEligible(LocalDateTime.now()),
                application.getStatusChangedAt(),
                application.getCreatedAt(),
                application.getUpdatedAt());
    }
}
