package com.selfintro.modules.identity.presentation.dto;

import java.util.List;

public record WorkspaceSlugSettingsResponse(
        String canonicalSlug, List<String> activeAliases, int minimumLength, int maximumLength) {}
