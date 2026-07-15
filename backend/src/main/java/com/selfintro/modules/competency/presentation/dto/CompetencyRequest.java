package com.selfintro.modules.competency.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CompetencyRequest(
    @NotBlank @Size(max = 120) String title,
    @NotBlank @Size(max = 500) String summary,
    int displayOrder,
    boolean visible,
    @NotNull List<Long> skillIds,
    @NotNull @Valid List<EvidenceRequest> evidences,
    @NotNull List<Long> studyIds
) {
    public record EvidenceRequest(
        @NotNull Long experienceId,
        @Size(max = 700) String evidenceSummary,
        boolean primary,
        int displayOrder
    ) {}
}
