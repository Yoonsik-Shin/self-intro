package com.selfintro.modules.skill.presentation.dto;

import com.selfintro.modules.skill.domain.Skill;

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
}
