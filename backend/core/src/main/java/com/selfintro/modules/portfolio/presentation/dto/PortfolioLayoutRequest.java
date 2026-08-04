package com.selfintro.modules.portfolio.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PortfolioLayoutRequest(
        @NotBlank @Pattern(regexp = "PORTRAIT|LANDSCAPE") String orientation,
        @NotBlank String name,
        String excludedIdsJson,
        String sectionOrderJson,
        String sectionGapsJson,
        String itemOrderOverridesJson,
        String forcedPageOverridesJson,
        String contentOverridesJson,
        boolean isDefault) {}
