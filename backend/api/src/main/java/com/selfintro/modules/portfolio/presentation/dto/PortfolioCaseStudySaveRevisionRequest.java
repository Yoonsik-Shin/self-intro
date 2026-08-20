package com.selfintro.modules.portfolio.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PortfolioCaseStudySaveRevisionRequest(
        @NotNull @Valid PortfolioCaseStudyContent content,
        @NotBlank String source,
        Long baseRevisionId,
        @Size(max = 1000) String feedbackInstruction,
        @Size(max = 100) String aiModel) {}
