package com.selfintro.modules.learningresource.presentation.dto;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceRelation;
import com.selfintro.modules.learningresource.domain.entity.WorkspaceLearningResource;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceRelationType;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomyNodeResponse;
import java.util.List;

public record LearningResourceGraphResponse(List<NodeResponse> nodes, List<EdgeResponse> edges) {

    public record NodeResponse(
            Long id,
            String title,
            List<TaxonomyNodeResponse> taxonomyNodes,
            LearningResourceType resourceType,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            Integer durationMinutes) {
        public static NodeResponse from(LearningResource resource) {
            return new NodeResponse(
                    resource.getId(),
                    resource.getTitle(),
                    resource.getTaxonomyNodes().stream().map(TaxonomyNodeResponse::from).toList(),
                    resource.getResourceType(),
                    resource.getStatus(),
                    resource.getPriorityTier(),
                    resource.getDurationMinutes());
        }

        public static NodeResponse from(WorkspaceLearningResource workspaceResource) {
            LearningResource resource = workspaceResource.getLearningResource();
            return new NodeResponse(
                    resource.getId(),
                    resource.getTitle(),
                    resource.getTaxonomyNodes().stream().map(TaxonomyNodeResponse::from).toList(),
                    resource.getResourceType(),
                    workspaceResource.getStatus(),
                    workspaceResource.getPriorityTier(),
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
