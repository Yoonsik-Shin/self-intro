package com.selfintro.modules.aiusage.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record WorkspaceByokConfigureRequest(
        @NotBlank @Pattern(regexp = "OPENAI|ANTHROPIC|GEMINI") String provider,
        @NotBlank @Size(max = 500) String apiKey) {}
