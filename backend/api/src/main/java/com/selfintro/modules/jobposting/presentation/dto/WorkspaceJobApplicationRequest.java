package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record WorkspaceJobApplicationRequest(
        @NotNull JobPostingStatus status,
        LocalDate appliedAt,
        String memo,
        @Min(1) @Max(5) Integer interestLevel,
        @Min(0) @Max(100) Integer matchScore,
        @Size(max = 500) String matchReason) {}
