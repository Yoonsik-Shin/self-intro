package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingCoverLetterItem;
import java.time.LocalDateTime;

public record JobPostingCoverLetterItemResponse(
        Long id,
        String question,
        String answer,
        Integer characterLimit,
        int displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static JobPostingCoverLetterItemResponse from(JobPostingCoverLetterItem entity) {
        return new JobPostingCoverLetterItemResponse(
                entity.getId(),
                entity.getQuestion(),
                entity.getAnswer(),
                entity.getCharacterLimit(),
                entity.getDisplayOrder(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
