package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.entity.GapProjectDocument;
import java.time.LocalDateTime;

public record GapProjectDocumentResponse(
        Long id,
        Long jobPostingId,
        int version,
        String title,
        String gapSnapshot,
        String contentJson,
        String renderedMarkdown,
        String status,
        LocalDateTime sourceAppealAnalyzedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static GapProjectDocumentResponse from(GapProjectDocument document) {
        return new GapProjectDocumentResponse(
                document.getId(),
                document.getJobPostingId(),
                document.getVersion(),
                document.getTitle(),
                document.getGapSnapshot(),
                document.getContentJson(),
                document.getRenderedMarkdown(),
                document.getStatus(),
                document.getSourceAppealAnalyzedAt(),
                document.getCreatedAt(),
                document.getUpdatedAt());
    }
}
