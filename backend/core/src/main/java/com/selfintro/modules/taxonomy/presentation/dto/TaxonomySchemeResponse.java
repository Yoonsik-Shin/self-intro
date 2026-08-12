package com.selfintro.modules.taxonomy.presentation.dto;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyScheme;

public record TaxonomySchemeResponse(
        Long id,
        String scopeType,
        String familyKey,
        int version,
        String name,
        String description,
        String status,
        boolean subscribed,
        boolean primaryScheme,
        int displayOrder) {

    public static TaxonomySchemeResponse catalog(TaxonomyScheme scheme) {
        return from(scheme, false, false, 0);
    }

    public static TaxonomySchemeResponse subscribed(
            TaxonomyScheme scheme, boolean primaryScheme, int displayOrder) {
        return from(scheme, true, primaryScheme, displayOrder);
    }

    private static TaxonomySchemeResponse from(
            TaxonomyScheme scheme, boolean subscribed, boolean primaryScheme, int displayOrder) {
        return new TaxonomySchemeResponse(
                scheme.getId(),
                scheme.getScopeType().name(),
                scheme.getFamilyKey(),
                scheme.getVersion(),
                scheme.getName(),
                scheme.getDescription(),
                scheme.getStatus().name(),
                subscribed,
                primaryScheme,
                displayOrder);
    }
}
