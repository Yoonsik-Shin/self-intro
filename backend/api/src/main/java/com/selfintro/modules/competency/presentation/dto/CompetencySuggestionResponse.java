package com.selfintro.modules.competency.presentation.dto;

import java.util.List;

public record CompetencySuggestionResponse(List<Suggestion> suggestions) {
    public record Suggestion(
            String title,
            String summary,
            List<Long> skillIds,
            List<Evidence> evidences,
            List<Long> studyIds,
            String reason) {}

    public record Evidence(Long experienceId, String evidenceSummary, boolean primary) {}
}
