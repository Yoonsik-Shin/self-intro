package com.selfintro.modules.study.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.study.application.StudyAiService;
import com.selfintro.modules.study.presentation.dto.StudySuggestionRequest;
import com.selfintro.modules.study.presentation.dto.StudySuggestionResponse;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/studies/manage/ai")
@RequiredArgsConstructor
public class WorkspaceStudyAiController {

    private final StudyAiService studyAiService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping("/suggestions")
    public StudySuggestionResponse suggest(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody StudySuggestionRequest request) {
        return studyAiService.suggest(writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suggestStream(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody StudySuggestionRequest request) {
        return studyAiService.suggestStream(
                writeWorkspaceId(authentication, workspaceSlug), request);
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
