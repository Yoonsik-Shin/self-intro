package com.selfintro.modules.identity.publication.presentation.dto;

import java.util.List;

public record WorkspacePublicationHistoryResponse(
        List<WorkspacePublicationRevisionResponse> revisions,
        int maximumRetainedRevisions,
        long minimumRetentionDays) {}
