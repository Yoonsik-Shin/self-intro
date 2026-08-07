package com.selfintro.modules.printtemplate.presentation.dto;

import com.selfintro.modules.printtemplate.domain.entity.PrintTemplateRevision;
import java.time.LocalDateTime;

public record PrintTemplateRevisionResponse(
        Long id,
        Long printTemplateId,
        String senderType,
        String content,
        String aiModel,
        LocalDateTime createdAt) {
    public static PrintTemplateRevisionResponse from(PrintTemplateRevision entity) {
        return new PrintTemplateRevisionResponse(
                entity.getId(),
                entity.getPrintTemplateId(),
                entity.getSenderType(),
                entity.getContent(),
                entity.getAiModel(),
                entity.getCreatedAt());
    }
}
