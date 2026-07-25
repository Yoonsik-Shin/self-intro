package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record JobPostingCandidateResponse(
        Long id,
        String title,
        String companyName,
        String url,
        JobPostingSource source,
        String location,
        String employmentType,
        LocalDate deadline,
        String salaryNote,
        JobPostingCandidateStatus status,
        Integer matchScore,
        String matchReason,
        LocalDateTime fetchedAt) {

    public static JobPostingCandidateResponse from(JobPostingCandidate entity) {
        return new JobPostingCandidateResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getCompanyName(),
                entity.getUrl(),
                entity.getSource(),
                entity.getLocation(),
                entity.getEmploymentType(),
                entity.getDeadline(),
                entity.getSalaryNote(),
                entity.getStatus(),
                entity.getMatchScore(),
                entity.getMatchReason(),
                entity.getFetchedAt());
    }
}
