package com.selfintro.modules.printtemplate.presentation.dto;

import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import java.time.LocalDateTime;
import java.util.function.Function;

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
        String source,
        String generationMetadata,
        LocalDateTime generatedAt,
        boolean visible,
        int displayOrder,
        Long jobPostingId,
        String documentType,
        Long portfolioCaseStudyId,
        String orientation,
        double lineHeight,
        boolean isFinalSubmission,
        String finalPdfUrl) {
    public static PrintTemplateResponse from(
            PrintTemplate entity, Function<String, String> urlResolver) {
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
                entity.getSource(),
                entity.getGenerationMetadata(),
                entity.getGeneratedAt(),
                entity.isVisible(),
                entity.getDisplayOrder(),
                entity.getJobPostingId(),
                entity.getDocumentType(),
                entity.getPortfolioCaseStudyId(),
                entity.getOrientation(),
                entity.getLineHeight(),
                entity.isFinalSubmission(),
                entity.getFinalPdfObjectKey() == null
                        ? null
                        : urlResolver.apply(entity.getFinalPdfObjectKey()));
    }

    public static PrintTemplateResponse fromPublic(PrintTemplate entity) {
        return from(entity, ignored -> null);
    }
}
