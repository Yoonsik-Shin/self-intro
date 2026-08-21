package com.selfintro.modules.portfolio.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.aiusage.application.AiExecutionCommand;
import com.selfintro.modules.aiusage.application.AiExecutionService;
import com.selfintro.modules.aiusage.application.AiFeature;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioPrintDraftRevisionRequest;
import jakarta.validation.Valid;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}/portfolio-documents/manage")
public class WorkspacePortfolioDocumentDraftProxyController {

    private final AiWorkerClient aiWorkerClient;
    private final AiExecutionService aiExecutionService;

    @PostMapping(
            value = "/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody revise(
            @CurrentWorkspace WorkspaceMember member,
            @PathVariable Long templateId,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody PortfolioPrintDraftRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        Long workspaceId = member.getWorkspace().getId();
        String path =
                "/internal/workspaces/"
                        + workspaceId
                        + "/portfolio-documents/"
                        + templateId
                        + "/revise/stream"
                        + buildModelQuery(aiModel, customModelName);
        AiExecutionCommand command =
                new AiExecutionCommand(
                        workspaceId,
                        member.getUser().getId(),
                        AiFeature.PDF_OUTPUT,
                        "PORTFOLIO_DOCUMENT_REVISE",
                        "PORTFOLIO_DOCUMENT:" + templateId,
                        true,
                        30,
                        consentVersion,
                        Set.of("PORTFOLIO_DOCUMENT", "USER_INSTRUCTION"));
        return outputStream ->
                aiExecutionService.executeVoid(
                        command, () -> aiWorkerClient.pipePost(path, request, outputStream));
    }

    private String buildModelQuery(String aiModel, String customModelName) {
        StringBuilder query = new StringBuilder();
        appendQuery(query, "aiModel", aiModel);
        appendQuery(query, "customModelName", customModelName);
        return query.toString();
    }

    private void appendQuery(StringBuilder query, String key, String value) {
        if (value == null || value.isBlank()) return;
        query.append(query.length() == 0 ? "?" : "&")
                .append(key)
                .append("=")
                .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
    }
}
