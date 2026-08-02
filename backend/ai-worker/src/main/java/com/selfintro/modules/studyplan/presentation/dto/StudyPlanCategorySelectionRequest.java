package com.selfintro.modules.studyplan.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record StudyPlanCategorySelectionRequest(@NotBlank String category, boolean selected) {}
