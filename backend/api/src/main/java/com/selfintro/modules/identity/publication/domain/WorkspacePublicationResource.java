package com.selfintro.modules.identity.publication.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "workspace_publication_resource",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_workspace_publication_resource",
                        columnNames = {"revision_id", "resource_type", "resource_key"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspacePublicationResource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "revision_id", nullable = false, updatable = false)
    private Long revisionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", nullable = false, length = 40, updatable = false)
    private PublicationResourceType resourceType;

    @Column(name = "resource_key", nullable = false, length = 190, updatable = false)
    private String resourceKey;

    @Lob
    @Column(
            name = "content_json",
            nullable = false,
            columnDefinition = "LONGTEXT",
            updatable = false)
    private String contentJson;

    public static WorkspacePublicationResource create(
            Long revisionId,
            PublicationResourceType resourceType,
            String resourceKey,
            String contentJson) {
        WorkspacePublicationResource resource = new WorkspacePublicationResource();
        resource.revisionId = revisionId;
        resource.resourceType = resourceType;
        resource.resourceKey = resourceKey;
        resource.contentJson = contentJson;
        return resource;
    }
}
