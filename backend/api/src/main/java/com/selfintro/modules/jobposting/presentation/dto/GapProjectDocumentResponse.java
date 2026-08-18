package com.selfintro.modules.jobposting.presentation.dto;

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
        LocalDateTime updatedAt) {}
