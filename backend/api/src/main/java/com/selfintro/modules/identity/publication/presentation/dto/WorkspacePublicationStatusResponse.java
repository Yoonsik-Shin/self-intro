package com.selfintro.modules.identity.publication.presentation.dto;

import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevision;
import java.time.LocalDateTime;

public record WorkspacePublicationStatusResponse(
        String publicationStatus,
        Integer revisionNumber,
        LocalDateTime publishedAt,
        boolean hasPublishedRevision) {
    public static WorkspacePublicationStatusResponse from(
            Workspace workspace, WorkspacePublicationRevision revision) {
        return new WorkspacePublicationStatusResponse(
                workspace.getPublicationStatus().name(),
                revision == null ? null : revision.getRevisionNumber(),
                revision == null ? null : revision.getPublishedAt(),
                revision != null);
    }
}
