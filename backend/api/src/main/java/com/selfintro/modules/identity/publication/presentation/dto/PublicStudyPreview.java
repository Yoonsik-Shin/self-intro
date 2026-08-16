package com.selfintro.modules.identity.publication.presentation.dto;

import com.selfintro.modules.study.presentation.dto.StudyResponse;
import com.selfintro.modules.study.presentation.dto.StudyTaxonomyResponse;
import java.util.List;

public record PublicStudyPreview(
        List<StudyResponse> studies, List<StudyTaxonomyResponse> taxonomy) {}
