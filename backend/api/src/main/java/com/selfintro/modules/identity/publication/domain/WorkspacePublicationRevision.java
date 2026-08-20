package com.selfintro.modules.identity.publication.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "workspace_publication_revision",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_workspace_publication_revision_number",
                        columnNames = {"workspace_id", "revision_number"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspacePublicationRevision {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private Long workspaceId;

    @Column(name = "revision_number", nullable = false, updatable = false)
    private int revisionNumber;

    @Column(name = "schema_version", nullable = false, updatable = false)
    private int schemaVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 20, updatable = false)
    private PublicationOperationType operationType;

    @Column(name = "source_revision_number", updatable = false)
    private Integer sourceRevisionNumber;

    @Column(name = "profile_revision_id", updatable = false)
    private Long profileRevisionId;

    @Column(name = "experience_revision_id", updatable = false)
    private Long experienceRevisionId;

    @Column(name = "draft_config_version", updatable = false)
    private Integer draftConfigVersion;

    @Column(name = "published_by_user_id", updatable = false)
    private Long publishedByUserId;

    @Column(name = "published_at", nullable = false, updatable = false)
    private LocalDateTime publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "pinned", nullable = false)
    private boolean pinned;

    @Column(name = "note", length = 500, updatable = false)
    private String note;

    public static WorkspacePublicationRevision create(
            Long workspaceId,
            int revisionNumber,
            int schemaVersion,
            PublicationOperationType operationType,
            Integer sourceRevisionNumber,
            Long profileRevisionId,
            Long experienceRevisionId,
            Integer draftConfigVersion,
            Long publishedByUserId,
            String note,
            LocalDateTime now) {
        WorkspacePublicationRevision revision = new WorkspacePublicationRevision();
        revision.workspaceId = workspaceId;
        revision.revisionNumber = revisionNumber;
        revision.schemaVersion = schemaVersion;
        revision.operationType = operationType;
        revision.sourceRevisionNumber = sourceRevisionNumber;
        revision.profileRevisionId = profileRevisionId;
        revision.experienceRevisionId = experienceRevisionId;
        revision.draftConfigVersion = draftConfigVersion;
        revision.publishedByUserId = publishedByUserId;
        revision.note = note;
        revision.publishedAt = now;
        revision.createdAt = now;
        return revision;
    }

    /** schema v1/v2 unit fixtures and compatibility callers. */
    public static WorkspacePublicationRevision create(
            Long workspaceId,
            int revisionNumber,
            int schemaVersion,
            PublicationOperationType operationType,
            Integer sourceRevisionNumber,
            Long publishedByUserId,
            LocalDateTime now) {
        return create(
                workspaceId,
                revisionNumber,
                schemaVersion,
                operationType,
                sourceRevisionNumber,
                null,
                null,
                null,
                publishedByUserId,
                null,
                now);
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }
}
