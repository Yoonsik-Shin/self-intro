package com.selfintro.modules.learningresource.presentation.dto;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceCategory;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceRelation;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceRelationType;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.modules.study.domain.entity.Tag;
import java.time.LocalDateTime;
import java.util.List;

public record LearningResourceResponse(
        Long id,
        String slug,
        String title,
        LearningResourceType resourceType,
        String provider,
        String url,
        String instructorOrAuthor,
        Integer durationMinutes,
        LearningResourceStatus status,
        LearningResourcePriorityTier priorityTier,
        int displayOrder,
        CategoryResponse category,
        String summary,
        String detailMarkdown,
        List<TagResponse> tags,
        List<SkillResponse> skills,
        List<RelatedResourceResponse> relatedResources,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    public static LearningResourceResponse from(LearningResource resource) {
        return new LearningResourceResponse(
                resource.getId(),
                resource.getSlug(),
                resource.getTitle(),
                resource.getResourceType(),
                resource.getProvider(),
                resource.getUrl(),
                resource.getInstructorOrAuthor(),
                resource.getDurationMinutes(),
                resource.getStatus(),
                resource.getPriorityTier(),
                resource.getDisplayOrder(),
                CategoryResponse.from(resource.getCategory()),
                resource.getSummary(),
                resource.getDetailMarkdown(),
                resource.getTags().stream().map(TagResponse::from).toList(),
                resource.getSkills().stream().map(SkillResponse::from).toList(),
                resource.getRelations().stream().map(RelatedResourceResponse::from).toList(),
                resource.getCreatedAt(),
                resource.getUpdatedAt());
    }

    public record CategoryResponse(Long id, String name, String slug, int displayOrder) {
        public static CategoryResponse from(LearningResourceCategory category) {
            return new CategoryResponse(
                    category.getId(),
                    category.getName(),
                    category.getSlug(),
                    category.getDisplayOrder());
        }
    }

    public record TagResponse(Long id, String name, String slug) {
        public static TagResponse from(Tag tag) {
            return new TagResponse(tag.getId(), tag.getName(), tag.getSlug());
        }
    }

    public record RelatedResourceResponse(
            Long id, String slug, String title, LearningResourceRelationType type) {
        public static RelatedResourceResponse from(LearningResourceRelation relation) {
            LearningResource target = relation.getTarget();
            return new RelatedResourceResponse(
                    target.getId(), target.getSlug(), target.getTitle(), relation.getType());
        }
    }
}
