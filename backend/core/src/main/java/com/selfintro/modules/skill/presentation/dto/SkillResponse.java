package com.selfintro.modules.skill.presentation.dto;

import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.entity.WorkspaceSkill;

public record SkillResponse(
        Long id,
        String name,
        String category,
        String skillLevel,
        String skillVersion,
        String comment,
        String usageType,
        String badgeKey,
        String badgeColor,
        boolean isCore,
        int displayOrder) {
    public static SkillResponse from(Skill skill) {
        return new SkillResponse(
                skill.getId(),
                skill.getName(),
                skill.getCategory(),
                skill.getSkillLevel(),
                skill.getSkillVersion(),
                skill.getComment(),
                skill.getUsageType(),
                skill.getBadgeKey(),
                skill.getBadgeColor(),
                skill.isCore(),
                skill.getDisplayOrder());
    }

    public static SkillResponse from(WorkspaceSkill workspaceSkill) {
        Skill skill = workspaceSkill.getSkill();
        return new SkillResponse(
                skill.getId(),
                skill.getName(),
                skill.getCategory(),
                workspaceSkill.getSkillLevel(),
                workspaceSkill.getSkillVersion(),
                workspaceSkill.getComment(),
                workspaceSkill.getUsageType(),
                skill.getBadgeKey(),
                skill.getBadgeColor(),
                workspaceSkill.isCore(),
                workspaceSkill.getDisplayOrder());
    }

    /** Experience·Study 연결에서는 공통 기술 정의만 노출하고 다른 Workspace의 표현값은 숨긴다. */
    public static SkillResponse fromCatalog(Skill skill) {
        return new SkillResponse(
                skill.getId(),
                skill.getName(),
                skill.getCategory(),
                null,
                null,
                null,
                "CATALOG",
                skill.getBadgeKey(),
                skill.getBadgeColor(),
                false,
                0);
    }
}
