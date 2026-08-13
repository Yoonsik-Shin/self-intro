package com.selfintro.modules.taxonomy.presentation.dto;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;

public record TaxonomyNodeResponse(
        Long id,
        String name,
        String slug,
        int displayOrder,
        Long parentId,
        Long schemeId,
        String stableKey) {
    public static TaxonomyNodeResponse from(TaxonomyNode node) {
        return new TaxonomyNodeResponse(
                node.getId(),
                node.getName(),
                node.getSlug(),
                node.getDisplayOrder(),
                node.getParent() != null ? node.getParent().getId() : null,
                node.getScheme() != null ? node.getScheme().getId() : null,
                node.getStableKey() != null ? node.getStableKey() : node.getSlug());
    }
}
