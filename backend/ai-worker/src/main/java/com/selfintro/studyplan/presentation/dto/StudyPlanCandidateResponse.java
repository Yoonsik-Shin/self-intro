package com.selfintro.studyplan.presentation.dto;

import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.studyplan.domain.entity.StudyPlanCandidate;
import java.util.stream.Collectors;

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
                resource.getTaxonomyNodes().isEmpty()
                        ? "미분류"
                        : resource.getTaxonomyNodes().stream()
                                .map(node -> node.getName())
                                .collect(Collectors.joining(", ")),
                resource.getResourceType(),
                candidate.getPriorityTier(),
                resource.getDurationMinutes(),
                candidate.isSelected(),
                candidate.isFamiliar());
    }
}
