package com.selfintro.modules.experience.presentation;

import com.selfintro.modules.experience.ai.ExperienceAiService;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/admin/experiences/ai")
@RequiredArgsConstructor
public class ExperienceAiController {
    private final ExperienceAiService experienceAiService;

    @PostMapping("/suggestions")
    public ResponseEntity<ExperienceSuggestionResponse> suggest(
        @Valid @RequestBody ExperienceSuggestionRequest request
    ) {
        return ResponseEntity.ok(experienceAiService.suggest(request));
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suggestStream(
        @Valid @RequestBody ExperienceSuggestionRequest request
    ) {
        return experienceAiService.suggestStream(request);
    }
}
