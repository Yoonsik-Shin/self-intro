package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record JobPostingSettingRequest(
        @NotNull Boolean saraminEnabled,
        String searchKeywords,
        @Min(1) int searchCount,
        @NotBlank String searchSort,
        String locationCode,
        String jobCode,
        String industryCode,
        @NotNull Boolean collectorScheduledEnabled,
        @Min(0) int matchingKeywordThreshold,
        @NotBlank String collectorCron,
        String homeAddress,
        BigDecimal homeLatitude,
        BigDecimal homeLongitude) {}
