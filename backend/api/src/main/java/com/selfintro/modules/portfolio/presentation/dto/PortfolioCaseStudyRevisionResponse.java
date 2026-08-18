package com.selfintro.modules.portfolio.presentation.dto;

import java.time.LocalDateTime;

public record PortfolioCaseStudyRevisionResponse(
        Long id,
        Long caseStudyId,
        int version,
        String source,
        PortfolioCaseStudyContent content,
        String renderedMarkdown,
        LocalDateTime createdAt) {}
