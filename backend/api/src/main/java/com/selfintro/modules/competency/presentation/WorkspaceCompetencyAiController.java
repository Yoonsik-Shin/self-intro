package com.selfintro.modules.competency.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/competencies/ai")
@RequiredArgsConstructor
public class WorkspaceCompetencyAiController {

    private final AiWorkerClient aiWorkerClient;

    @PostMapping("/suggestions")
    public CompetencySuggestionResponse suggest(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody CompetencySuggestionRequest request) {
        return aiWorkerClient.post(
                "/internal/workspaces/" + workspaceId + "/competencies/ai/suggestions",
                request,
                CompetencySuggestionResponse.class);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody suggestStream(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody CompetencySuggestionRequest request) {
        String path =
                "/internal/workspaces/" + workspaceId + "/competencies/ai/suggestions/stream";
        return outputStream -> aiWorkerClient.pipePost(path, request, outputStream);
    }
}
