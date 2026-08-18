package com.selfintro.experience.presentation;

import com.selfintro.experience.application.ExperienceAiService;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionResponse;
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
@RequestMapping("/internal/workspaces/{workspaceId}/experiences/manage/ai")
@RequiredArgsConstructor
public class WorkspaceExperienceAiWorkerController {

    private final ExperienceAiService experienceAiService;

    @PostMapping("/suggestions")
    public ExperienceSuggestionResponse suggest(
            @PathVariable Long workspaceId,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        return experienceAiService.suggest(workspaceId, request);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suggestStream(
            @PathVariable Long workspaceId,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        return experienceAiService.suggestStream(workspaceId, request);
    }

    @PostMapping("/details/narrative")
    public ExperienceDetailNarrativeResponse generateNarrative(
            @PathVariable Long workspaceId,
            @Valid @RequestBody ExperienceDetailNarrativeRequest request) {
        return experienceAiService.generateNarrative(request);
    }
}
