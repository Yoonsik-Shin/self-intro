package com.selfintro.modules.printtemplate.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PrintTemplateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull String excludedIds,
        @NotNull String sectionOrder,
        @NotNull String sectionGaps,
        @Size(max = 60) String targetRole,
        String contentOverrides,
        @Size(max = 64) String baseContentFingerprint,
        Integer schemaVersion,
        @NotNull Boolean visible,
        int displayOrder) {}
