package com.selfintro.studyplan.presentation.dto;

import com.selfintro.studyplan.domain.entity.StudyPlanItem;
import java.time.LocalDateTime;
import java.util.List;

public record StudyPlanItemResponse(
        Long id,
        Long learningResourceId,
        String resourceTitle,
        String freeTextLabel,
        int allocatedMinutes,
        boolean completed,
        LocalDateTime completedAt,
        boolean understandingChecked,
        LocalDateTime understandingCheckedAt,
        String notes,
        List<StudyPlanCheckQuestionResponse> checkQuestions) {

    public static StudyPlanItemResponse from(StudyPlanItem item) {
        return new StudyPlanItemResponse(
                item.getId(),
                item.getLearningResourceId(),
                item.getLearningResource() == null ? null : item.getLearningResource().getTitle(),
                item.getFreeTextLabel(),
                item.getAllocatedMinutes(),
                item.isCompleted(),
                item.getCompletedAt(),
                item.isUnderstandingChecked(),
                item.getUnderstandingCheckedAt(),
                item.getNotes(),
                item.getCheckQuestions().stream()
                        .map(StudyPlanCheckQuestionResponse::from)
                        .toList());
    }
}
