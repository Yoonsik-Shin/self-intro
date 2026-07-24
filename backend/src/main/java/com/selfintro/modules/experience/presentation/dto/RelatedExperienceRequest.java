package com.selfintro.modules.experience.presentation.dto;

import com.selfintro.modules.experience.domain.enums.ExperienceRelationType;
import jakarta.validation.constraints.NotNull;

public record RelatedExperienceRequest(
        @NotNull Long experienceId, @NotNull ExperienceRelationType type) {}
