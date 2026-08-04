package com.selfintro.modules.portfolio.presentation.dto;

import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import java.time.LocalDateTime;

public record PortfolioCaseStudyResponse(
        Long id,
        Long experienceId,
        String slug,
        String title,
        String status,
        Long publishedRevisionId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    public static PortfolioCaseStudyResponse from(PortfolioCaseStudy value) {
        return new PortfolioCaseStudyResponse(
                value.getId(),
                value.getExperienceId(),
                value.getSlug(),
                value.getTitle(),
                value.getStatus(),
                value.getPublishedRevisionId(),
                value.getCreatedAt(),
                value.getUpdatedAt());
    }
}
