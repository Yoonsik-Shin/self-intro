package com.selfintro.portfolio.presentation;

import com.selfintro.modules.portfolio.presentation.dto.PortfolioPrintDraftRevisionRequest;
import com.selfintro.portfolio.application.PortfolioPrintDraftService;
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
@RequiredArgsConstructor
@RequestMapping("/internal/workspaces/{workspaceId}/portfolio-documents")
public class PortfolioDocumentDraftController {

    private final PortfolioPrintDraftService portfolioPrintDraftService;

    @PostMapping(
            value = "/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter revise(
            @PathVariable Long workspaceId,
            @PathVariable Long templateId,
            @Valid @RequestBody PortfolioPrintDraftRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return portfolioPrintDraftService.reviseDocumentStream(
                workspaceId, templateId, request.feedbackInstruction(), aiModel, customModelName);
    }
}
