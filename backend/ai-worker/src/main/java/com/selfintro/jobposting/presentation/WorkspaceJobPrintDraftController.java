package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.JobPostingPrintDraftService;
import com.selfintro.modules.jobposting.presentation.dto.PrintTemplateRevisionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/internal/workspaces/{workspaceId}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobPrintDraftController {

    private final JobPostingPrintDraftService jobPostingPrintDraftService;

    @PostMapping(
            value = "/{jobPostingId}/print-template-draft/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generate(
            @PathVariable Long workspaceId,
            @PathVariable Long jobPostingId,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return jobPostingPrintDraftService.generateStream(
                workspaceId, jobPostingId, aiModel, customModelName);
    }

    @PostMapping(
            value = "/{jobPostingId}/print-template-draft/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter revise(
            @PathVariable Long workspaceId,
            @PathVariable Long jobPostingId,
            @PathVariable Long templateId,
            @Valid @RequestBody PrintTemplateRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return jobPostingPrintDraftService.reviseStream(
                workspaceId,
                jobPostingId,
                templateId,
                request.feedbackInstruction(),
                aiModel,
                customModelName);
    }
}
