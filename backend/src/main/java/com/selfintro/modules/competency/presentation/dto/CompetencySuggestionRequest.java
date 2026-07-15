package com.selfintro.modules.competency.presentation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CompetencySuggestionRequest(
    @Size(max = 500) String instruction,
    @Size(max = 120) String draftTitle,
    @Size(max = 500) String draftSummary,
    @NotNull List<Long> skillIds,
    @NotNull List<Long> experienceIds,
    @NotNull List<Long> studyIds
) {}
