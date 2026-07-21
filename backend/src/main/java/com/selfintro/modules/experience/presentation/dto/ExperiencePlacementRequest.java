package com.selfintro.modules.experience.presentation.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ExperiencePlacementRequest(
        @NotNull Long experienceId, int displayOrder, boolean enabled, List<Long> detailIds) {
    public ExperiencePlacementRequest(Long experienceId, int displayOrder, boolean enabled) {
        this(experienceId, displayOrder, enabled, null);
    }
}
