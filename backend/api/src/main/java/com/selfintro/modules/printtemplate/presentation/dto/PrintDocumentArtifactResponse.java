package com.selfintro.modules.printtemplate.presentation.dto;

import com.selfintro.modules.printtemplate.domain.entity.PrintDocumentArtifact;
import java.time.LocalDateTime;
import java.util.function.Function;

public record PrintDocumentArtifactResponse(
        Long id,
        Long printTemplateId,
        Long revisionId,
        Long jobPostingId,
        boolean current,
        String pdfUrl,
        String sha256Checksum,
        long contentLength,
        String contentType,
        String origin,
        String rendererVersion,
        String fontBundleVersion,
        Integer pageCount,
        String status,
        LocalDateTime generatedAt,
        LocalDateTime createdAt) {

    public static PrintDocumentArtifactResponse from(
            PrintDocumentArtifact artifact,
            Function<String, String> urlResolver,
            String currentObjectKey) {
        return new PrintDocumentArtifactResponse(
                artifact.getId(),
                artifact.getPrintTemplateId(),
                artifact.getPrintTemplateRevisionId(),
                artifact.getJobPostingId(),
                artifact.getObjectKey().equals(currentObjectKey),
                urlResolver.apply(artifact.getObjectKey()),
                artifact.getSha256Checksum(),
                artifact.getContentLength(),
                artifact.getContentType(),
                artifact.getOrigin(),
                artifact.getRendererVersion(),
                artifact.getFontBundleVersion(),
                artifact.getPageCount(),
                artifact.getStatus(),
                artifact.getGeneratedAt(),
                artifact.getCreatedAt());
    }
}
