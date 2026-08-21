package com.selfintro.modules.portfolio.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.aiusage.application.AiExecutionCommand;
import com.selfintro.modules.aiusage.application.AiExecutionService;
import com.selfintro.modules.aiusage.application.AiFeature;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import jakarta.validation.Valid;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/portfolio/case-studies/manage")
@RequiredArgsConstructor
public class WorkspacePortfolioCaseStudyAiController {

    private final AiWorkerClient aiWorkerClient;
    private final AiExecutionService aiExecutionService;

    @PostMapping(
            value = "/{caseStudyId}/revisions/generate",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody generate(
            @CurrentWorkspace WorkspaceMember member,
            @PathVariable Long caseStudyId,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody PortfolioCaseStudyGenerateRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        String path =
                "/internal/workspaces/"
                        + workspaceId
                        + "/portfolio/case-studies/manage/"
                        + caseStudyId
                        + "/revisions/generate";
        AiExecutionCommand command =
                new AiExecutionCommand(
                        workspaceId,
                        member.getUser().getId(),
                        AiFeature.PORTFOLIO_CASE,
                        "PORTFOLIO_CASE_REVISION_GENERATE",
                        "PORTFOLIO_CASE:" + caseStudyId,
                        request.baseRevisionId() != null || request.currentDraft() != null,
                        100,
                        consentVersion,
                        Set.of(
                                "PORTFOLIO_CASE",
                                "EXPERIENCE",
                                "STUDY",
                                "COMPETENCY",
                                "USER_INSTRUCTION"));
        return outputStream ->
                aiExecutionService.executeVoid(
                        command, () -> aiWorkerClient.pipePost(path, request, outputStream));
    }
}
