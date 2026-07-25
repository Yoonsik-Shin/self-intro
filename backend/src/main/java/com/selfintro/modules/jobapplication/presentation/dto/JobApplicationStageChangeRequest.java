package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.enums.JobApplicationStage;
import jakarta.validation.constraints.NotNull;

public record JobApplicationStageChangeRequest(@NotNull JobApplicationStage stage, String memo) {}
