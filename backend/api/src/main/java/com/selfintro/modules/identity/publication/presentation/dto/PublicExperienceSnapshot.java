package com.selfintro.modules.identity.publication.presentation.dto;

import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicSummaryResponse;
import java.util.List;

public record PublicExperienceSnapshot(
        List<ExperienceResponse> experiences,
        List<ExperienceResponse> coreProjects,
        List<PortfolioCaseStudyPublicSummaryResponse> portfolios) {}
