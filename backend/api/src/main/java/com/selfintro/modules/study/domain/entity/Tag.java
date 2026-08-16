package com.selfintro.modules.study.domain.entity;

import com.selfintro.modules.study.domain.enums.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "tag",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_tag_workspace_name",
                    columnNames = {"workspace_id", "name"}),
            @UniqueConstraint(
                    name = "uk_tag_workspace_slug",
                    columnNames = {"workspace_id", "slug"})
        })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 100)
    private String slug;

    private Tag(Long workspaceId, String name, String slug) {
        this.workspaceId = workspaceId;
        this.name = name;
        this.slug = slug;
    }

    public static Tag create(Long workspaceId, String name, String slug) {
        return new Tag(workspaceId, name, slug);
    }
}
