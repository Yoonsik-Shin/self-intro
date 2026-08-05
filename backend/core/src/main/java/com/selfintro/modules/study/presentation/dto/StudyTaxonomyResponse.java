package com.selfintro.modules.study.presentation.dto;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;

public record StudyTaxonomyResponse(
        Long id, String name, String slug, int displayOrder, Long parentId, long studyCount) {
    public static StudyTaxonomyResponse from(TaxonomyNode node, long studyCount) {
        return new StudyTaxonomyResponse(
                node.getId(),
                node.getName(),
                node.getSlug(),
                node.getDisplayOrder(),
                node.getParent() != null ? node.getParent().getId() : null,
                studyCount);
    }
}
