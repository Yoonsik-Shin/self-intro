package com.selfintro.modules.printtemplate.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PrintTemplateRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull String excludedIds,
    @NotNull String sectionOrder,
    @NotNull String sectionGaps,
    @NotNull Boolean visible,
    int displayOrder
) {}
