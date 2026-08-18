package com.selfintro.modules.experience.presentation.dto;

import jakarta.validation.Valid;
import java.util.List;

public record ExperienceConnections(
        List<Long> studyIds,
        List<@Valid DetailStudies> detailStudies,
        List<@Valid RelatedExperienceRequest> relatedExperiences) {}
