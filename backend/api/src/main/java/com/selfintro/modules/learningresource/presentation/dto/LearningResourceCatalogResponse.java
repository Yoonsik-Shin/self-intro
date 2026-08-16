package com.selfintro.modules.learningresource.presentation.dto;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomyNodeResponse;
import java.util.List;

public record LearningResourceCatalogResponse(
        Long id,
        String slug,
        String title,
        LearningResourceType resourceType,
        String provider,
        String url,
        String instructorOrAuthor,
        Integer durationMinutes,
        List<TaxonomyNodeResponse> taxonomyNodes,
        List<SkillResponse> skills,
        boolean saved) {

    public static LearningResourceCatalogResponse from(LearningResource resource, boolean saved) {
        return new LearningResourceCatalogResponse(
                resource.getId(),
                resource.getSlug(),
                resource.getTitle(),
                resource.getResourceType(),
                resource.getProvider(),
                resource.getUrl(),
                resource.getInstructorOrAuthor(),
                resource.getDurationMinutes(),
                resource.getTaxonomyNodes().stream().map(TaxonomyNodeResponse::from).toList(),
                resource.getSkills().stream().map(SkillResponse::from).toList(),
                saved);
    }
}
