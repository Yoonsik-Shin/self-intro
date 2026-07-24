package com.selfintro.modules.printtemplate.presentation.dto;

import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;

public record PrintTemplateResponse(
        Long id,
        String name,
        String excludedIds,
        String sectionOrder,
        String sectionGaps,
        String targetRole,
        String contentOverrides,
        String baseContentFingerprint,
        int schemaVersion,
        boolean visible,
        int displayOrder) {
    public static PrintTemplateResponse from(PrintTemplate entity) {
        return new PrintTemplateResponse(
                entity.getId(),
                entity.getName(),
                entity.getExcludedIds(),
                entity.getSectionOrder(),
                entity.getSectionGaps(),
                entity.getTargetRole(),
                entity.getContentOverrides(),
                entity.getBaseContentFingerprint(),
                entity.getSchemaVersion(),
                entity.isVisible(),
                entity.getDisplayOrder());
    }
}
