package com.selfintro.modules.taxonomy.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TaxonomyNodeRequest(
        @NotBlank @Size(max = 60) String name,
        @NotBlank @Size(max = 80) String slug,
        int displayOrder,
        Long parentId,
        Long schemeId) {}
