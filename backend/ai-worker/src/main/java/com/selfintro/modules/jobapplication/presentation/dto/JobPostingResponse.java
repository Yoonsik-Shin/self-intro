package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record JobPostingResponse(
        Long id,
        String companyName,
        String positionTitle,
        String postingUrl,
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

    public static JobPostingResponse from(JobPosting entity) {
        return new JobPostingResponse(
                entity.getId(),
                entity.getCompanyName(),
                entity.getPositionTitle(),
                entity.getPostingUrl(),
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
