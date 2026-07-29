package com.selfintro.modules.studyplan.presentation.dto;

import com.selfintro.modules.studyplan.domain.entity.StudyPlanStage;

public record StudyPlanStageResponse(
        Long id,
        int stageOrder,
        String theme,
        int totalMinutes,
        String estimatedDurationLabel,
        java.util.List<StudyPlanItemResponse> items) {

    public static StudyPlanStageResponse from(StudyPlanStage stage, int weeklyAvailableMinutes) {
        int totalMinutes = stage.getTotalAllocatedMinutes();
        int weeks =
                weeklyAvailableMinutes <= 0
                        ? 1
                        : Math.max(
                                1, (int) Math.ceil(totalMinutes / (double) weeklyAvailableMinutes));
        return new StudyPlanStageResponse(
                stage.getId(),
                stage.getStageOrder(),
                stage.getTheme(),
                totalMinutes,
                "약 " + weeks + "주 소요 예상",
                stage.getItems().stream().map(StudyPlanItemResponse::from).toList());
    }
}
