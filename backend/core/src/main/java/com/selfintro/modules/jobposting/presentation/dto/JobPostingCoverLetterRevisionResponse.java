package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.JobPostingCoverLetterRevision;
import java.time.LocalDateTime;

public record JobPostingCoverLetterRevisionResponse(
        Long id,
        Long coverLetterItemId,
        String senderType,
        String content,
        String aiModel,
        LocalDateTime createdAt
) {
    public static JobPostingCoverLetterRevisionResponse from(JobPostingCoverLetterRevision entity) {
        return new JobPostingCoverLetterRevisionResponse(
                entity.getId(),
                entity.getCoverLetterItemId(),
                entity.getSenderType(),
                entity.getContent(),
                entity.getAiModel(),
                entity.getCreatedAt()
        );
    }
}
