package com.selfintro.modules.jobposting.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.aiusage.application.AiExecutionCommand;
import com.selfintro.modules.aiusage.application.AiExecutionService;
import com.selfintro.modules.aiusage.application.AiFeature;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.presentation.dto.GapProjectDocumentResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationImageParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobposting.presentation.dto.PrintTemplateRevisionRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotParseRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobApplicationAiProxyController {

    private final AiWorkerClient aiWorkerClient;
    private final AiExecutionService aiExecutionService;
    private final WorkspaceJobScreenshotUploadService screenshotUploadService;

    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            @CurrentWorkspace WorkspaceMember member,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        return aiExecutionService.execute(
                command(member, "JOB_APPLICATION_PARSE_URL", 50, consentVersion),
                () ->
                        aiWorkerClient.post(
                                "/internal/workspaces/"
                                        + workspaceId
                                        + "/job-applications/manage/parse-url",
                                request,
                                JobApplicationUrlParseResponse.class));
    }

    @PostMapping("/parse-screenshots")
    public JobApplicationUrlParseResponse parseScreenshots(
            @CurrentWorkspace WorkspaceMember member,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody WorkspaceJobScreenshotParseRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        List<WorkspaceJobScreenshotUploadService.ClaimedUpload> uploads =
                screenshotUploadService.claim(workspaceId, request.uploadIds());
        try {
            List<JobApplicationImageParseRequest.ImagePart> images =
                    uploads.stream()
                            .map(
                                    upload ->
                                            new JobApplicationImageParseRequest.ImagePart(
                                                    screenshotUploadService.read(upload),
                                                    upload.contentType()))
                            .toList();
            return aiExecutionService.execute(
                    command(member, "JOB_APPLICATION_PARSE_SCREENSHOTS", 80, consentVersion),
                    () ->
                            aiWorkerClient.post(
                                    "/internal/workspaces/"
                                            + workspaceId
                                            + "/job-applications/manage/parse-images",
                                    new JobApplicationImageParseRequest(images),
                                    JobApplicationUrlParseResponse.class));
        } finally {
            screenshotUploadService.deleteClaimed(workspaceId, uploads);
        }
    }

    @PostMapping("/{jobPostingId}/generate-cover-letter-draft")
    public JobPostingCoverLetterDraftResponse generateCoverLetterDraft(
            @CurrentWorkspace WorkspaceMember member,
            @PathVariable Long jobPostingId,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody JobPostingCoverLetterDraftRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        return aiExecutionService.execute(
                command(member, "JOB_COVER_LETTER_DRAFT", 100, consentVersion),
                () ->
                        aiWorkerClient.post(
                                "/internal/workspaces/"
                                        + workspaceId
                                        + "/job-applications/manage/"
                                        + jobPostingId
                                        + "/generate-cover-letter-draft",
                                request,
                                JobPostingCoverLetterDraftResponse.class));
    }

    @PostMapping("/{jobPostingId}/analyze-appeal")
    public JobPostingResponse analyzeAppeal(
            @CurrentWorkspace WorkspaceMember member,
            @PathVariable Long jobPostingId,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = member.getWorkspace().getId();
        String query = buildModelQuery(aiModel, customModelName);
        return aiExecutionService.execute(
                command(member, "JOB_APPEAL_ANALYSIS", 80, consentVersion),
                () ->
                        aiWorkerClient.post(
                                "/internal/workspaces/"
                                        + workspaceId
                                        + "/job-applications/manage/"
                                        + jobPostingId
                                        + "/analyze-appeal"
                                        + query,
                                null,
                                JobPostingResponse.class));
    }

    @PostMapping("/{jobPostingId}/rematch")
    public JobPostingResponse rematch(
            @CurrentWorkspace WorkspaceMember member,
            @PathVariable Long jobPostingId,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion) {
        Long workspaceId = member.getWorkspace().getId();
        return aiExecutionService.execute(
                command(member, "JOB_REMATCH", 50, consentVersion),
                () ->
                        aiWorkerClient.post(
                                "/internal/workspaces/"
                                        + workspaceId
                                        + "/job-applications/manage/"
                                        + jobPostingId
                                        + "/rematch",
                                null,
                                JobPostingResponse.class));
    }

    @GetMapping("/{jobPostingId}/gap-project-documents")
    public List<GapProjectDocumentResponse> listGapDocuments(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable Long jobPostingId) {
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
            @CurrentWorkspace WorkspaceMember member,
            @PathVariable Long jobPostingId,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = member.getWorkspace().getId();
        String query = buildModelQuery(aiModel, customModelName);
        return aiExecutionService.execute(
                command(member, "JOB_GAP_PROJECT_DOCUMENT", 100, consentVersion),
                () ->
                        aiWorkerClient.post(
                                "/internal/workspaces/"
                                        + workspaceId
                                        + "/job-applications/manage/"
                                        + jobPostingId
                                        + "/gap-project-documents"
                                        + query,
                                null,
                                GapProjectDocumentResponse.class));
    }

    @PostMapping(
            value = "/{jobPostingId}/print-template-draft/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody streamPrintTemplateDraft(
            @CurrentWorkspace WorkspaceMember member,
            @PathVariable Long jobPostingId,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = member.getWorkspace().getId();
        String query = buildModelQuery(aiModel, customModelName);
        String path =
                "/internal/workspaces/"
                        + workspaceId
                        + "/job-applications/manage/"
                        + jobPostingId
                        + "/print-template-draft/stream"
                        + query;
        return outputStream ->
                aiExecutionService.executeVoid(
                        command(
                                member,
                                "JOB_PRINT_TEMPLATE_DRAFT",
                                "JOB_PRINT_TEMPLATE:" + jobPostingId,
                                false,
                                100,
                                consentVersion),
                        () -> aiWorkerClient.pipePost(path, null, outputStream));
    }

    @PostMapping(
            value = "/{jobPostingId}/print-template-draft/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody streamRevisePrintTemplateDraft(
            @CurrentWorkspace WorkspaceMember member,
            @PathVariable Long jobPostingId,
            @PathVariable Long templateId,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody PrintTemplateRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = member.getWorkspace().getId();
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
        return outputStream ->
                aiExecutionService.executeVoid(
                        command(
                                member,
                                "JOB_PRINT_TEMPLATE_REVISE",
                                "JOB_PRINT_TEMPLATE:" + jobPostingId,
                                true,
                                30,
                                consentVersion),
                        () -> aiWorkerClient.pipePost(path, request, outputStream));
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

    private AiExecutionCommand command(
            WorkspaceMember member, String operation, int points, String consentVersion) {
        return command(member, operation, operation, false, points, consentVersion);
    }

    private AiExecutionCommand command(
            WorkspaceMember member,
            String operation,
            String sessionKey,
            boolean refinement,
            int points,
            String consentVersion) {
        return new AiExecutionCommand(
                member.getWorkspace().getId(),
                member.getUser().getId(),
                AiFeature.JOB_SUPPORT,
                operation,
                sessionKey,
                refinement,
                points,
                consentVersion,
                Set.of("JOB_POSTING", "EXPERIENCE", "STUDY", "COMPETENCY", "USER_INSTRUCTION"));
    }
}
