package com.selfintro.modules.identity.publication.presentation.dto;

import java.util.List;

public record PublicExperienceDraft(
        List<ExperienceSelection> experiences,
        List<DetailSelection> details,
        List<PlacementSelection> placements,
        List<PortfolioSelection> portfolios) {

    public record ExperienceSelection(
            Long id,
            String title,
            boolean enabled,
            int displayOrder,
            boolean showOnTimeline,
            String timelineLabel) {}

    public record DetailSelection(
            Long id, Long experienceId, String label, boolean enabled, int displayOrder) {}

    public record PlacementSelection(
            Long experienceId, String placementType, boolean enabled, int displayOrder) {}

    public record PortfolioSelection(Long id, String title, boolean enabled, int displayOrder) {}
}
