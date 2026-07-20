package com.selfintro.modules.experience.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ExperienceDetailNarrativeRequest(
    @NotBlank @Size(max = 500) String content,
    String situation,
    String actionDetail,
    String outcome
) {}
