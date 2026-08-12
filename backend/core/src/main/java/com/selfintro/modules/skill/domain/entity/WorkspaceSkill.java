package com.selfintro.modules.skill.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "workspace_skill")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(name = "skill_level", length = 40)
    private String skillLevel;

    @Column(name = "skill_version", length = 60)
    private String skillVersion;

    @Column(name = "skill_comment", length = 500)
    private String comment;

    @Column(name = "usage_type", nullable = false, length = 30)
    private String usageType;

    @Column(name = "is_core", nullable = false)
    private boolean core;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static WorkspaceSkill create(
            Long workspaceId,
            Skill skill,
            String skillLevel,
            String skillVersion,
            String comment,
            String usageType,
            boolean core,
            int displayOrder) {
        WorkspaceSkill workspaceSkill = new WorkspaceSkill();
        workspaceSkill.workspaceId = workspaceId;
        workspaceSkill.skill = skill;
        workspaceSkill.update(skillLevel, skillVersion, comment, usageType, core, displayOrder);
        workspaceSkill.createdAt = workspaceSkill.updatedAt;
        return workspaceSkill;
    }

    public void update(
            String skillLevel,
            String skillVersion,
            String comment,
            String usageType,
            boolean core,
            int displayOrder) {
        this.skillLevel = skillLevel;
        this.skillVersion = skillVersion;
        this.comment = comment;
        this.usageType = usageType == null || usageType.isBlank() ? "LEARNING" : usageType;
        this.core = core;
        this.displayOrder = displayOrder;
        this.updatedAt = LocalDateTime.now();
    }
}
