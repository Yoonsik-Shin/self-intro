package com.selfintro.studyplan.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record StudyPlanMessageRequest(@NotBlank String content, String aiModel, String customModelName) {}
