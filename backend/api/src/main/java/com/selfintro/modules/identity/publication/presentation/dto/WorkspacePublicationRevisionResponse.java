package com.selfintro.modules.identity.publication.presentation.dto;

import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevision;
import java.time.LocalDateTime;

public record WorkspacePublicationRevisionResponse(
        int revisionNumber,
        String operationType,
        Integer sourceRevisionNumber,
        Long profileRevisionId,
        Long experienceRevisionId,
        Integer draftConfigVersion,
        int schemaVersion,
        LocalDateTime publishedAt,
        boolean currentRevision,
        boolean rollbackAvailable) {

    public static WorkspacePublicationRevisionResponse from(
            WorkspacePublicationRevision revision,
            int currentRevisionNumber,
            int currentSchemaVersion) {
        boolean current = revision.getRevisionNumber() == currentRevisionNumber;
        return new WorkspacePublicationRevisionResponse(
                revision.getRevisionNumber(),
                revision.getOperationType().name(),
                revision.getSourceRevisionNumber(),
                revision.getProfileRevisionId(),
                revision.getExperienceRevisionId(),
                revision.getDraftConfigVersion(),
                revision.getSchemaVersion(),
                revision.getPublishedAt(),
                current,
                !current && revision.getSchemaVersion() == currentSchemaVersion);
    }
}
