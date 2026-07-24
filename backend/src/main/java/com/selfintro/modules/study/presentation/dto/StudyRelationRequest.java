package com.selfintro.modules.study.presentation.dto;

import com.selfintro.modules.study.domain.StudyRelationType;
import jakarta.validation.constraints.NotNull;

public record StudyRelationRequest(@NotNull Long studyId, @NotNull StudyRelationType type) {}
