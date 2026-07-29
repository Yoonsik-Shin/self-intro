package com.selfintro.modules.learningresource.presentation.dto;

import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record LearningResourceRequest(
        @Size(max = 160) String slug,
        @NotBlank @Size(max = 160) String title,
        @NotNull LearningResourceType resourceType,
        @Size(max = 120) String provider,
        @Size(max = 500) String url,
        @Size(max = 120) String instructorOrAuthor,
        Integer durationMinutes,
        @NotNull LearningResourceStatus status,
        LearningResourcePriorityTier priorityTier,
        int displayOrder,
        @NotNull Long categoryId,
        @Size(max = 500) String summary,
        String detailMarkdown,
        List<@NotBlank @Size(max = 80) String> tagNames,
        List<Long> skillIds,
        List<@Valid LearningResourceRelationRequest> relatedResources) {}
