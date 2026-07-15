package com.selfintro.study.dto;

import com.selfintro.study.entity.StudyStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record StudyRequest(
        @Size(max = 160) String slug,
        @NotBlank @Size(max = 160) String title,
        @NotBlank @Size(max = 500) String summary,
        @NotBlank String contentMarkdown,
        @NotNull StudyStatus status,
        @NotNull Long categoryId,
        List<@NotBlank @Size(max = 80) String> tagNames,
        List<Long> skillIds,
        List<Long> experienceIds,
        List<Long> experienceDetailIds,
        List<@Valid StudyRelationRequest> relatedStudies,
        List<@Valid StudyImageRequest> images,
        @NotNull LocalDate learnedAt,
        LocalDateTime publishedAt
) {
}
