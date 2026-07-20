package com.selfintro.modules.experience.presentation.dto;

import java.util.List;

public record ExperienceSuggestionResponse(List<Suggestion> suggestions) {
    public record Suggestion(
        String summary,
        String takeaway,
        List<DetailSuggestion> details,
        String reason
    ) {}

    public record DetailSuggestion(
        String content,
        String situation,
        String actionDetail,
        String outcome,
        List<Long> skillIds
    ) {}
}
