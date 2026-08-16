package com.selfintro.modules.experience.presentation;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionResponse;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/experiences/manage/ai")
@RequiredArgsConstructor
public class WorkspaceExperienceAiController {

    private final AiWorkerClient aiWorkerClient;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping("/suggestions")
    public ExperienceSuggestionResponse suggest(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        return aiWorkerClient.post(
                "/internal/workspaces/" + workspaceId + "/experiences/manage/ai/suggestions",
                request,
                ExperienceSuggestionResponse.class);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody suggestStream(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        String path =
                "/internal/workspaces/" + workspaceId + "/experiences/manage/ai/suggestions/stream";
        return outputStream -> aiWorkerClient.pipePost(path, request, outputStream);
    }

    @PostMapping("/details/narrative")
    public ExperienceDetailNarrativeResponse generateNarrative(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody ExperienceDetailNarrativeRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        return aiWorkerClient.post(
                "/internal/workspaces/" + workspaceId + "/experiences/manage/ai/details/narrative",
                request,
                ExperienceDetailNarrativeResponse.class);
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
