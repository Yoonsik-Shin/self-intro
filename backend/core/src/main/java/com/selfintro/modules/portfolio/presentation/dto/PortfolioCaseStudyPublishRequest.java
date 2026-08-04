package com.selfintro.modules.portfolio.presentation.dto;

import jakarta.validation.constraints.NotNull;

public record PortfolioCaseStudyPublishRequest(@NotNull Long revisionId) {}
