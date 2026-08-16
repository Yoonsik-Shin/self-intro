package com.selfintro.modules.competency.presentation;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
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
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping("/suggestions")
    public CompetencySuggestionResponse suggest(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody CompetencySuggestionRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        return aiWorkerClient.post(
                "/internal/workspaces/" + workspaceId + "/competencies/ai/suggestions",
                request,
                CompetencySuggestionResponse.class);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody suggestStream(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody CompetencySuggestionRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        String path =
                "/internal/workspaces/" + workspaceId + "/competencies/ai/suggestions/stream";
        return outputStream -> aiWorkerClient.pipePost(path, request, outputStream);
    }

    private Long writeWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR)
                .getWorkspace()
                .getId();
    }
}
