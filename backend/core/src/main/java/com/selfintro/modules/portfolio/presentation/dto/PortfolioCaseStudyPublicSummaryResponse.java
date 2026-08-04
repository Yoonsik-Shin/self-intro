package com.selfintro.modules.portfolio.presentation.dto;

import java.time.LocalDateTime;

public record PortfolioCaseStudyPublicSummaryResponse(
        Long id, String slug, String title, String summary, LocalDateTime updatedAt) {}
