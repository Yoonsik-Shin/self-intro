package com.selfintro.modules.experience.presentation.dto;

import com.selfintro.modules.experience.domain.ExperiencePlacement;
import java.util.List;

public record ExperiencePlacementResponse(
    Long id,
    Long experienceId,
    String placementType,
    int displayOrder,
    boolean enabled,
    List<Long> detailIds
) {
    public static ExperiencePlacementResponse from(ExperiencePlacement placement, List<Long> detailIds) {
        return new ExperiencePlacementResponse(
            placement.getId(),
            placement.getExperience().getId(),
            placement.getPlacementType().name(),
            placement.getDisplayOrder(),
            placement.isEnabled(),
            detailIds
        );
    }
}
