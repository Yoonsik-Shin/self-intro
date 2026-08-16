package com.selfintro.modules.portfolio.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/portfolio/case-studies/manage")
@RequiredArgsConstructor
public class WorkspacePortfolioCaseStudyAiController {

    private final AiWorkerClient aiWorkerClient;

    @PostMapping(
            value = "/{caseStudyId}/revisions/generate",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody generate(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long caseStudyId,
            @Valid @RequestBody PortfolioCaseStudyGenerateRequest request) {
        String path =
                "/internal/workspaces/"
                        + workspaceId
                        + "/portfolio/case-studies/manage/"
                        + caseStudyId
                        + "/revisions/generate";
        return outputStream -> aiWorkerClient.pipePost(path, request, outputStream);
    }
}
