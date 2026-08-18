package com.selfintro.modules.dashboard.presentation.dto;

import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationStatusResponse;

public record WorkspaceDashboardSummaryResponse(
        long experienceCount,
        long studyCount,
        long skillCount,
        long competencyCount,
        long jobApplicationCount,
        WorkspacePublicationStatusResponse publicationStatus) {}
