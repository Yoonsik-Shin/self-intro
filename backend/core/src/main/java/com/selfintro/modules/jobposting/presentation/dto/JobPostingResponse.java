package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record JobPostingResponse(
        Long id,
        String companyName,
        String positionTitle,
        String postingUrl,
        List<SourceUrl> sourceUrls,
        String externalId,
        JobPostingSource collectionMethod,
        String source,
        JobPostingStatus status,
        LocalDate appliedAt,
        LocalDate deadline,
        boolean alwaysOpen,
        String salaryNote,
        String location,
        String employmentType,
        String memo,
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

    public static JobPostingResponse from(JobPosting entity, List<JobPostingSourceUrl> sourceUrls) {
        return new JobPostingResponse(
                entity.getId(),
                entity.getCompanyName(),
                entity.getPositionTitle(),
                entity.getPostingUrl(),
                sourceUrls.stream().map(SourceUrl::from).toList(),
                entity.getExternalId(),
                entity.getCollectionMethod(),
                entity.getSource(),
                entity.getStatus(),
                entity.getAppliedAt(),
                entity.getDeadline(),
                entity.isAlwaysOpen(),
                entity.getSalaryNote(),
                entity.getLocation(),
                entity.getEmploymentType(),
                entity.getMemo(),
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
                entity.getStatusChangedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
