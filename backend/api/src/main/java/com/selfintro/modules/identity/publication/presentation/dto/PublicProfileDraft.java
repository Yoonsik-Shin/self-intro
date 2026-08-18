package com.selfintro.modules.identity.publication.presentation.dto;

import java.util.List;

public record PublicProfileDraft(
        boolean showName,
        boolean showNameEn,
        boolean showJobTitle,
        boolean showBio,
        boolean showCoreStackSummary,
        boolean showStatusBadge,
        boolean showGithub,
        boolean showEmail,
        boolean showPhone,
        List<ItemSelection> skills,
        List<ItemSelection> competencies) {

    public record ItemSelection(
            Long id, String label, boolean enabled, boolean featured, int displayOrder) {}
}
