package com.selfintro.connections.dto;

import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceRelationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public final class ConnectionDtos {

    private ConnectionDtos() {}

    public record SkillConnections(
        List<Long> studyIds,
        List<Long> experienceIds,
        List<Long> experienceDetailIds
    ) {}

    public record ExperienceConnections(
        List<Long> studyIds,
        List<@Valid DetailStudies> detailStudies,
        List<@Valid RelatedExperienceRequest> relatedExperiences
    ) {}

    public record DetailStudies(
        @NotNull Long detailId,
        List<Long> studyIds
    ) {}

    public record RelatedExperienceRequest(
        @NotNull Long experienceId,
        @NotNull ExperienceRelationType type
    ) {}

    public record RelatedExperienceResponse(
        Long id,
        String type,
        String title,
        ExperienceRelationType relationType
    ) {
        public static RelatedExperienceResponse from(Experience experience, ExperienceRelationType relationType) {
            return new RelatedExperienceResponse(
                experience.getId(), experience.getType(), experience.getTitle(), relationType);
        }
    }
}
