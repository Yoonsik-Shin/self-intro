package com.selfintro.study.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record StudySuggestionRequest(
        @Size(max = 1000) String instruction,
        @Size(max = 160) String draftTitle,
        @Size(max = 500) String draftSummary,
        @NotNull List<Long> skillIds,
        @NotNull List<Long> experienceIds,
        @NotNull List<Long> experienceDetailIds,
        @NotNull List<Long> relatedStudyIds) {}
