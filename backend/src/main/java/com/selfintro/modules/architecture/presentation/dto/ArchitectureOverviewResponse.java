package com.selfintro.modules.architecture.presentation.dto;

import com.selfintro.modules.architecture.domain.ArchitectureOverview;

public record ArchitectureOverviewResponse(
        Long id, String heading, String subheading, String diagramHeading, String diagramText) {
    public static ArchitectureOverviewResponse from(ArchitectureOverview overview) {
        return new ArchitectureOverviewResponse(
                overview.getId(),
                overview.getHeading(),
                overview.getSubheading(),
                overview.getDiagramHeading(),
                overview.getDiagramText());
    }
}
