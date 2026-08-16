package com.selfintro.modules.experience.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/experiences/manage/ai")
@RequiredArgsConstructor
public class WorkspaceExperienceAiController {

    private final AiWorkerClient aiWorkerClient;

    @PostMapping("/suggestions")
    public ExperienceSuggestionResponse suggest(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        return aiWorkerClient.post(
                "/internal/workspaces/" + workspaceId + "/experiences/manage/ai/suggestions",
                request,
                ExperienceSuggestionResponse.class);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody suggestStream(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        String path =
                "/internal/workspaces/" + workspaceId + "/experiences/manage/ai/suggestions/stream";
        return outputStream -> aiWorkerClient.pipePost(path, request, outputStream);
    }

    @PostMapping("/details/narrative")
    public ExperienceDetailNarrativeResponse generateNarrative(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody ExperienceDetailNarrativeRequest request) {
        return aiWorkerClient.post(
                "/internal/workspaces/" + workspaceId + "/experiences/manage/ai/details/narrative",
                request,
                ExperienceDetailNarrativeResponse.class);
    }
}
