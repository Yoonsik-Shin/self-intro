package com.selfintro.modules.study.ai;

import com.selfintro.modules.study.presentation.dto.StudySuggestionRequest;
import com.selfintro.modules.study.presentation.dto.StudySuggestionResponse;
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
@RequestMapping("/api/admin/studies/ai")
@RequiredArgsConstructor
public class StudyAiController {
    private final StudyAiService studyAiService;

    @PostMapping("/suggestions")
    public ResponseEntity<StudySuggestionResponse> suggest(
            @Valid @RequestBody StudySuggestionRequest request) {
        return ResponseEntity.ok(studyAiService.suggest(request));
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suggestStream(@Valid @RequestBody StudySuggestionRequest request) {
        return studyAiService.suggestStream(request);
    }
}
