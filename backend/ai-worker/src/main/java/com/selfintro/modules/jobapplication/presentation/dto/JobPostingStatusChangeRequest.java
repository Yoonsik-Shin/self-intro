package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.enums.JobPostingStatus;
import jakarta.validation.constraints.NotNull;

public record JobPostingStatusChangeRequest(@NotNull JobPostingStatus status, String memo) {}
