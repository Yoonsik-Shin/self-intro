package com.selfintro.modules.learningresource.domain.repository;

import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import java.util.List;

public record LearningResourceSearchCondition(
        String keyword,
        String category,
        List<String> tags,
        List<Long> skillIds,
        LearningResourceType resourceType,
        LearningResourceStatus status,
        LearningResourcePriorityTier priorityTier) {}
