package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspace_slug_alias")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceSlugAlias {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(name = "alias_type", nullable = false, length = 20)
    private WorkspaceSlugAliasType aliasType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "retired_at")
    private LocalDateTime retiredAt;

    public static WorkspaceSlugAlias canonical(Long workspaceId, String slug) {
        return create(workspaceId, slug, WorkspaceSlugAliasType.CANONICAL);
    }

    public static WorkspaceSlugAlias alias(Long workspaceId, String slug) {
        return create(workspaceId, slug, WorkspaceSlugAliasType.ALIAS);
    }

    private static WorkspaceSlugAlias create(
            Long workspaceId, String slug, WorkspaceSlugAliasType aliasType) {
        WorkspaceSlugAlias alias = new WorkspaceSlugAlias();
        alias.workspaceId = workspaceId;
        alias.slug = slug;
        alias.aliasType = aliasType;
        alias.createdAt = LocalDateTime.now();
        return alias;
    }

    public void makeCanonical() {
        this.aliasType = WorkspaceSlugAliasType.CANONICAL;
        this.retiredAt = null;
    }

    public void makeAlias() {
        this.aliasType = WorkspaceSlugAliasType.ALIAS;
        this.retiredAt = null;
    }
}
