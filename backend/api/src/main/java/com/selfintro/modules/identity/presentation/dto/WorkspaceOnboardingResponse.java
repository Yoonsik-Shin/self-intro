package com.selfintro.modules.identity.presentation.dto;

import com.selfintro.modules.identity.domain.Workspace;
import java.util.UUID;

public record WorkspaceOnboardingResponse(
        UUID publicKey, String slug, String name, String publicationStatus) {
    public static WorkspaceOnboardingResponse from(Workspace workspace) {
        return new WorkspaceOnboardingResponse(
                workspace.getPublicKey(),
                workspace.getSlug(),
                workspace.getName(),
                workspace.getPublicationStatus().name());
    }
}
