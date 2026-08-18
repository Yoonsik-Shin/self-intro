package com.selfintro.modules.portfolio.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PortfolioCaseStudyCreateRequest(
        @NotNull Long experienceId,
        @NotBlank @Size(max = 160) String slug,
        @NotBlank @Size(max = 200) String title) {}
