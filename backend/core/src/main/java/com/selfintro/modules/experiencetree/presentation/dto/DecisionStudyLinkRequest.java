package com.selfintro.modules.experiencetree.presentation.dto;

import com.selfintro.modules.experiencetree.domain.enums.DecisionStudyRelationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DecisionStudyLinkRequest(
        @NotBlank String situationKey,
        String optionKey,
        @NotNull Long studyId,
        @NotNull DecisionStudyRelationType relationType,
        @Size(max = 1000) String note,
        int displayOrder) {}
