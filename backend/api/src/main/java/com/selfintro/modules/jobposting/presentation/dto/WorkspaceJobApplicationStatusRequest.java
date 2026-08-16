package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record WorkspaceJobApplicationStatusRequest(
        @NotNull JobPostingStatus status, LocalDate appliedAt, @Size(max = 1000) String memo) {}
