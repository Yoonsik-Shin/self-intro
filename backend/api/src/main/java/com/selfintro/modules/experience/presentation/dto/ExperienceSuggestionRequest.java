package com.selfintro.modules.experience.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ExperienceSuggestionRequest(
        @Size(max = 1000) String instruction,
        @NotBlank String type,
        @Size(max = 150) String draftTitle,
        String companyName,
        String role,
        String institutionName,
        String issuer,
        String repositoryUrl,
        @NotNull List<Long> skillIds,
        @NotNull List<Long> studyIds,
        @NotNull List<Long> relatedExperienceIds) {}
