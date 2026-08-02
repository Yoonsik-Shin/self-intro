package com.selfintro.modules.learningresource.presentation.dto;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceCategory;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceRelation;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceRelationType;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import java.util.List;

public record LearningResourceGraphResponse(List<NodeResponse> nodes, List<EdgeResponse> edges) {

    public record CategoryResponse(Long id, String name, String slug) {
        public static CategoryResponse from(LearningResourceCategory category) {
            return new CategoryResponse(category.getId(), category.getName(), category.getSlug());
        }
    }

    public record NodeResponse(
            Long id,
            String title,
            CategoryResponse category,
            LearningResourceType resourceType,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            Integer durationMinutes) {
        public static NodeResponse from(LearningResource resource) {
            return new NodeResponse(
                    resource.getId(),
                    resource.getTitle(),
                    CategoryResponse.from(resource.getCategory()),
                    resource.getResourceType(),
                    resource.getStatus(),
                    resource.getPriorityTier(),
                    resource.getDurationMinutes());
        }
    }

    public record EdgeResponse(Long sourceId, Long targetId, LearningResourceRelationType type) {
        public static EdgeResponse from(LearningResourceRelation relation) {
            return new EdgeResponse(
                    relation.getSource().getId(), relation.getTarget().getId(), relation.getType());
        }
    }
}
