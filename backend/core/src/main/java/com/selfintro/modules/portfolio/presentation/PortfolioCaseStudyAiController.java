package com.selfintro.modules.portfolio.presentation;

import com.selfintro.modules.portfolio.application.PortfolioCaseStudyAiService;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
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
@RequestMapping("/api/admin/portfolio/case-studies")
@RequiredArgsConstructor
public class PortfolioCaseStudyAiController {
    private final PortfolioCaseStudyAiService portfolioCaseStudyAiService;

    @PostMapping(
            value = "/{caseStudyId}/revisions/generate",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generate(
            @PathVariable Long caseStudyId,
            @Valid @RequestBody PortfolioCaseStudyGenerateRequest request) {
        return portfolioCaseStudyAiService.generateStream(caseStudyId, request);
    }
}
