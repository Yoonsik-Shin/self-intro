package com.selfintro.study.dto;

import java.util.List;

public record StudySuggestionResponse(List<Suggestion> suggestions) {
    public record Suggestion(
            String title,
            String summary,
            List<String> tagNames,
            String contentMarkdown,
            String reason) {}
}
