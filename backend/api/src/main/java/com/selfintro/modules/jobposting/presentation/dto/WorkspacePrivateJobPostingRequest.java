package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

/** 사용자가 직접 확보한 공고를 플랫폼 공용 카탈로그가 아닌 현재 Workspace에만 저장한다. */
public record WorkspacePrivateJobPostingRequest(
        @NotBlank @Size(max = 100) String companyName,
        @NotBlank @Size(max = 150) String positionTitle,
        JobPostingSource source,
        @Size(max = 500) String postingUrl,
        LocalDate deadline,
        LocalTime deadlineTime,
        boolean alwaysOpen,
        @Size(max = 200) String salaryNote,
        @Size(max = 100) String location,
        @Size(max = 50) String employmentType,
        String requiredSkillsRaw,
        String jobDescription,
        String requiredQualifications,
        String preferredQualifications,
        String hiringProcess,
        String applicationMethod,
        String compensationDetail,
        @NotNull JobPostingStatus status,
        LocalDate appliedAt,
        String memo,
        @Min(1) @Max(5) Integer interestLevel,
        @Min(0) @Max(100) Integer matchScore,
        @Size(max = 500) String matchReason) {}
