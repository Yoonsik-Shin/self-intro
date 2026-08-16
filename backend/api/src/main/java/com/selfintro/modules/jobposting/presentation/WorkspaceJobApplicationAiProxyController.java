package com.selfintro.modules.jobposting.presentation;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.presentation.dto.GapProjectDocumentResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobposting.presentation.dto.PrintTemplateRevisionRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotParseRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobApplicationAiProxyController {

    private final AiWorkerClient aiWorkerClient;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        return aiWorkerClient.post(
                "/internal/workspaces/" + workspaceId + "/job-applications/manage/parse-url",
                request,
                JobApplicationUrlParseResponse.class);
    }

    @PostMapping("/parse-screenshots")
    public JobApplicationUrlParseResponse parseScreenshots(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceJobScreenshotParseRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        return aiWorkerClient.post(
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/parse-screenshots",
                request,
                JobApplicationUrlParseResponse.class);
    }

    @PostMapping("/{jobPostingId}/generate-cover-letter-draft")
    public JobPostingCoverLetterDraftResponse generateCoverLetterDraft(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody JobPostingCoverLetterDraftRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        return aiWorkerClient.post(
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/"
                        + jobPostingId
                        + "/generate-cover-letter-draft",
                request,
                JobPostingCoverLetterDraftResponse.class);
    }

    @PostMapping("/{jobPostingId}/analyze-appeal")
    public JobPostingResponse analyzeAppeal(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        String query = buildModelQuery(aiModel, customModelName);
        return aiWorkerClient.post(
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/"
                        + jobPostingId
                        + "/analyze-appeal"
                        + query,
                null,
                JobPostingResponse.class);
    }

    @PostMapping("/{jobPostingId}/rematch")
    public JobPostingResponse rematch(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        return aiWorkerClient.post(
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/"
                        + jobPostingId
                        + "/rematch",
                null,
                JobPostingResponse.class);
    }

    @GetMapping("/{jobPostingId}/gap-project-documents")
    public List<GapProjectDocumentResponse> listGapDocuments(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId) {
        Long workspaceId = readWorkspaceId(authentication, workspaceSlug);
        return aiWorkerClient.get(
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/"
                        + jobPostingId
                        + "/gap-project-documents",
                List.class);
    }

    @PostMapping("/{jobPostingId}/gap-project-documents")
    public GapProjectDocumentResponse generateGapDocument(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        String query = buildModelQuery(aiModel, customModelName);
        return aiWorkerClient.post(
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/"
                        + jobPostingId
                        + "/gap-project-documents"
                        + query,
                null,
                GapProjectDocumentResponse.class);
    }

    @PostMapping(
            value = "/{jobPostingId}/print-template-draft/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody streamPrintTemplateDraft(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        String query = buildModelQuery(aiModel, customModelName);
        String path =
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/"
                        + jobPostingId
                        + "/print-template-draft/stream"
                        + query;
        return outputStream -> aiWorkerClient.pipePost(path, null, outputStream);
    }

    @PostMapping(
            value = "/{jobPostingId}/print-template-draft/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody streamRevisePrintTemplateDraft(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @PathVariable Long templateId,
            @Valid @RequestBody PrintTemplateRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        String query = buildModelQuery(aiModel, customModelName);
        String path =
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/"
                        + jobPostingId
                        + "/print-template-draft/"
                        + templateId
                        + "/revise/stream"
                        + query;
        return outputStream -> aiWorkerClient.pipePost(path, request, outputStream);
    }

    private Long readWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER)
                .getWorkspace()
                .getId();
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

    private String buildModelQuery(String aiModel, String customModelName) {
        StringBuilder query = new StringBuilder();
        if (aiModel != null && !aiModel.isBlank()) {
            query.append("?aiModel=").append(aiModel);
        }
        if (customModelName != null && !customModelName.isBlank()) {
            query.append(query.length() == 0 ? "?" : "&")
                    .append("customModelName=")
                    .append(customModelName);
        }
        return query.toString();
    }
}
