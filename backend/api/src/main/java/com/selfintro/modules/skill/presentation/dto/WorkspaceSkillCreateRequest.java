package com.selfintro.modules.skill.presentation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record WorkspaceSkillCreateRequest(
        @NotNull Long catalogSkillId,
        @Size(max = 40) String skillLevel,
        @Size(max = 60) String skillVersion,
        @Size(max = 500) String comment,
        @Size(max = 30) String usageType,
        boolean isCore,
        int displayOrder) {}
