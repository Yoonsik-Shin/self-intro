package com.selfintro.studyplan.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record StudyPlanCategorySelectionRequest(@NotBlank String category, boolean selected) {}
