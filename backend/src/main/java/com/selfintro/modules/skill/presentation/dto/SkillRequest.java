package com.selfintro.modules.skill.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SkillRequest(
        @NotBlank @Size(max = 80) String name,
        @NotBlank @Size(max = 50) String category,
        @Size(max = 40) String skillLevel,
        @Size(max = 60) String skillVersion,
        @Size(max = 500) String comment,
        @NotBlank @Size(max = 30) String usageType,
        @Size(max = 80) String badgeKey,
        @Pattern(regexp = "^([0-9A-Fa-f]{6})?$", message = "뱃지 색상은 6자리 HEX 값이어야 합니다.")
                String badgeColor,
        boolean isCore,
        int displayOrder) {}
