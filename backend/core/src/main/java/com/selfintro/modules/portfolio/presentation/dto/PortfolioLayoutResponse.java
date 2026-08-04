package com.selfintro.modules.portfolio.presentation.dto;

import com.selfintro.modules.portfolio.domain.entity.PortfolioLayout;
import java.time.LocalDateTime;

public record PortfolioLayoutResponse(
        Long id,
        Long caseStudyId,
        String orientation,
        String name,
        String source,
        String excludedIdsJson,
        String sectionOrderJson,
        String sectionGapsJson,
        String itemOrderOverridesJson,
        String forcedPageOverridesJson,
        String contentOverridesJson,
        boolean isDefault,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    public static PortfolioLayoutResponse from(PortfolioLayout value) {
        return new PortfolioLayoutResponse(
                value.getId(),
                value.getCaseStudyId(),
                value.getOrientation(),
                value.getName(),
                value.getSource(),
                value.getExcludedIdsJson(),
                value.getSectionOrderJson(),
                value.getSectionGapsJson(),
                value.getItemOrderOverridesJson(),
                value.getForcedPageOverridesJson(),
                value.getContentOverridesJson(),
                value.isDefault(),
                value.getCreatedAt(),
                value.getUpdatedAt());
    }
}
