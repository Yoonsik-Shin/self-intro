package com.selfintro.modules.portfolio.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PortfolioCaseStudySaveRevisionRequest(
        @NotNull @Valid PortfolioCaseStudyContent content, @NotBlank String source) {}
