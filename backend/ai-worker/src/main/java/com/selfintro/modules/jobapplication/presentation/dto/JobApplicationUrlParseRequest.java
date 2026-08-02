package com.selfintro.modules.jobapplication.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record JobApplicationUrlParseRequest(@NotBlank String url) {}
