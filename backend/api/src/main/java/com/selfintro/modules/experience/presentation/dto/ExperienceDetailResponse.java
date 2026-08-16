package com.selfintro.modules.experience.presentation.dto;

import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import java.util.List;

public record ExperienceDetailResponse(
        Long id,
        String content,
        String situation,
        String task,
        String actionDetail,
        String outcome,
        String narrative,
        boolean visible,
        boolean publicVisible,
        boolean resumeAvailable,
        int displayOrder,
        List<SkillResponse> skills) {
    public static ExperienceDetailResponse from(ExperienceDetail detail) {
        return new ExperienceDetailResponse(
                detail.getId(),
                detail.getContent(),
                detail.getSituation(),
                detail.getTask(),
                detail.getActionDetail(),
                detail.getOutcome(),
                detail.getNarrative(),
                detail.isPublicVisible(),
                detail.isPublicVisible(),
                detail.isResumeAvailable(),
                detail.getDisplayOrder(),
                detail.getSkills().stream().map(SkillResponse::fromCatalog).toList());
    }

    public ExperienceDetailResponse shown() {
        return new ExperienceDetailResponse(
                id,
                content,
                situation,
                task,
                actionDetail,
                outcome,
                narrative,
                true,
                publicVisible,
                resumeAvailable,
                displayOrder,
                skills);
    }
}
