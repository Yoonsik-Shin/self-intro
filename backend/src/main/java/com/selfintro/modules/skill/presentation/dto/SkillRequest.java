package com.selfintro.modules.skill.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SkillRequest(
    @NotBlank @Size(max = 80) String name,
    @NotBlank @Size(max = 50) String category,
    @Size(max = 40) String skillLevel,
    boolean isCore,
    int displayOrder
) {}
