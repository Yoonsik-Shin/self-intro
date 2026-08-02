package com.selfintro.modules.learningresource.presentation.dto;

import com.selfintro.modules.learningresource.domain.enums.LearningResourceRelationType;
import jakarta.validation.constraints.NotNull;

public record LearningResourceRelationRequest(
        @NotNull Long resourceId, @NotNull LearningResourceRelationType type) {}
