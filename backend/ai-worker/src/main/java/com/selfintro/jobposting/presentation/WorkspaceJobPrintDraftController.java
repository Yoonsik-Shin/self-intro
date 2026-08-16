package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.JobPostingPrintDraftService;
import com.selfintro.jobposting.presentation.dto.PrintTemplateRevisionRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobPrintDraftController {

    private final JobPostingPrintDraftService jobPostingPrintDraftService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping(
            value = "/{jobPostingId}/print-template-draft/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generate(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return jobPostingPrintDraftService.generateStream(
                writableWorkspaceId(authentication, workspaceSlug),
                jobPostingId,
                aiModel,
                customModelName);
    }

    @PostMapping(
            value = "/{jobPostingId}/print-template-draft/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter revise(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @PathVariable Long templateId,
            @Valid @RequestBody PrintTemplateRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return jobPostingPrintDraftService.reviseStream(
                writableWorkspaceId(authentication, workspaceSlug),
                jobPostingId,
                templateId,
                request.feedbackInstruction(),
                aiModel,
                customModelName);
    }

    private Long writableWorkspaceId(Authentication authentication, String workspaceSlug) {
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
