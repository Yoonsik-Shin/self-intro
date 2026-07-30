package com.selfintro.modules.studyplan.presentation.dto;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;

public record StudyPlanCandidateResponse(
        Long id,
        String title,
        String category,
        LearningResourceType resourceType,
        LearningResourcePriorityTier priorityTier,
        Integer durationMinutes) {

    public static StudyPlanCandidateResponse from(LearningResource resource) {
        return new StudyPlanCandidateResponse(
                resource.getId(),
                resource.getTitle(),
                resource.getCategory().getName(),
                resource.getResourceType(),
                resource.getPriorityTier(),
                resource.getDurationMinutes());
    }
}
