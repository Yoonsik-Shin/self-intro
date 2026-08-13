package com.selfintro.modules.identity.publication.presentation.dto;

import java.util.List;

public record PublicStudyDraft(List<StudySelection> studies, List<TaxonomySelection> taxonomy) {

    public record StudySelection(Long id, String title, boolean enabled, int displayOrder) {}

    public record TaxonomySelection(
            Long id,
            Long schemeId,
            String label,
            boolean enabled,
            int displayOrder,
            String displayLabel) {}
}
