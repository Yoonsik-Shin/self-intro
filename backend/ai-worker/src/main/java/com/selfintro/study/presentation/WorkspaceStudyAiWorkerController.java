package com.selfintro.study.presentation;

import com.selfintro.modules.study.presentation.dto.StudySuggestionRequest;
import com.selfintro.modules.study.presentation.dto.StudySuggestionResponse;
import com.selfintro.study.application.StudyAiService;
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
@RequestMapping("/internal/workspaces/{workspaceId}/studies/manage/ai")
@RequiredArgsConstructor
public class WorkspaceStudyAiWorkerController {

    private final StudyAiService studyAiService;

    @PostMapping("/suggestions")
    public StudySuggestionResponse suggest(
            @PathVariable Long workspaceId, @Valid @RequestBody StudySuggestionRequest request) {
        return studyAiService.suggest(workspaceId, request);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suggestStream(
            @PathVariable Long workspaceId, @Valid @RequestBody StudySuggestionRequest request) {
        return studyAiService.suggestStream(workspaceId, request);
    }
}
