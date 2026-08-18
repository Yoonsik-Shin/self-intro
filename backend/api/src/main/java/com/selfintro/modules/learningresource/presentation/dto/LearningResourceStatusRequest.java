package com.selfintro.modules.learningresource.presentation.dto;

import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import jakarta.validation.constraints.NotNull;

public record LearningResourceStatusRequest(@NotNull LearningResourceStatus status) {}
