package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import jakarta.validation.constraints.NotNull;

public record JobPostingStatusChangeRequest(@NotNull JobPostingStatus status, String memo) {}
