package com.selfintro.portfolio.presentation;

import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import com.selfintro.portfolio.application.PortfolioCaseStudyAiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/internal/workspaces/{workspaceId}/portfolio/case-studies/manage")
@RequiredArgsConstructor
public class WorkspacePortfolioCaseStudyAiWorkerController {

    private final PortfolioCaseStudyAiService portfolioCaseStudyAiService;

    @PostMapping(
            value = "/{caseStudyId}/revisions/generate",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generate(
            @PathVariable Long workspaceId,
            @PathVariable Long caseStudyId,
            @Valid @RequestBody PortfolioCaseStudyGenerateRequest request) {
        return portfolioCaseStudyAiService.generateStream(workspaceId, caseStudyId, request);
    }
}
