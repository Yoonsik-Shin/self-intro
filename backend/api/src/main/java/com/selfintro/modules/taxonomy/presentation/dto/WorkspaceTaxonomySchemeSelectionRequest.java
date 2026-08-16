package com.selfintro.modules.taxonomy.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record WorkspaceTaxonomySchemeSelectionRequest(
        @NotEmpty List<Long> schemeIds, Long primarySchemeId) {}
