package com.selfintro.studyplan.presentation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record StudyPlanCreateRequest(
        @NotNull @Min(1) Integer weeklyAvailableMinutes, String focusGoal) {}
