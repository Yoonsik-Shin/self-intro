package com.selfintro.modules.portfolio.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioPrintDraftRevisionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}/portfolio/case-studies/manage")
public class WorkspacePortfolioCaseStudyPrintDraftProxyController {

    private final AiWorkerClient aiWorkerClient;

    @PostMapping(
            value = "/{caseStudyId}/print-draft/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody generatePrintDraftStream(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long caseStudyId,
            @RequestParam String orientation,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        String query = buildDraftQuery(orientation, aiModel, customModelName);
        String path =
                "/internal/workspaces/"
                        + workspaceId
                        + "/portfolio/case-studies/manage/"
                        + caseStudyId
                        + "/print-draft/stream"
                        + query;
        return outputStream -> aiWorkerClient.pipePost(path, null, outputStream);
    }

    @PostMapping(
            value = "/{caseStudyId}/print-draft/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody revisePrintDraftStream(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long caseStudyId,
            @PathVariable Long templateId,
            @Valid @RequestBody PortfolioPrintDraftRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        String query = buildModelQuery(aiModel, customModelName);
        String path =
                "/internal/workspaces/"
                        + workspaceId
                        + "/portfolio/case-studies/manage/"
                        + caseStudyId
                        + "/print-draft/"
                        + templateId
                        + "/revise/stream"
                        + query;
        return outputStream -> aiWorkerClient.pipePost(path, request, outputStream);
    }

    private String buildDraftQuery(String orientation, String aiModel, String customModelName) {
        StringBuilder query = new StringBuilder("?orientation=").append(orientation);
        if (aiModel != null && !aiModel.isBlank()) {
            query.append("&aiModel=").append(aiModel);
        }
        if (customModelName != null && !customModelName.isBlank()) {
            query.append("&customModelName=").append(customModelName);
        }
        return query.toString();
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
