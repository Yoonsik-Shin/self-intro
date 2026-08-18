package com.selfintro.modules.study.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.study.presentation.dto.StudySuggestionRequest;
import com.selfintro.modules.study.presentation.dto.StudySuggestionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/studies/manage/ai")
@RequiredArgsConstructor
public class WorkspaceStudyAiController {

    private final AiWorkerClient aiWorkerClient;

    @PostMapping("/suggestions")
    public StudySuggestionResponse suggest(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody StudySuggestionRequest request) {
        return aiWorkerClient.post(
                "/internal/workspaces/" + workspaceId + "/studies/manage/ai/suggestions",
                request,
                StudySuggestionResponse.class);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody suggestStream(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody StudySuggestionRequest request) {
        String path = "/internal/workspaces/" + workspaceId + "/studies/manage/ai/suggestions/stream";
        return outputStream -> aiWorkerClient.pipePost(path, request, outputStream);
    }
}
