package com.selfintro.modules.experience.presentation;

import com.selfintro.modules.experience.application.ExperienceAiService;
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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/experiences/manage/ai")
@RequiredArgsConstructor
public class WorkspaceExperienceAiController {

    private final ExperienceAiService experienceAiService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping("/suggestions")
    public ExperienceSuggestionResponse suggest(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        return experienceAiService.suggest(
                writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suggestStream(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        return experienceAiService.suggestStream(
                writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @PostMapping("/details/narrative")
    public ExperienceDetailNarrativeResponse generateNarrative(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody ExperienceDetailNarrativeRequest request) {
        writeWorkspaceId(authentication, workspaceSlug);
        return experienceAiService.generateNarrative(request);
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
