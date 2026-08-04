package com.selfintro.modules.portfolio.presentation.dto;

import java.time.LocalDateTime;

public record PortfolioCaseStudyPublicResponse(
        Long id,
        String slug,
        String title,
        Long experienceId,
        PortfolioCaseStudyContent content,
        String renderedMarkdown,
        LocalDateTime updatedAt) {}
