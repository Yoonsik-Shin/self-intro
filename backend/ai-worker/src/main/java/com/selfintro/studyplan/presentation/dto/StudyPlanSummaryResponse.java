package com.selfintro.studyplan.presentation.dto;

import com.selfintro.studyplan.domain.entity.StudyPlan;
import com.selfintro.studyplan.domain.enums.StudyPlanStatus;
import java.time.LocalDateTime;

public record StudyPlanSummaryResponse(
        Long id,
        StudyPlanStatus status,
        String focusGoal,
        LocalDateTime createdAt,
        LocalDateTime confirmedAt) {

    public static StudyPlanSummaryResponse from(StudyPlan plan) {
        return new StudyPlanSummaryResponse(
                plan.getId(),
                plan.getStatus(),
                plan.getFocusGoal(),
                plan.getCreatedAt(),
                plan.getConfirmedAt());
    }
}
