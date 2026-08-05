package com.selfintro.jobposting.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record JobApplicationUrlParseRequest(@NotBlank String url) {}
