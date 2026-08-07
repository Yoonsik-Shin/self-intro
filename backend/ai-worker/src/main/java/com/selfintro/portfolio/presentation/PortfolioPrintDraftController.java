package com.selfintro.portfolio.presentation;

import com.selfintro.portfolio.application.PortfolioPrintDraftService;
import com.selfintro.portfolio.presentation.dto.PortfolioPrintDraftRevisionRequest;
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
@RequestMapping("/api/worker/portfolio/case-studies")
public class PortfolioPrintDraftController {

    private final PortfolioPrintDraftService portfolioPrintDraftService;

    @PostMapping(
            value = "/{caseStudyId}/print-draft/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generatePrintDraftStream(
            @PathVariable Long caseStudyId,
            @RequestParam String orientation,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return portfolioPrintDraftService.generateStream(
                caseStudyId, orientation, aiModel, customModelName);
    }

    @PostMapping(
            value = "/{caseStudyId}/print-draft/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter revisePrintDraftStream(
            @PathVariable Long caseStudyId,
            @PathVariable Long templateId,
            @Valid @RequestBody PortfolioPrintDraftRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return portfolioPrintDraftService.reviseStream(
                caseStudyId, templateId, request.feedbackInstruction(), aiModel, customModelName);
    }
}
