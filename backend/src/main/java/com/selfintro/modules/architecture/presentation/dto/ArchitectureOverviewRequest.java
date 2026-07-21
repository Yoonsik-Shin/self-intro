package com.selfintro.modules.architecture.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ArchitectureOverviewRequest(
        @NotBlank @Size(max = 200) String heading,
        @NotBlank @Size(max = 500) String subheading,
        @NotBlank @Size(max = 200) String diagramHeading,
        @NotBlank String diagramText) {}
