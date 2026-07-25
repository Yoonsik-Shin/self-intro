package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.entity.JobApplication;
import com.selfintro.modules.jobapplication.domain.enums.JobApplicationStage;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record JobApplicationResponse(
        Long id,
        String companyName,
        String positionTitle,
        String postingUrl,
        String source,
        LocalDate appliedAt,
        LocalDate deadline,
        JobApplicationStage currentStage,
        String salaryNote,
        String memo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static JobApplicationResponse from(JobApplication entity) {
        return new JobApplicationResponse(
                entity.getId(),
                entity.getCompanyName(),
                entity.getPositionTitle(),
                entity.getPostingUrl(),
                entity.getSource(),
                entity.getAppliedAt(),
                entity.getDeadline(),
                entity.getCurrentStage(),
                entity.getSalaryNote(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
