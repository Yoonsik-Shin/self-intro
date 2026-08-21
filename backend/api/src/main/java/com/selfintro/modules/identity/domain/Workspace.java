package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspace")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_key", nullable = false, unique = true, columnDefinition = "BINARY(16)")
    private UUID publicKey;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(name = "workspace_type", nullable = false, length = 20)
    private WorkspaceType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkspaceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "publication_status", nullable = false, length = 20)
    private WorkspacePublicationStatus publicationStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deletion_requested_by_user_id")
    private Long deletionRequestedByUserId;

    @Column(name = "purge_after")
    private LocalDateTime purgeAfter;

    public static Workspace createPersonal(String name, String slug) {
        Workspace workspace = new Workspace();
        workspace.publicKey = UUID.randomUUID();
        workspace.name = name;
        workspace.slug = slug;
        workspace.type = WorkspaceType.PERSONAL;
        workspace.status = WorkspaceStatus.ACTIVE;
        workspace.publicationStatus = WorkspacePublicationStatus.PUBLISHED;
        workspace.createdAt = LocalDateTime.now();
        workspace.updatedAt = workspace.createdAt;
        return workspace;
    }

    public static Workspace createPrivatePersonal(String name) {
        Workspace workspace = new Workspace();
        workspace.publicKey = UUID.randomUUID();
        workspace.name = name;
        workspace.slug = provisionalSlug();
        workspace.type = WorkspaceType.PERSONAL;
        workspace.status = WorkspaceStatus.ACTIVE;
        workspace.publicationStatus = WorkspacePublicationStatus.PRIVATE;
        workspace.createdAt = LocalDateTime.now();
        workspace.updatedAt = workspace.createdAt;
        return workspace;
    }

    private static String provisionalSlug() {
        return "w-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
    }

    public void rename(String name) {
        this.name = name;
        this.updatedAt = LocalDateTime.now();
    }

    public void changeType(WorkspaceType type) {
        this.type = type;
        this.updatedAt = LocalDateTime.now();
    }

    public void close(Long requestedByUserId, LocalDateTime now, LocalDateTime purgeAfter) {
        if (status != WorkspaceStatus.ACTIVE) {
            throw new IllegalStateException("활성 Workspace만 폐쇄할 수 있습니다.");
        }
        this.status = WorkspaceStatus.DELETED;
        this.publicationStatus = WorkspacePublicationStatus.PRIVATE;
        this.deletedAt = now;
        this.deletionRequestedByUserId = requestedByUserId;
        this.purgeAfter = purgeAfter;
        this.updatedAt = now;
    }

    public void changeSlug(String slug) {
        this.slug = slug;
        this.updatedAt = LocalDateTime.now();
    }

    public void publish() {
        this.publicationStatus = WorkspacePublicationStatus.PUBLISHED;
        this.updatedAt = LocalDateTime.now();
    }

    public void unpublish() {
        this.publicationStatus = WorkspacePublicationStatus.PRIVATE;
        this.updatedAt = LocalDateTime.now();
    }
}
