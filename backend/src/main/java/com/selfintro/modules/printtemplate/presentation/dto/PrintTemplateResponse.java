package com.selfintro.modules.printtemplate.presentation.dto;

import com.selfintro.modules.printtemplate.domain.PrintTemplate;

public record PrintTemplateResponse(
        Long id,
        String name,
        String excludedIds,
        String sectionOrder,
        String sectionGaps,
        boolean visible,
        int displayOrder) {
    public static PrintTemplateResponse from(PrintTemplate entity) {
        return new PrintTemplateResponse(
                entity.getId(),
                entity.getName(),
                entity.getExcludedIds(),
                entity.getSectionOrder(),
                entity.getSectionGaps(),
                entity.isVisible(),
                entity.getDisplayOrder());
    }
}
