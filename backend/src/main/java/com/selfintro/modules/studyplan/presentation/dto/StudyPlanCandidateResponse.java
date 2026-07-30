package com.selfintro.modules.studyplan.presentation.dto;

import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanCandidate;

public record StudyPlanCandidateResponse(
        Long id,
        String title,
        String category,
        LearningResourceType resourceType,
        LearningResourcePriorityTier priorityTier,
        Integer durationMinutes,
        boolean selected,
        boolean familiar) {

    public static StudyPlanCandidateResponse from(StudyPlanCandidate candidate) {
        var resource = candidate.getLearningResource();
        return new StudyPlanCandidateResponse(
                resource.getId(),
                resource.getTitle(),
                resource.getCategory().getName(),
                resource.getResourceType(),
                resource.getPriorityTier(),
                resource.getDurationMinutes(),
                candidate.isSelected(),
                candidate.isFamiliar());
    }
}
