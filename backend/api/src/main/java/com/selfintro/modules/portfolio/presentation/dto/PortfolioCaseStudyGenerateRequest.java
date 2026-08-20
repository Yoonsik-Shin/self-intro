package com.selfintro.modules.portfolio.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PortfolioCaseStudyGenerateRequest(
        @Size(max = 1000) String instruction,
        @NotNull List<Long> studyIds,
        @NotNull List<Long> skillIds,
        @NotNull List<Long> competencyIds,
        Long baseRevisionId,
        @Valid PortfolioCaseStudyContent currentDraft) {}
