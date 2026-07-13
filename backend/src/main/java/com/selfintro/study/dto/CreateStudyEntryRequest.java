package com.selfintro.study.dto;

import com.selfintro.study.entity.StudyCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record CreateStudyEntryRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 1200) String description,
        @NotNull StudyCategory category,
        @NotEmpty List<@NotBlank @Size(max = 60) String> skills,
        @NotBlank @Size(max = 800) String takeaway,
        @NotNull LocalDate learnedAt
) {
}
