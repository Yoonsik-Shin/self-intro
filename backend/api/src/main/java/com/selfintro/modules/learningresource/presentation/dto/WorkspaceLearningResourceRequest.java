package com.selfintro.modules.learningresource.presentation.dto;

import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record WorkspaceLearningResourceRequest(
        @NotNull LearningResourceStatus status,
        LearningResourcePriorityTier priorityTier,
        int displayOrder,
        @Size(max = 500) String summary,
        String detailMarkdown,
        List<@Size(max = 80) String> tagNames) {}
