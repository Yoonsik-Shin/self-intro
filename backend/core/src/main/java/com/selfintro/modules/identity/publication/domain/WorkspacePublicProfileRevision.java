package com.selfintro.modules.identity.publication.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspace_public_profile_revision")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspacePublicProfileRevision {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private Long workspaceId;

    @Column(name = "revision_number", nullable = false, updatable = false)
    private int revisionNumber;

    @Column(name = "source_config_version", nullable = false, updatable = false)
    private int sourceConfigVersion;

    @Lob
    @Column(
            name = "content_json",
            nullable = false,
            columnDefinition = "LONGTEXT",
            updatable = false)
    private String contentJson;

    @Column(name = "created_by_user_id", updatable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static WorkspacePublicProfileRevision create(
            Long workspaceId,
            int revisionNumber,
            int sourceConfigVersion,
            String contentJson,
            Long createdByUserId,
            LocalDateTime now) {
        WorkspacePublicProfileRevision revision = new WorkspacePublicProfileRevision();
        revision.workspaceId = workspaceId;
        revision.revisionNumber = revisionNumber;
        revision.sourceConfigVersion = sourceConfigVersion;
        revision.contentJson = contentJson;
        revision.createdByUserId = createdByUserId;
        revision.createdAt = now;
        return revision;
    }
}
