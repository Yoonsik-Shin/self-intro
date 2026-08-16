package com.selfintro.modules.identity.presentation.dto;

public record WorkspaceSlugResolutionResponse(String requestedSlug, String canonicalSlug) {
    public boolean alias() {
        return !requestedSlug.equals(canonicalSlug);
    }
}
