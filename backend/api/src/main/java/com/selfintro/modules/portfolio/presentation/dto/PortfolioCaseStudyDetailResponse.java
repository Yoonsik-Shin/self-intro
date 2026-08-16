package com.selfintro.modules.portfolio.presentation.dto;

import java.util.List;

public record PortfolioCaseStudyDetailResponse(
        PortfolioCaseStudyResponse caseStudy, List<PortfolioCaseStudyRevisionResponse> revisions) {}
