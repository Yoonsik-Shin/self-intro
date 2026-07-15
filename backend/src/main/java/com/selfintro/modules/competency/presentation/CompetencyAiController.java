package com.selfintro.modules.competency.presentation;

import com.selfintro.modules.competency.ai.CompetencyAiService;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionResponse;
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
@RequestMapping("/api/admin/competencies/ai")
@RequiredArgsConstructor
public class CompetencyAiController {
    private final CompetencyAiService competencyAiService;

    @PostMapping("/suggestions")
    public ResponseEntity<CompetencySuggestionResponse> suggest(
        @Valid @RequestBody CompetencySuggestionRequest request
    ) {
        return ResponseEntity.ok(competencyAiService.suggest(request));
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suggestStream(
        @Valid @RequestBody CompetencySuggestionRequest request
    ) {
        return competencyAiService.suggestStream(request);
    }
}
