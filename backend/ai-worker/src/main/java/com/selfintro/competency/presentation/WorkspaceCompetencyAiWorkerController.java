package com.selfintro.competency.presentation;

import com.selfintro.competency.application.CompetencyAiService;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/internal/workspaces/{workspaceId}/competencies/ai")
@RequiredArgsConstructor
public class WorkspaceCompetencyAiWorkerController {

    private final CompetencyAiService competencyAiService;

    @PostMapping("/suggestions")
    public CompetencySuggestionResponse suggest(
            @PathVariable Long workspaceId,
            @Valid @RequestBody CompetencySuggestionRequest request) {
        return competencyAiService.suggest(workspaceId, request);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suggestStream(
            @PathVariable Long workspaceId,
            @Valid @RequestBody CompetencySuggestionRequest request) {
        return competencyAiService.suggestStream(workspaceId, request);
    }
}
