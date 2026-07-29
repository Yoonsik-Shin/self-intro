package com.selfintro.modules.studyplan.presentation.dto;

import com.selfintro.modules.studyplan.domain.entity.StudyPlan;
import com.selfintro.modules.studyplan.domain.enums.StudyPlanStatus;
import java.time.LocalDateTime;
import java.util.List;

public record StudyPlanResponse(
        Long id,
        StudyPlanStatus status,
        int weeklyAvailableMinutes,
        String focusGoal,
        List<StudyPlanStageResponse> stages,
        List<StudyPlanMessageResponse> messages,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime confirmedAt) {

    public static StudyPlanResponse from(StudyPlan plan) {
        int weeklyAvailableMinutes = plan.getWeeklyAvailableMinutes();
        return new StudyPlanResponse(
                plan.getId(),
                plan.getStatus(),
                weeklyAvailableMinutes,
                plan.getFocusGoal(),
                plan.getStages().stream()
                        .map(stage -> StudyPlanStageResponse.from(stage, weeklyAvailableMinutes))
                        .toList(),
                plan.getMessages().stream().map(StudyPlanMessageResponse::from).toList(),
                plan.getCreatedAt(),
                plan.getUpdatedAt(),
                plan.getConfirmedAt());
    }
}
