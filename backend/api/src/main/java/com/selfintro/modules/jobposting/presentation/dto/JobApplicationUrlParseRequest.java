package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record JobApplicationUrlParseRequest(@NotBlank String url) {}
