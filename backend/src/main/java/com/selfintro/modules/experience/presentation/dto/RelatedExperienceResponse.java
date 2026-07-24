package com.selfintro.modules.experience.presentation.dto;

import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.enums.ExperienceRelationType;

public record RelatedExperienceResponse(
        Long id, String type, String title, ExperienceRelationType relationType) {
    public static RelatedExperienceResponse from(
            Experience experience, ExperienceRelationType relationType) {
        return new RelatedExperienceResponse(
                experience.getId(), experience.getType(), experience.getTitle(), relationType);
    }
}
